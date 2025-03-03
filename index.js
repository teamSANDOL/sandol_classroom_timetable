// 강의실 시간표 API의 메인 코드

const fs = require('fs');

const express = require('express');
const app = express();

// 강의 목록
let lectures = null;

app.get('/', (req, res) => {
    res.end('sandol classroom timetable api');
});

// 강의실 시간표 API Router
const apiRouter = require('./router/api');

app.use('/api', apiRouter.router);


// 강의 목록 불러오기
fs.readFile('./data/lecture_array.json', {
    encoding:'utf8'
}, (err, data) => {
    if(err !== null) {
        throw err;
    }

    lectures = JSON.parse(data);
    apiRouter.updateLecture(lectures);

    // 강의 목록을 불러온 후 API 서버 시작
    app.listen(80, () => {
        console.log('server listening');
    });
});
