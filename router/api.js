// 강의실 시간표 API

const express = require('express');
const router = express.Router();

let lectures = [];

// 빈 강의실 조회
router.get('/classrooms/empty', (req, res) => {
    res.setHeader('content-type','application/json; charset=utf-8');

    const building = req.query.building;

    // building 파라미터가 없을 시 예외 처리
    if(building === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'building 파라미터는 필수입니다.',
        }));
        return;
    }

    // day는 사용자가 입력한 요일 [월요일 ~ 일요일] 을 [0 ~ 6] 로 매핑함
    const day = ['월요일','화요일','수요일','목요일','금요일','토요일','일요일'].indexOf(req.query.day);

    // day 파라미터에 요일이 아닌 값이 들어올 시 예외 처리
    if(day == -1) {
        res.status(400);
        res.end(JSON.stringify({
            message: '잘못된 day 값',
        }));
        return;
    }

    let time = req.query.time;

    // time 파라미터가 없을 시 예외 처리
    if(time === undefined) {
        res.status(400);
        res.end(JSON.stringify({
            message: 'time 파라미터는 필수입니다.',
        }));
        return;
    }

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
    if(time === null) {
        res.status(400);
        res.end(JSON.stringify({
            message: '잘못된 time 값',
        }));
        return;
    }

    // time을 월요일 0시 0분으로부터 몇 분이 지났는지로 설정
    time += day * 60 * 24;

    const allRoomsSet = new Set();      // 조회한 건물의 모든 강의실 목록 셋
    const inuseRoomsSet = new Set();    // 현재 사용중인 강의실 목록 셋

    // 모든 강의에 대해 반복
    lectures.forEach(lecture => {
        
        // 해당 강의의 모든 시간의 강의에 대해 반복
        lecture.times.forEach(lectureTime => {
            
            // 강의실의 이름이 사용자가 조회하는 건물의 이름(building)으로 시작하는 경우에 실행
            if(lectureTime.place.startsWith(building)) {

                // 조회한 건물의 모든 강의실 목록에 추가
                allRoomsSet.add(lectureTime.place);

                // 해당 강의의 시간이 조회한 시간 중에 수업한다면 강의실의 이름(lectureTime.place)만을 사용중인 강의실 목록에 추가
                if(lectureTime.timeStart <= time && time < lectureTime.timeEnd) {
                    inuseRoomsSet.add(lectureTime.place);
                }
            }
        });
    });

    // 조회한 건물의 모든 강의실 목록 셋을 배열로 변환 (중복된 항목을 제거하는 Set의 효과를 이용한다)
    const rooms = Array.from(allRoomsSet)

        // 사용중인 강의실을 제외함
        .filter(room => !inuseRoomsSet.has(room))
        
        /*
            강의실 이름은 "B동301호" 와 같은 형식이다
            사용자는 빈 강의실을 조회할 때 건물의 이름(building)을 알고 있어서 "B동" 은 필요 없는 정보다
            
            slice로 조회하려는 건물의 이름의 길이만큼 강의실 이름의 앞부분을 자른다

            building이 "B동" 이라면
            "B동301호" 는 "301호" 가 된다
        */
        .map(room => room.slice(building.length))
        
        // 강의실 이름을 사전순으로 정렬
        .sort();
    
    res.status(200);
    res.end(JSON.stringify({
        building: building,
        empty_classrooms: rooms,
    }));
});

// 강의 목록을 업데이트 하는 함수
function updateLecture(newLectures) {
    lectures = newLectures;
}

module.exports = {
    router,
    updateLecture,
};
