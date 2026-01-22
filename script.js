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
const provider = new firebase.auth.GoogleAuthProvider();

const loginTrigger = document.getElementById('loginTrigger');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const googleLogin = document.getElementById('googleLogin');
const loading = document.getElementById('loading');
const loginContent = document.getElementById('loginContent');
const errorContainer = document.getElementById('errorContainer');

loginTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

closeModal.addEventListener('click', () => {
    closeLoginModal();
});

loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
});

function closeLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = '';
    clearError();
}

googleLogin.addEventListener('click', async () => {
    googleLogin.disabled = true;
    googleLogin.innerHTML = '<div class="spinner"></div> Signing in...';
    loading.style.display = 'flex';
    loginContent.style.display = 'none';

    try {
        await auth.signInWithPopup(provider);
         window.open('./dashboard/dashboard.html', '_blank', 'noopener,noreferrer');
    } catch (error) {
        console.error('Login failed:', error);
        showError('Sign-in failed. Please try again.');
    } finally {
        resetLoginButton();
    }
});

function resetLoginButton() {
    googleLogin.disabled = false;
    googleLogin.innerHTML = `
        <svg class="google-icon" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2046C17.64 8.5666 17.5824 7.9526 17.464 7.36H9V10.734H13.844C13.6914 11.9156 13.105 12.9676 12.1594 13.7476L12.155 13.8636L14.4946 15.5286C16.5804 13.9206 17.64 11.73 17.64 9.2046Z" fill="#4285F4"/>
            <path d="M9 18C11.4352 18 13.5504 17.116 14.9376 15.7606L12.1594 13.7476C11.4536 14.2746 10.468 14.6 9 14.6C6.6796 14.6 4.7412 13.018 4.0788 10.944L3.9776 10.946L1.4464 12.6316C2.8132 15.7946 5.9332 18 9 18Z" fill="#34A853"/>
            <path d="M4.0788 10.944C4.0472 10.6726 4.0336 10.3926 4.0336 10.2046C4.0336 9.9946 4.0472 9.7946 4.0788 9.5226L4.0788 9.4886L1.5692 7.8666L1.4464 7.8776C0.7752 8.4876 0.36 9.1986 0.36 9.9986C0.36 10.8146 0.6696 11.5696 1.2664 12.1676L1.2664 12.2856L3.9776 10.946Z" fill="#FBBC05"/>
            <path d="M4.0788 9.5226L4.0844 9.4086C4.3872 8.1656 5.2696 7.1416 6.528 6.7196L6.527 6.6056L4.1544 5.0556L4.1508 5.1706C2.8352 6.4266 2.16 8.2086 2.16 10C2.16 10.7916 2.4148 11.5166 2.8928 12.1186L2.8928 12.2366L0.6232 13.7866C0.2616 13.1086 -0.0096001 12.3096 -0.0096001 11.3986C-0.0096001 10.5986 0.4052 9.8876 1.0764 9.2776L1.1992 9.2666L4.0788 9.5226Z" fill="#EA4335"/>
        </svg>
        Continue with Google
    `;
    loading.style.display = 'none';
    loginContent.style.display = 'block';
}

function showError(message) {
    clearError();
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorContainer.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
}

function clearError() {
    errorContainer.innerHTML = '';
}

auth.onAuthStateChanged((user) => {
    if (user) {
        loginTrigger.classList.add('hidden');
        if (loginModal.classList.contains('active')) {
            closeLoginModal();
        }
    } else {
        loginTrigger.classList.remove('hidden');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal.classList.contains('active')) {
        closeLoginModal();
    }
});

const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');

hamburgerBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburgerBtn.classList.toggle('active');
    document.body.classList.toggle('menu-open');
});

// Close menu when clicking nav links
document.querySelectorAll('.nav-menu a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
});

// Close menu when clicking backdrop
navMenu.addEventListener('click', (e) => {
    if (e.target === navMenu || e.target.matches('::before')) {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
});

// Close menu on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
});