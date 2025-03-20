// 강의실 시간표 API

const express = require('express');
const router = express.Router();

const fs=require('fs');
const {parseBuildings}=require('../utils/csv');

const buildingInfo=parseBuildings(fs.readFileSync('./data/buildings.csv',{encoding:'utf8'}));

let lectures = [];

function getAllBuildingName(){
    return buildingInfo.map(info=>info.name);
}

function getBuildingNames(name){
    const result=[];
    if(buildingInfo.find(info=>info.name==name)!==undefined)result.push(name);
    result.push(...getBuildingNamesByAlias(name));
    return result;
}

function getBuildingNamesByAlias(alias){
    return buildingInfo.filter(info=>info.aliases.includes(alias)).map(info=>info.name);
}

function getEmptyClassrooms(building,day,start_time,end_time){
    const buildings=[];
    if(building!==null){
        buildings.push(...getBuildingNames(building));
        if(buildings.length==0){
            throw new Error('잘못된 building 값');
        }
    }

    // day는 사용자가 입력한 요일 [월요일 ~ 일요일] 을 [0 ~ 6] 로 매핑함
    const dayIndex = ['월요일','화요일','수요일','목요일','금요일','토요일','일요일'].indexOf(day);

    // day 파라미터에 요일이 아닌 값이 들어올 시 예외 처리
    if(dayIndex == -1) throw new Error('잘못된 day 값');

    /*
        이름이 name인 쿼리 파라미터를 읽어서 시간을 월요일 0시 0분으로부터 몇 분이 지났는지로 파싱하는 함수
        시간이 잘못된 값이면 응답 예외처리까지 이 함수에서 함
        파싱을 실패하면 null을 리턴함
    */
    function parseTime(time){
        // 시간을 :을 기준으로 시간과 분으로 분리
        time = time.split(':');
        if(time.length == 2) {
            const hour = parseInt(time[0]), minute = parseInt(time[1]);
            if(!(isNaN(hour) || isNaN(minute))) {
                // time을 0시 0분으로부터 몇 분이 지났는지로 설정
                time = hour * 60 + minute;
            } else {
                // 시간에 숫자가 아닌 값이 있으면 예외 처리
                time = null;
            }
        } else {
            // :을 기준으로 분리할 때 시간이 잘못된 형식일 시 예외 처리
            time = null;
        }
        
        // 시간이 잘못된 형식일 시 예외 처리
        if(time === null) throw new Error(`잘못된 시간 값`);

        // time을 월요일 0시 0분으로부터 몇 분이 지났는지로 설정
        time += dayIndex * 60 * 24;

        return time;
    }

    // start_time과 end_time 쿼리 파라미터를 시간으로 파싱
    const startTime = parseTime(start_time),endTime = parseTime(end_time);

    // start_time이 end_time보다 크면 예외 처리
    if(startTime > endTime) throw new Error(`start_time은 end_time보다 작아야 합니다`);

    const allRoomsSet = new Set();      // 조회한 건물의 모든 강의실 목록 셋
    const inuseRoomsSet = new Set();    // 현재 사용중인 강의실 목록 셋

    // 모든 강의에 대해 반복
    lectures.forEach(lecture => {
        
        // 해당 강의의 모든 시간의 강의에 대해 반복
        lecture.times.forEach(lectureTime => {
            
            // 강의실의 이름이 사용자가 조회하는 건물의 이름들(buildings)로 시작하는 경우에 실행
            if(building===null||buildings.some(building=>lectureTime.place.startsWith(building))) {

                // 조회한 건물의 모든 강의실 목록에 추가
                allRoomsSet.add(lectureTime.place);

                // 해당 강의의 시간이 조회한 시간 중에 수업한다면 강의실의 이름(lectureTime.place)만을 사용중인 강의실 목록에 추가
                if(!((lectureTime.timeStart < startTime && lectureTime.timeEnd < startTime) || (lectureTime.timeStart > endTime && lectureTime.timeEnd > endTime))) {
                    inuseRoomsSet.add(lectureTime.place);
                }
            }
        });
    });

    /*
        조회한 건물의 모든 강의실 목록 셋을 배열로 변환 (중복된 항목을 제거하는 Set의 효과를 이용한다)

        이후 사용중인 강의실을 제외함
    */
    const emptyRoomList=Array.from(allRoomsSet).filter(room => !inuseRoomsSet.has(room));
    
    
    if(building===null){
        const buildingObj={};
        const buildingNames=getAllBuildingName();
        
        emptyRoomList.forEach(room=>{
            const name=buildingNames.find(name=>room.startsWith(name));
            if(name===undefined)return;
    
            if(buildingObj[name]===undefined)buildingObj[name]=[];
            buildingObj[name].push(room.slice(name.length));
        });
        
        return Object.entries(buildingObj).map(([building,empty_classrooms])=>({building,empty_classrooms:empty_classrooms.sort()}));
    }else{
        return [
            {
                building:building,
                empty_classrooms:emptyRoomList.map(room=>room.slice(buildings.find(building=>room.startsWith(building)).length)),
            }
        ];
    }
}

/*
    빈 강의실 조회
    문서: https://dandelion-savory-5fa.notion.site/1ab8dd10578381cda209d96df2213c8a
*/
router.get('/classrooms/available/time', (req, res) => {
    res.setHeader('content-type','application/json; charset=utf-8');

    let building = req.query.building;
    const day = req.query.day;
    const start_time = req.query.start_time;
    const end_time = req.query.end_time;

    if(building===undefined)building=null;

    // 파라미터가 없을 시 예외 처리
    if(day === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'day 파라미터는 필수입니다.',
        }));
        return;
    }

    if(start_time === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'start_time 파라미터는 필수입니다.',
        }));
        return;
    }

    if(end_time === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'end_time 파라미터는 필수입니다.',
        }));
        return;
    }
    
    let result;
    try{
        result=getEmptyClassrooms(building,day,start_time,end_time);
    }catch(e){
        res.status(400);
        result={
            message: e.message,
        };
    }
    res.end(JSON.stringify(result));
});

router.get('/classrooms/available/periods', (req, res) => {
    res.setHeader('content-type','application/json; charset=utf-8');

    let building = req.query.building;
    const day = req.query.day;
    let start_time = req.query.start_time;
    let end_time = req.query.end_time;

    if(building===undefined)building=null;

    // 파라미터가 없을 시 예외 처리
    if(day === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'day 파라미터는 필수입니다.',
        }));
        return;
    }

    if(start_time === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'start_time 파라미터는 필수입니다.',
        }));
        return;
    }

    start_time=[
        '09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:25','18:15','19:05','20:00','20:50','21:40'
    ][
        [
            '1','2','3','4','5','6','7','8','9','10','11','12','13','14'
        ].indexOf(start_time)
    ];

    if(start_time === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: '잘못된 start_time 값',
        }));
        return;
    }

    if(end_time === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'end_time 파라미터는 필수입니다.',
        }));
        return;
    }

    end_time=[
        '10:20','11:20','12:20','13:20','14:20','15:20','16:20','17:20','18:15','19:05','19:55','20:50','21:40','22:30'
    ][
        [
            '1','2','3','4','5','6','7','8','9','10','11','12','13','14'
        ].indexOf(end_time)
    ];

    if(end_time === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: '잘못된 end_time 값',
        }));
        return;
    }
    
    let result;
    try{
        result=getEmptyClassrooms(building,day,start_time,end_time);
    }catch(e){
        res.status(400);
        result={
            message: e.message,
        };
    }
    res.end(JSON.stringify(result));
});

// 강의 목록을 업데이트 하는 함수
function updateLecture(newLectures) {
    lectures = newLectures;
}

module.exports = {
    router,
    updateLecture,
};
