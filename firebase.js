import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

// Das ist deine exakte Konfiguration von Firebase für "productivity-app-atz"
const firebaseConfig = {
  apiKey: "AIzaSyDPH5TQFskudH8CI9Vwwa1SbG27qvm6iQM",
  authDomain: "productivity-app-atz.firebaseapp.com",
  projectId: "productivity-app-atz",
  storageBucket: "productivity-app-atz.firebasestorage.app",
  messagingSenderId: "775494027040",
  appId: "1:775494027040:web:3eed4ec689db5d57473945",
  measurementId: "G-739X7F9SXC"
};

// Dienste starten
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);