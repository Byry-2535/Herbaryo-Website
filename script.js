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

function showError(message, isSuccess = false) {
    clearError();
    const errorEl = document.createElement('div');
    errorEl.className = isSuccess ? 'success-message' : 'error-message';
    errorEl.textContent = message;
    errorContainer.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
}

const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const loading = document.getElementById('loading');
const errorContainer = document.getElementById('errorContainer');

document.getElementById('showSignupTab').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupTab').classList.add('active');
});

document.getElementById('showLoginTab').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signupTab').classList.remove('active');
    document.getElementById('loginTab').classList.add('active');
});

document.getElementById('emailLoginBtn').addEventListener('click', handleEmailLogin);
document.getElementById('emailSignupBtn').addEventListener('click', handleEmailSignup);
document.getElementById('googleLogin').addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    showLoading();
    try {
        const result = await auth.signInWithPopup(provider);
        await checkUserProfile(result.user);
    } catch (error) {
        showError('Google login failed: ' + error.message);
    } finally {
        hideLoading();
    }
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

async function handleEmailLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    showLoading();
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        const user = result.user;
        await checkUserProfile(user);
        
    } catch (error) {
        showError(getErrorMessage(error.code));
    } finally {
        hideLoading();
    }
}

async function handleEmailSignup() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!email || !password || !confirmPassword) return showError('Please fill all fields');
    if (password.length < 8) return showError('Password must be 8+ characters');
    if (password !== confirmPassword) return showError('Passwords do not match');
    
    showLoading();
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await checkUserProfile(result.user);  // Go straight to profile
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showError('Email already registered. Try login.');
        } else {
            showError(getErrorMessage(error.code));
        }
    } finally {
        hideLoading();
    }
}

function getErrorMessage(code) {
    const errors = {
        'auth/user-not-found': 'No account found',
        'auth/wrong-password': 'Wrong password',
        'auth/invalid-email': 'Invalid email format',
        'auth/user-disabled': 'Account disabled',
        'auth/too-many-requests': 'Too many attempts. Try later',
        'auth/network-request-failed': 'No internet connection'
    };
    return errors[code] || 'Login failed. Try again.';
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function clearError() {
    if (errorContainer) errorContainer.innerHTML = '';
}

async function checkUserProfile(user) {
    if (!user) return;
    
    const userRef = db.ref(`herbaryo-users/${user.uid}`);
    const snapshot = await userRef.once('value');
    const data = snapshot.val();
    
    if (data && data.displayName) {
        window.location.replace('./dashboard/dashboard.html');
    } else {
        showUsernameModal(user);
    }
}

function showUsernameModal(user) {
    document.getElementById('loading').style.display = 'none';
    
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
            <h2 style="color: #2e7d32; margin-bottom: 1.5rem;">🌿 Welcome, Herbalist!</h2>
            <p style="color: #666; margin-bottom: 2rem;">Choose your username to get started:</p>
            <input type="text" id="usernameInput" placeholder="HerbalistJuan" maxlength="20" style="width: 100%; padding: 1rem; border: 2px solid #a5d6a7; border-radius: 12px; margin-bottom: 1.5rem;">
            <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 2rem; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="radio" name="gender" value="male" checked> ♂ Male
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="radio" name="gender" value="female"> ♀ Female
                </label>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                <button id="createProfileBtn" class="btn-primary" style="padding: 1rem 2rem; min-width: 140px;">Create Profile</button>
                <button id="skipBtn" class="btn-secondary" style="padding: 1rem 2rem; min-width: 100px; background: white; color: #2e7d32; border: 2px solid #a5d6a7;">Skip</button>
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
    const gender = document.querySelector('input[name="gender"]:checked').value;
    
    if (!username || username.length < 3) {
        return showError('Username must be 3+ characters');
    }
    
    showLoading();
    try {
        await saveNewUserProfile(user, username, gender);
        window.location.replace('./dashboard/dashboard.html');
    } catch (error) {
        showError('Failed to save profile');
    }
}

async function skipProfile(user) {
    const gender = document.querySelector('input[name="gender"]:checked').value;
    showLoading();
    try {
        await saveNewUserProfile(user, null, gender);
        window.location.replace('./dashboard/dashboard.html');
    } catch (error) {
        showError('Failed to save profile');
    }
}

async function saveNewUserProfile(user, displayNameInput, gender) {
    const userRef = db.ref(`herbaryo-users/${user.uid}`);
    const displayName = displayNameInput || user.displayName || 'Herbalist';
    
    await userRef.set({
        email: user.email,
        displayName: displayName,
        photoURL: user.photoURL || '',
        herbsMastered: 0,
        progress: {},
        gender: gender,
        aurels: 0,
        aetherion: 0
    });
}

auth.onAuthStateChanged((user) => {
    const authBtn = document.getElementById('authBtn');
    
    if (user) {
        authBtn.textContent = 'Logout';
        authBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                authBtn.textContent = 'Login →';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        };
    } else {
        authBtn.textContent = 'Login →';
        authBtn.onclick = (e) => {
            e.preventDefault();
            loginModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };
    }
});

const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');

hamburgerBtn.addEventListener('click', () => {
    const isActive = navMenu.classList.toggle('active');
    hamburgerBtn.classList.toggle('active');
    document.body.classList.toggle('menu-open');
    
    hamburgerBtn.setAttribute('aria-expanded', isActive);
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.classList.remove('menu-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.focus();
    }
});

document.querySelectorAll('.nav-menu a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
});

document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('active') && 
        !document.querySelector('.nav-container').contains(e.target)) {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
});