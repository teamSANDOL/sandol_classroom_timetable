# 📌 산돌이 강의실 시간표 API

## 📂 개요  
한국공학대학교 강의실 시간표에 대한 정보를 제공하는 API 서버입니다.

---

## 📌 프로젝트 구조  
- Node.js
  - Express

---

## 📌 문서  
- [API 문서 (Notion)](https://dandelion-savory-5fa.notion.site/API-1ab8dd10578380318975fa3240169ece)

---

## 📌 환경 설정  
- 실행 시 강의 목록이 들어있는 ``/data/lecture_array.json`` 파일 필요 (추후 개선 예정)

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
- **(CI/CD 적용 여부 및 배포 자동화 여부를 설명하세요.)**  
  - 예시: `GitHub Actions 사용 여부`, `GCP Cloud Run 자동 배포`, `AWS Lambda 연동 여부` 등  
- **(배포 시 관리해야 할 환경 변수 및 보안 설정을 명시하세요.)**  
  - 예시: `.env 파일의 API Key`, `Webhook URL`, `DB 접속 정보` 등
- **(배포시 주의해야할 사항을 설명하세요.)**
  - 예시: `별도 domain 연결 필요`, `독립 Database 설정 필요` 등
---

## 📌 문의  
- [백엔드/강의실-시간표](https://discord.com/channels/1339452791071969331/1339457161666756658)  

---
🚀 **산돌이 프로젝트와 함께 효율적인 개발 환경을 만들어갑시다!**  
