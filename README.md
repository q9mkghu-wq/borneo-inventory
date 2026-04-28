# 보루네오 재고 관리 시스템

## 설치 순서

### 1단계. Firebase 설정
1. https://console.firebase.google.com 접속
2. "프로젝트 추가" → 프로젝트 이름: borneo-inventory
3. 왼쪽 메뉴 "Firestore Database" → "데이터베이스 만들기" → 테스트 모드로 시작
4. 왼쪽 메뉴 "프로젝트 설정" → "웹 앱 추가(</>)" → 앱 닉네임 입력
5. firebaseConfig 값을 복사해서 src/firebase.js 에 붙여넣기

### 2단계. GitHub 업로드
1. https://github.com 에서 새 저장소 생성 (borneo-inventory)
2. 터미널에서:
   git init
   git add .
   git commit -m "보루네오 재고관리 앱"
   git remote add origin https://github.com/아이디/borneo-inventory.git
   git push -u origin main

### 3단계. Vercel 배포
1. https://vercel.com 접속 → GitHub로 로그인
2. "Add New Project" → borneo-inventory 저장소 선택
3. Framework Preset: Vite 선택
4. Deploy 클릭 → 완료!

## 로컬 실행
npm install
npm run dev
