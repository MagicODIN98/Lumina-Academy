// ============================================
// FIREBASE CONFIGURATION
// Initialize Firebase with your project credentials
// Replace these values with your Firebase project details
// ============================================

// Firebase configuration object
// Get these values from your Firebase Console:
// Project Settings > Your apps > Web app config


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {

};
// Initialize Firebase
// Note: This assumes Firebase SDK is loaded via CDN in HTML
let app;
let auth;
let database;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app, auth, database, firebaseConfig };
}