# 📌 산돌이 강의실 시간표 API

## 📂 개요  
한국공학대학교 강의실 시간표에 대한 정보를 제공하는 API 서버입니다.

---

## 📌 프로젝트 구조  
- Node.js
  - Express

---

## 📌 문서  
- [API 문서 (Notion)](https://dandelion-savory-5fa.notion.site/1fb8dd1057838116ae48ec9369f815ae?v=1fb8dd10578381239574000c83b8c137&pvs=4)

---

## 📌 환경 설정  

### 📌 실행 방법  
#### 1. 기본 실행 (모든 서비스 실행)  
```bash
docker compose up -d
```
#### 2. 서비스 중지  
```bash
docker compose down
```
#### 3. 환경 변수 변경 후 재시작  
```bash
docker compose up -d --build
```

---

## 📌 배포 가이드  
- 실행 시 강의 목록이 들어있는 [``/data/lecture_array.json``](https://discord.com/channels/1339452791071969331/1339457161666756658/1346777790036578365) 파일 필요 (추후 개선 예정)
---

## 📌 문의  
- [백엔드/강의실-시간표](https://discord.com/channels/1339452791071969331/1339457161666756658)

## 📌 xls파일 json으로 변환
- scripts 폴더에 있는 convert-timetable.js파일을 이용하면 xls -> json 으로 변환가능

**사용법**
1. 통합정보시스템에서 출력한 xls혹은 xlsx 시간표 파일을 프로젝트 루트에 놓기
2.
  ``` node scripts/convert-timetable.js <입력파일.xls>```

  로 실행 후 data폴더에서 lecture_array.json 파일 확인

+) 혹시 node변환이 안되면 npm install 다시 시도
