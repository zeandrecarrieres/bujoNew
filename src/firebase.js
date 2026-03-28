import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCN9rkPgmkdSb7POBl_ned7nqhwBOiEwzM",
  authDomain: "bujo-3a1aa.firebaseapp.com",
  projectId: "bujo-3a1aa",
  storageBucket: "bujo-3a1aa.firebasestorage.app",
  messagingSenderId: "377247403948",
  appId: "1:377247403948:web:efe5affa13e65c7681b409"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
