import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA55sbKFkPRKF5RlxeifVUIbko_Z74cOwY",
  authDomain: "ank-firebase.firebaseapp.com",
  projectId: "ank-firebase",
  storageBucket: "ank-firebase.firebasestorage.app",
  messagingSenderId: "808815038216",
  appId: "1:808815038216:web:ac0921bcabf763ece926bd",
  measurementId: "G-TC4J08VPTJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
