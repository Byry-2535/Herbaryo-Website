const firebaseConfig = {
    apiKey: "AIzaSyCGhmcMfla7-mfYwzxcy1XxZ-24vZqVSS0",
    authDomain: "login-4baca.firebaseapp.com",
    projectId: "login-4baca",
    storageBucket: "login-4baca.firebasestorage.app",
    messagingSenderId: "874293361860",
    appId: "1:874293361860:web:65808ac513134660fcdd91"
};

window.addEventListener('load', function() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded!');
        return;
    }

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();
    
    const googleBtn = document.getElementById('googleLogin');
    const loading = document.getElementById('loading');

    googleBtn.addEventListener('click', async () => {
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<div style="display:flex;align-items:center;gap:0.5rem"><span>⏳</span>Signing in...</div>';
        loading.style.display = 'block';

        try {
            await auth.signInWithPopup(provider);
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Google Sign-In failed:', error);
            alert('Sign-in failed: ' + error.message);
            // Reset button
            googleBtn.disabled = false;
            googleBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><!-- SVG paths --></svg>
                Sign in with Google
            `;
            loading.style.display = 'none';
        }
    });

    // Auto-redirect if already signed in
    auth.onAuthStateChanged((user) => {
        if (user) {
            window.location.href = 'dashboard.html';
        }
    });
});