const firebaseConfig = {
    apiKey: "AIzaSyCGhmcMfla7-mfYwzxcy1XxZ-24vZqVSS0",
    authDomain: "login-4baca.firebaseapp.com",
    projectId: "login-4baca",
    storageBucket: "login-4baca.firebasestorage.app",
    messagingSenderId: "874293361860",
    appId: "1:874293361860:web:65808ac513134660fcdd91"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.close();
        return;
    }
    
    document.getElementById('userAvatar').textContent = user.displayName ? 
        user.displayName.charAt(0).toUpperCase() : 
        user.email.charAt(0).toUpperCase();
    
    document.getElementById('welcomeText').textContent = `Welcome, ${user.displayName || 'Herbalist'}`;
    document.getElementById('userEmail').textContent = user.email;
});

window.addEventListener('beforeunload', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.log('Auto-logout failed:', error);
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.close();
    } catch (error) {
        console.error('Logout failed:', error);
    }
});