import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCpSYnMoBmosuPdglW86U7XjVTmhe7DZ9M",
  authDomain: "imgmarket-93908.firebaseapp.com",
  projectId: "imgmarket-93908",
  storageBucket: "imgmarket-93908.firebasestorage.app",
  messagingSenderId: "177105648410",
  appId: "1:177105648410:web:0360fd25c5e46c34a80aa3",
  measurementId: "G-5M2VX3R18C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  type User
};
