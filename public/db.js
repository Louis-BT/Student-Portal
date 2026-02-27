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

// ==========================================
// 🔥 SECURE CLOUD LOGOUT ENGINE
// ==========================================
function executeSecureLogout(event) {
    if(event) event.preventDefault(); 
    
    // 1. Tell Firebase to kill the secure cloud session
    auth.signOut().then(() => {
        // 2. Wipe the local browser memory for safety
        localStorage.clear();
        
        // 3. Route securely back to the login screen
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("Logout Error:", error);
        alert("System encountered an error during logout.");
    });
}

function executeSecureLogout(event) {
    if(event) event.preventDefault(); 
    // Use the variable 'auth' if that's what you defined at the top
    auth.signOut().then(() => {
        localStorage.clear();
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("Logout Error:", error);
        // Force logout even if cloud fails
        localStorage.clear();
        window.location.href = "login.html";
    });
}