######################################
# Node.js Service
######################################
FROM node:20-alpine3.21 AS nodejs

# 작업 디렉토리 설정
WORKDIR /app

# 종속성 파일 복사 및 설치
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --omit=dev

# 애플리케이션 코드 복사
COPY . .

# 환경 변수 설정
ENV NODE_ENV=production

# 컨테이너 실행 시 기본 명령어 설정
CMD ["npm", "start"]
