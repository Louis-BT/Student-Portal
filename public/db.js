// db.js - The Master Cloud Connection (Realtime DB & Auth Engine)

// 1. Your Unique Firebase Keys
const firebaseConfig = {
    apiKey: "AIzaSyB_fBvDttLLoWcS4tmcs0BDykO6_Mi1dgc",
    authDomain: "national-students-portal.firebaseapp.com",
    databaseURL: "https://national-students-portal-default-rtdb.firebaseio.com", 
    projectId: "national-students-portal",
    storageBucket: "national-students-portal.firebasestorage.app",
    messagingSenderId: "435154411577",
    appId: "1:435154411577:web:ca50626e75ee844cf1ade8"
};

// 2. Initialize the Cloud Connection
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 3. Activate the Realtime Database & Authentication Engines
const db = firebase.database();
const auth = firebase.auth(); // NEW: Activated to support secure login sessions across all pages

console.log("🟢 NATIONAL DATABASE: Realtime Cloud & Auth Connections Established.");