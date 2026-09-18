import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBJ9eshB0xLiE4YvSFoO9YH_3aTIiWKFao",
  authDomain: "ujian-online-tauliah.firebaseapp.com",
  projectId: "ujian-online-tauliah",
  storageBucket: "ujian-online-tauliah.firebasestorage.app",
  messagingSenderId: "166397795256",
  appId: "1:166397795256:web:4dd9dc3f0906b2484b8d4d",
  measurementId: "G-RX5QWM57DV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const collections = {
  participants: 'participants',
};

