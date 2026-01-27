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

closeModal.addEventListener('click', () => closeLoginModal());
loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
});

function closeLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = '';
    clearError();
}

googleLogin.addEventListener('click', async () => {
    console.log('Google login clicked');
    googleLogin.disabled = true;
    googleLogin.innerHTML = '<div class="spinner"></div> Signing in...';
    loading.style.display = 'flex';
    loginContent.style.display = 'none';

    try {
        console.log('Starting Google sign-in...');
        const result = await auth.signInWithPopup(provider);
        console.log('Google sign-in success:', result.user.uid);
        
        await checkUserProfile(result.user);
    } catch (error) {
        console.error('Login error:', error);
        showError('Sign-in failed: ' + error.message);
        resetLoginButton();
    }
});

async function checkUserProfile(user) {
    console.log('Checking profile for UID:', user.uid);
    
    try {
        const userRef = db.ref(`herbaryo-users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const data = snapshot.val();
        
        console.log('Database check result:', data);
        
        if (data && data.username) {
            console.log('Existing user - opening dashboard');
            window.location.replace('./dashboard/dashboard.html');
            closeLoginModal();
        } else {
            console.log('New user - showing username modal');
            showUsernameModal(user);
        }
    } catch (error) {
        console.error('Profile check error:', error);
        showError('Database error. Please try again.');
    }
}

function showUsernameModal(user) {
    console.log('Showing username modal for:', user.email);
    loading.style.display = 'none';
    
    loginContent.style.display = 'block';
    loginContent.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h2 style="color: #2e7d32; margin-bottom: 1rem; font-size: 1.8rem;">🌿 Welcome ${user.displayName || 'Herbalist'}!</h2>
            <p style="color: #666; margin-bottom: 2rem; font-size: 1.1rem;">
                Create your Herbalist username:
            </p>
            <input type="text" id="usernameInput" placeholder="HerbalistJuan" maxlength="20" value=""
                   style="width: 100%; padding: 1.2rem; border: 2px solid #a5d6a7; border-radius: 12px; font-size: 1.1rem; margin-bottom: 1.5rem; font-family: inherit; box-sizing: border-box;">
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="createProfileBtn" style="flex: 1; max-width: 150px; padding: 1rem 1.5rem; background: linear-gradient(45deg, #4caf50, #66bb6a); color: white; border: none; border-radius: 25px; font-weight: 600; font-size: 1rem; cursor: pointer;">
                    Create Profile
                </button>
                <button id="skipBtn" style="flex: 1; max-width: 150px; padding: 1rem 1.5rem; background: white; color: #2e7d32; border: 2px solid #a5d6a7; border-radius: 25px; font-weight: 600; font-size: 1rem; cursor: pointer;">
                    Skip
                </button>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        document.getElementById('createProfileBtn').addEventListener('click', () => createProfile(user));
        document.getElementById('skipBtn').addEventListener('click', () => skipProfile(user));
    }, 100);
}

async function createProfile(user) {
    const username = document.getElementById('usernameInput').value.trim();
    
    if (!username || username.length < 3) {
        showError('Username must be 3+ characters!');
        return;
    }
    
    loading.style.display = 'flex';
    loginContent.style.display = 'none';
    
    try {
        await saveNewUserProfile(user, username);
        window.location.replace('./dashboard/dashboard.html');
        closeLoginModal();
    } catch (error) {
        console.error('Create profile error:', error);
        showError('Failed to save profile.');
    }
}

async function skipProfile(user) {
    loading.style.display = 'flex';
    loginContent.style.display = 'none';
    
    try {
        await saveNewUserProfile(user, null);
        window.location.replace('./dashboard/dashboard.html');
        closeLoginModal();
    } catch (error) {
        console.error('Skip profile error:', error);
        showError('Failed to save profile.');
    }
}

async function saveNewUserProfile(user, username) {
    const userRef = db.ref(`herbaryo-users/${user.uid}`);
    
    await userRef.set({
        email: user.email,
        displayName: username || user.displayName || 'Herbalist',
        username: username || null,
        photoURL: user.photoURL || '',
        herbsMastered: 0,
        points: 0,
        progress: {},
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastPlayed: firebase.database.ServerValue.TIMESTAMP
    });
    
    console.log('Profile saved successfully');
}

function resetLoginButton() {
    googleLogin.disabled = false;
    googleLogin.innerHTML = `<svg class="google-icon" viewBox="0 0 18 18" fill="none">[SVG]</svg>Continue with Google`;
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
    } else {
        loginTrigger.classList.remove('hidden');
    }
});

const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');
hamburgerBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburgerBtn.classList.toggle('active');
    document.body.classList.toggle('menu-open');
});