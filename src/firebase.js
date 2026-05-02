// ✅ Firebase 콘솔에서 복사한 값으로 아래를 교체하세요
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "여기에-API-KEY",
  authDomain: "여기에-프로젝트ID.firebaseapp.com",
  projectId: "여기에-프로젝트ID",
  storageBucket: "여기에-프로젝트ID.appspot.com",
  messagingSenderId: "여기에-SENDER-ID",
  appId: "여기에-APP-ID"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
