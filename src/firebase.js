// src/firebase.js
// ✅ Firebase 콘솔에서 발급받은 값으로 교체하세요
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
   apiKey: "AIzaSyC6RdJRUntnxQJ4ncJo0sK-Okc8288LFRs",
  authDomain: "borneo-inventory.firebaseapp.com",
  projectId: "borneo-inventory",
  storageBucket: "borneo-inventory.firebasestorage.app",
  messagingSenderId: "593523936913",
  appId: "1:593523936913:web:63ee3ad60e9e7b9966f930"

}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
