// Import Firebase
import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaCDdoi5x5ARA8kSLJYz-nsQ98Jb1WkMw",
  authDomain: "skincare-hack.firebaseapp.com",
  projectId: "skincare-hack",
  storageBucket: "skincare-hack.firebasestorage.com",
  messagingSenderId: "273319958979",
  appId: "1:273319958979:web:ec263cd4b9da0b51c6c576",
  measurementId: "G-P178EK5VDC",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
