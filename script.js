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

function showError(message) {
    clearError();
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorContainer.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
}

const loginTrigger = document.getElementById('loginTrigger');
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

async function handleEmailLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) return showError('Please fill all fields');
    
    showLoading();
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        const user = result.user;

        if (!user.emailVerified) {
            await auth.signOut();
            showError('Please verify your email before logging in.');
            return;
        }

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
        await result.user.sendEmailVerification();
        await checkUserProfile(result.user);
    } catch (error) {
        showError(getErrorMessage(error.code));
    } finally {
        hideLoading();
    }
}

function getErrorMessage(code) {
    const errors = {
        'auth/user-not-found': 'No account found',
        'auth/wrong-password': 'Wrong password',
        'auth/email-already-in-use': 'Email already exists',
        'auth/weak-password': 'Password too weak',
        'auth/invalid-email': 'Invalid email'
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
    errorContainer.innerHTML = '';
}

async function checkUserProfile(user) {
    console.log('Checking profile for UID:', user.uid);
    
    try {
        if (!user.emailVerified) {
            showError('Please verify your email before logging in.');
            await auth.signOut();
            return;
        }

        const userRef = db.ref(`herbaryo-users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const data = snapshot.val();
        
        if (data && data.displayName) {
            if (window.HERBARYO_CONFIG?.ADMIN_EMAILS?.includes(user.email)) {
                window.location.replace('./admin/admin.html');
            } else {
                window.location.replace('./dashboard/dashboard.html');
            }
            closeLoginModal();
        } else {
            showUsernameModal(user);
        }
    } catch (error) {
        console.error('Profile check error:', error);
        showError('Database error. Please try again.');
    }
}

function showUsernameModal(user) {
    document.getElementById('loading').style.display = 'none';
    
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
            <h2 style="color: #2e7d32; margin-bottom: 1rem;">🌿 Welcome ${user.displayName || 'Herbalist'}!</h2>
            <p style="color: #666; margin-bottom: 1rem;">Check your email to verify your account.</p>
            <p style="color: #666; margin-bottom: 1.5rem;">We sent a verification link to ${user.email}.</p>
            <input type="text" id="usernameInput" placeholder="HerbalistJuan" maxlength="20" style="width: 100%; padding: 1rem; border: 2px solid #a5d6a7; border-radius: 12px; margin-bottom: 1rem;">
            <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="radio" name="gender" value="male" checked> ♂ Male
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="radio" name="gender" value="female"> ♀ Female
                </label>
            </div>
            <button id="emailResendBtn" class="btn-secondary" style="padding: 0.8rem 1.5rem; font-size: 0.95rem;">Resend verification email</button>
            <div style="margin-top: 1rem;">
                <button id="createProfileBtn" class="btn-primary" style="padding: 1rem 2rem;">Create Profile</button>
                <button id="skipBtn" class="btn-secondary" style="margin-left: 0.5rem; padding: 1rem 2rem; background: white; color: #2e7d32; border: 2px solid #a5d6a7;">Skip</button>
            </div>
        </div>
    `;

    document.getElementById('emailResendBtn').addEventListener('click', async () => {
        try {
            await user.sendEmailVerification();
            showError('Verification email resent. Check your inbox.');
        } catch (e) {
            showError('Failed to resend verification email.');
        }
    });

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
    if (user) {
        loginTrigger.classList.add('hidden');
    } else {
        loginTrigger.classList.remove('hidden');
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