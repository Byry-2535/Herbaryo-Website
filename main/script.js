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

const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const errorContainer = document.getElementById('errorContainer');

function showError(message, isSuccess = false) {
    clearError();
    const errorEl = document.createElement('div');
    errorEl.className = isSuccess ? 'success-message' : 'error-message';
    errorEl.textContent = message;
    errorContainer.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
}

function clearError() { if (errorContainer) errorContainer.innerHTML = ''; }
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

if (closeModal && loginModal) closeModal.addEventListener('click', () => closeLoginModal());
if (loginModal) loginModal.addEventListener('click', e => { if (e.target === loginModal) closeLoginModal(); });
function closeLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = '';
    clearError();
}

if (document.getElementById('emailLoginBtn')) document.getElementById('emailLoginBtn').addEventListener('click', handleEmailLogin);
if (document.getElementById('emailSignupBtn')) document.getElementById('emailSignupBtn').addEventListener('click', handleEmailSignup);

['loginEmail', 'loginPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleEmailLogin();
        }
    });
});

['signupEmail', 'signupPassword', 'confirmPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleEmailSignup();
        }
    });
});

function normalizeLoginEmail(email) {
    const value = email.trim();
    if (!value || value.includes('@')) return value;
    return `${value}@gmail.com`;
}

async function handleEmailLogin() {
    const email = normalizeLoginEmail(document.getElementById('loginEmail').value);
    const password = document.getElementById('loginPassword').value;
    showLoading();
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        if (!result.user.emailVerified) {
            await auth.signOut();
            return showError('Please verify your email before logging in.');
        }
        await checkUserProfile(result.user);
    } catch (error) {
        showError(error.message);
    } finally { hideLoading(); }
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
        const actionCodeSettings = ['http:', 'https:'].includes(window.location.protocol)
            ? { url: new URL('./index.html?emailVerification=success', window.location.href).href }
            : undefined;
        await result.user.sendEmailVerification(actionCodeSettings);
        showError('Verification email sent. After verifying, return here to sign in.', true);
        await auth.signOut();
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') showError('Email already registered. Try login.');
        else showError(error.message);
    } finally { hideLoading(); }
}

if (document.getElementById('googleLogin')) document.getElementById('googleLogin').addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    showLoading();
    try {
        const result = await auth.signInWithPopup(provider);
        await ensureGoogleProfile(result.user);
        showError('Google sign-in successful! Redirecting to your dashboard...', true);
        window.setTimeout(() => window.location.replace('./dashboard/dashboard.html'), 1800);
    } catch (error) {
        showError('Google login failed: ' + error.message);
    } finally { hideLoading(); }
});

async function ensureGoogleProfile(user) {
    const userRef = db.ref(`herbaryo-users/${user.uid}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
        const defaultUsername = user.email?.split('@')[0] || user.displayName || 'Herbalist';
        await userRef.set(HerbaryoSchema.createDefaultProfile(user, defaultUsername));
        return;
    }

    await HerbaryoSchema.migrateUser(userRef, user);
}

async function checkUserProfile(user) {
    if (!user) return;
    const userRef = db.ref(`herbaryo-users/${user.uid}`);
    const snapshot = await userRef.once('value');
    if (snapshot.exists() && snapshot.val().username) {
        window.location.replace('./dashboard/dashboard.html');
    } else {
        showUsernameModal(user);
    }
}

function showUsernameModal(user) {
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.innerHTML = `
        <div style="text-align:center;padding:1rem;">
            <p style="color:#666;margin-bottom:2rem;">Choose your username:</p>
            <input type="text" id="usernameInput" placeholder="Username" maxlength="20" style="width:100%;padding:1rem;border:2px solid #a5d6a7;border-radius:12px;margin-bottom:1.5rem;">
            <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
                <button id="createProfileBtn" class="btn-primary" style="padding:1rem 2rem;min-width:140px;">Create Profile</button>
            </div>
        </div>
    `;
    const usernameInput = document.getElementById('usernameInput');
    usernameInput.value = (
        user.email?.split('@')[0] || user.displayName || ''
    ).slice(0, 20);
    usernameInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            createProfile(user);
        }
    });
    setTimeout(() => {
        document.getElementById('createProfileBtn').onclick = () => createProfile(user);
    }, 100);
}

async function createProfile(user) {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username || username.length < 3) return showError('Username must be 3+ characters');

    showLoading();
    try {
        await saveNewUserProfile(user, username);
        window.location.replace('./dashboard/dashboard.html');
    } catch {
        showError('Failed to save profile');
    } finally { hideLoading(); }
}

async function saveNewUserProfile(user, usernameInput) {
    const uid = user.uid;
    const displayName = usernameInput || user.displayName || 'Herbalist';
    const userRef = db.ref(`herbaryo-users/${uid}`);
    const userSnap = await userRef.once('value');
    if (!userSnap.exists()) {
        await userRef.set(HerbaryoSchema.createDefaultProfile(user, displayName));
        return;
    }

    await HerbaryoSchema.migrateUser(userRef, user);
    await userRef.update({
        username: displayName,
        email: user.email || '',
        photoURL: user.photoURL || ''
    });
}

auth.onAuthStateChanged(user => {
    const authBtn = document.getElementById('authBtn');
    if (user) {
        authBtn.textContent = 'Logout';
        authBtn.onclick = async e => { e.preventDefault(); await auth.signOut(); authBtn.textContent = 'Login →'; };
    } else if (loginModal) {
        authBtn.textContent = 'Login →';
        authBtn.onclick = e => { e.preventDefault(); loginModal.classList.add('active'); document.body.style.overflow = 'hidden'; };
    }
});

if (document.getElementById('showSignupTab')) document.getElementById('showSignupTab').addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupTab').classList.add('active');
});

if (document.getElementById('showLoginTab')) document.getElementById('showLoginTab').addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('signupTab').classList.remove('active');
    document.getElementById('loginTab').classList.add('active');
});

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');
    const navContainer = hamburgerBtn?.closest('.nav-container');
    const backToTop = document.getElementById('backToTop');
    const downloadVersionButtons = document.querySelectorAll('[data-download-version]');
    const downloadCards = document.querySelectorAll('[data-download-card]');
    const specVersionButtons = document.querySelectorAll('[data-spec-version]');
    const specCards = document.querySelectorAll('[data-spec-card]');

    downloadVersionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedVersion = button.dataset.downloadVersion;

            downloadVersionButtons.forEach(versionButton => {
                const isSelected = versionButton === button;
                versionButton.classList.toggle('active', isSelected);
                versionButton.setAttribute('aria-pressed', String(isSelected));
            });

            downloadCards.forEach(card => {
                card.classList.toggle('active', card.dataset.downloadCard === selectedVersion);
            });

            const selectedCard = document.querySelector(`[data-download-card="${selectedVersion}"]`);
            if (selectedCard && window.matchMedia('(max-width: 768px)').matches) {
                selectedCard.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                    block: 'nearest'
                });
            }
        });
    });

    specVersionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedLevel = button.dataset.specVersion;

            specVersionButtons.forEach(versionButton => {
                const isSelected = versionButton === button;
                versionButton.classList.toggle('active', isSelected);
                versionButton.setAttribute('aria-pressed', String(isSelected));
            });

            specCards.forEach(card => {
                card.classList.toggle('active', card.dataset.specCard === selectedLevel);
            });

            const selectedCard = document.querySelector(`[data-spec-card="${selectedLevel}"]`);
            if (selectedCard && window.matchMedia('(max-width: 768px)').matches) {
                selectedCard.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                    block: 'nearest'
                });
            }
        });
    });

    if (backToTop) {
        const updateBackToTopVisibility = () => {
            backToTop.hidden = window.scrollY <= 300;
        };

        window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
        updateBackToTopVisibility();
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });
    }

    if (!hamburgerBtn || !navMenu || !navContainer) {
        console.error('Hamburger or navMenu not found');
        return;
    }

    const closeMenu = () => {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.setAttribute('aria-label', 'Open navigation menu');
    };

    hamburgerBtn.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('active');
        hamburgerBtn.classList.toggle('active', isOpen);
        hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
        hamburgerBtn.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    navMenu.addEventListener('click', event => {
        if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('active') && !navContainer.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            closeMenu();
            hamburgerBtn.focus();
        }
    });
});

if (document.getElementById('forgotPasswordBtn')) document.getElementById('forgotPasswordBtn').addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();

    if (!email) {
        return showError('Please enter your email first.');
    }

    showLoading();

    try {
        await auth.sendPasswordResetEmail(email);

        showError(
            'Password reset email sent! Check your inbox.',
            true
        );

    } catch (error) {

        switch (error.code) {

            case 'auth/user-not-found':
                showError('No account found with this email.');
                break;

            case 'auth/invalid-email':
                showError('Please enter a valid email.');
                break;

            default:
                showError(error.message);
        }

    } finally {
        hideLoading();
    }
});

if (loginModal && window.location.hash === '#login') {
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function handleEmailVerificationRedirect() {
    if (!loginModal) return;

    const currentUrl = new URL(window.location.href);
    const params = currentUrl.searchParams;
    const isContinueUrl = params.get('emailVerification') === 'success';
    const verificationCode = params.get('oobCode');
    const isDirectVerification = params.get('mode') === 'verifyEmail' && verificationCode;

    if (!isContinueUrl && !isDirectVerification) return;

    try {
        if (isDirectVerification) {
            await auth.applyActionCode(verificationCode);
        }

        document.getElementById('signupTab').classList.remove('active');
        document.getElementById('loginTab').classList.add('active');
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        showError('Account created successfully! Your email is verified. You can now sign in.', true);

        ['emailVerification', 'mode', 'oobCode', 'apiKey', 'continueUrl', 'lang'].forEach(key => {
            params.delete(key);
        });
        window.history.replaceState({}, '', currentUrl);
    } catch (error) {
        showError('Email verification failed: ' + error.message);
    }
}

handleEmailVerificationRedirect();