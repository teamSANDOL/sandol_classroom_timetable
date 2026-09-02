#!/usr/bin/env node
/*
 * 강의시간표 엑셀(.xls/.xlsx) -> lectures JSON 변환 스크립트
 * 입력 파일은 학교 수강신청 시스템에서 내보낸 "전공별 시간표" 엑셀을 그대로 사용합니다.
 * (상단 3행: 전공명/학기 정보/빈 줄, 4행: 헤더, 이후 데이터, 마지막 2행: 페이지 요약(페이지 수/출력 시각))
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// 출력파일을 생략했을 때 강제되는 기본 경로 (index.js가 읽는 경로와 반드시 일치해야 함)
const DEFAULT_OUTPUT_PATH = path.join('data', 'lecture_array.json');

// ---- 컬럼 인덱스 (0-based, 원본 엑셀 기준) ----
const COL = {
    g: 0,       // 학년
    cpl: 1,     // 이수구분(구이수구분)
    cs: 2,      // 교과목명
    id: 6,      // 학수번호
    div: 7,     // 분반
    cd: 9,      // 학점(설계)
    wl: 10,     // 시수
    prof: 11,   // 교수명
    time: 13,   // 강의시간
    cap: 14,    // 수강인원/정원
    dcmm: 20,   // 융합전공운영학과
    evalv: 21,  // 평가구분
    pg: 22,     // 수업진행구분
};

const DAY_LIST = ['월', '화', '수', '목', '금', '토', '일'];

// 한 개의 "요일 [교시] hh:mm~hh:mm" 블록을 반복해서 찾는 정규식
const BLOCK_RE = /([월화수목금토일])\s*\[(\d+)(?:~(\d+))?\]\s*(\d{2}):(\d{2})~(\d{2}):(\d{2})/g;
// 맨 뒤 장소 괄호
const PLACE_RE = /\(([^)]*)\)\s*$/;

/*
    "화 [3~4] 11:30~13:20 목 [1~2] 09:30~11:20 (E동511호,중앙417호)" 같은 문자열을
    times 배열로 변환한다.
    - 장소가 1개면 모든 요일 블록에 같은 장소를 적용
    - 장소가 요일 블록 개수와 같으면 순서대로 1:1 매칭
    - 그 외(개수가 안 맞는 경우)는 예외를 던져서 상위에서 별도 처리하도록 함
*/
function parseTimeString(raw, warnings, rowLabel) {
    const placeMatch = raw.match(PLACE_RE);
    const placesStr = placeMatch ? placeMatch[1] : '';
    const places = placesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const blocks = [];
    let m;
    BLOCK_RE.lastIndex = 0;
    while ((m = BLOCK_RE.exec(raw)) !== null) {
        const [, day, p1, p2, h1, mi1, h2, mi2] = m;
        blocks.push({
            day,
            periodStart: parseInt(p1, 10),
            periodEnd: p2 !== undefined ? parseInt(p2, 10) : parseInt(p1, 10),
            timeStr: `${h1}:${mi1}~${h2}:${mi2}`,
            hour1: parseInt(h1, 10), min1: parseInt(mi1, 10),
        });
    }

    if (blocks.length === 0) {
        warnings.push(`[${rowLabel}] 강의시간 블록을 하나도 찾지 못함: "${raw}"`);
        return [];
    }

    let placeFor;
    if (places.length === 1) {
        placeFor = () => places[0];
    } else if (places.length === blocks.length) {
        placeFor = (i) => places[i];
    } else {
        warnings.push(`[${rowLabel}] 장소 개수(${places.length})와 요일블록 개수(${blocks.length})가 안 맞음: "${raw}" -> 첫 장소로 전체 대체`);
        placeFor = () => places[0] || '';
    }

    return blocks.map((b, i) => {
        const dayIndex = DAY_LIST.indexOf(b.day);
        const startAbs = b.hour1 * 60 + b.min1 + dayIndex * 60 * 24;
        // 종료시각도 동일한 규칙으로 계산하기 위해 원본 문자열에서 다시 파싱
        const endMatch = b.timeStr.match(/~(\d{2}):(\d{2})/);
        const endH = parseInt(endMatch[1], 10), endM = parseInt(endMatch[2], 10);
        const endAbs = endH * 60 + endM + dayIndex * 60 * 24;
        return {
            day: b.day + '요일',
            periodStart: b.periodStart,
            periodEnd: b.periodEnd,
            timeStr: b.timeStr,
            timeStart: startAbs,
            timeEnd: endAbs,
            place: placeFor(i),
        };
    });
}

function cellStr(v) {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s.length === 0 ? undefined : s;
}

function convert(filePath) {
    const wb = XLSX.readFile(filePath, { cellText: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: undefined });

    // 헤더(교과목명 컬럼) 행을 찾아서 그 다음줄부터 데이터로 처리
    const headerIdx = rows.findIndex(r => cellStr(r[COL.cs]) === '교과목명');
    if (headerIdx === -1) throw new Error('헤더 행을 찾을 수 없습니다 (교과목명 컬럼 미발견)');

    const lectures = [];
    const warnings = [];

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        const id = cellStr(r[COL.id]);
        const cs = cellStr(r[COL.cs]);
        // 학수번호/교과목명이 없는 행은 페이지 요약 등 데이터가 아닌 행으로 간주하고 건너뜀
        if (!id || !cs) continue;

        const rowLabel = `${id}-${cellStr(r[COL.div]) || ''}`;
        const timeRaw = cellStr(r[COL.time]);

        const lecture = {};
        const g = cellStr(r[COL.g]);
        if (g !== undefined) lecture.g = g;
        lecture.cpl = cellStr(r[COL.cpl]) || '';
        lecture.cs = cs;
        lecture.id = id;
        lecture.div = cellStr(r[COL.div]) || '';
        lecture.cd = cellStr(r[COL.cd]) || '';
        lecture.wl = cellStr(r[COL.wl]) || '';
        const prof = cellStr(r[COL.prof]);
        if (prof !== undefined) lecture.prof = prof;
        if (timeRaw !== undefined) lecture.time = timeRaw;
        lecture.cap = cellStr(r[COL.cap]) || '';
        const dcmm = cellStr(r[COL.dcmm]);
        if (dcmm !== undefined) lecture.dcmm = dcmm;
        lecture.eval = cellStr(r[COL.evalv]) || '';
        lecture.pg = cellStr(r[COL.pg]) || '';
        lecture.times = timeRaw !== undefined ? parseTimeString(timeRaw, warnings, rowLabel) : [];

        lectures.push(lecture);
    }

    return { lectures, warnings };
}

// ---- 실행부 ----
const inputPath = process.argv[2];
// 출력파일은 경로는 항상 data/로 고정되어있음
const outputPath = DEFAULT_OUTPUT_PATH;

if (!inputPath) {
    console.error('사용법: node scripts/convert-timetable.js <입력파일.xls>');
    console.error(`  결과는 항상 ${DEFAULT_OUTPUT_PATH}에 저장됩니다.`);
    process.exit(1);
}

const { lectures, warnings } = convert(inputPath);

if (warnings.length > 0) {
    console.error(`--- 경고 ${warnings.length}건 ---`);
    warnings.forEach(w => console.error(w));
    console.error('---------------------');
}
console.error(`총 ${lectures.length}건 변환 완료`);

const json = JSON.stringify(lectures, null, 4);

// 저장 경로의 상위 폴더가 없으면 생성 (예: data/ 폴더가 아직 없는 경우 대비)
const outDir = path.dirname(outputPath);
if (outDir && !fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outputPath, json, 'utf8');
console.error(`저장됨: ${outputPath}`);
