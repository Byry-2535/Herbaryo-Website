const firebaseConfig = {
    apiKey: "AIzaSyCGhmcMfla7-mfYwzxcy1XxZ-24vZqVSS0",
    authDomain: "login-4baca.firebaseapp.com",
    databaseURL: "https://login-4baca-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "login-4baca",
    storageBucket: "login-4baca.firebasestorage.app",
    messagingSenderId: "874293361860",
    appId: "1:874293361860:web:65808ac513134660fcdd91"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

function updateUserUI(userData) {
    // Use DATABASE data, NOT Google auth data
    document.getElementById('userAvatar').textContent = userData.displayName.charAt(0).toUpperCase();
    document.getElementById('welcomeText').textContent = `Welcome back, ${userData.displayName}!`;
    document.getElementById('userEmail').textContent = userData.email;
}

function updateStats(herbsMastered, points) {
    document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = `🌿 ${herbsMastered}/10`;
    document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = `🏆 ${points}`;
}

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.replace('../index.html');
        return;
    }
    
    // Load ALL user data from DATABASE (not just Google auth)
    const userRef = db.ref(`herbaryo-users/${user.uid}`);
    userRef.on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            // Use database displayName (Horimiya), email, etc.
            updateUserUI({
                displayName: userData.displayName || user.displayName || 'Herbalist',
                email: userData.email || user.email
            });
            updateStats(userData.herbsMastered || 0, userData.points || 0);
        } else {
            // Fallback if database missing
            updateUserUI({
                displayName: user.displayName || 'Herbalist',
                email: user.email
            });
            updateStats(0, 0);
        }
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});