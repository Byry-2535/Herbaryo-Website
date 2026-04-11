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

closeModal.addEventListener('click', () => closeLoginModal());
loginModal.addEventListener('click', e => { if (e.target === loginModal) closeLoginModal(); });
function closeLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = '';
    clearError();
}

document.getElementById('emailLoginBtn').addEventListener('click', handleEmailLogin);
document.getElementById('emailSignupBtn').addEventListener('click', handleEmailSignup);

async function handleEmailLogin() {
    const email = document.getElementById('loginEmail').value.trim();
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
        await result.user.sendEmailVerification();
        showError('Verification email sent! Please check your inbox.', true);
        await auth.signOut();
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') showError('Email already registered. Try login.');
        else showError(error.message);
    } finally { hideLoading(); }
}

document.getElementById('googleLogin').addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    showLoading();
    try {
        const result = await auth.signInWithPopup(provider);
        await checkUserProfile(result.user);
    } catch (error) {
        showError('Google login failed: ' + error.message);
    } finally { hideLoading(); }
});

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
            <h2 style="color:#2e7d32;margin-bottom:1.5rem;">🌿 Welcome!</h2>
            <p style="color:#666;margin-bottom:2rem;">Choose your username:</p>
            <input type="text" id="usernameInput" placeholder="HerbalistJuan" maxlength="20" style="width:100%;padding:1rem;border:2px solid #a5d6a7;border-radius:12px;margin-bottom:1.5rem;">
            <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;">
                <label><input type="radio" name="gender" value="male" checked> ♂ Male</label>
                <label><input type="radio" name="gender" value="female"> ♀ Female</label>
            </div>
            <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
                <button id="createProfileBtn" class="btn-primary" style="padding:1rem 2rem;min-width:140px;">Create Profile</button>
                <button id="skipBtn" class="btn-secondary" style="padding:1rem 2rem;min-width:100px;background:white;color:#2e7d32;border:2px solid #a5d6a7;">Skip</button>
            </div>
        </div>
    `;
    setTimeout(() => {
        document.getElementById('createProfileBtn').onclick = () => createProfile(user);
        document.getElementById('skipBtn').onclick = () => skipProfile(user);
    }, 100);
}

async function createProfile(user) {
    const username = document.getElementById('usernameInput').value.trim();
    const gender = document.querySelector('input[name="gender"]:checked').value;
    if (!username || username.length < 3) return showError('Username must be 3+ characters');

    showLoading();
    try {
        await saveNewUserProfile(user, username, gender);
        window.location.replace('./dashboard/dashboard.html');
    } catch {
        showError('Failed to save profile');
    } finally { hideLoading(); }
}

async function skipProfile(user) {
    const gender = document.querySelector('input[name="gender"]:checked').value;
    showLoading();
    try {
        await saveNewUserProfile(user, null, gender);
        window.location.replace('./dashboard/dashboard.html');
    } catch {
        showError('Failed to save profile');
    } finally { hideLoading(); }
}

async function saveNewUserProfile(user, usernameInput, gender) {
    const uid = user.uid;
    const displayName = usernameInput || user.displayName || 'Herbalist';
    const userSnap = await db.ref(`herbaryo-users/${uid}`).once('value');
    if (!userSnap.exists()) {
        await db.ref(`herbaryo-users/${uid}`).set({
            username: displayName,
            email: user.email,
            gender: gender,
            photoURL: user.photoURL || '',
            aetherion: 0,
            aurels: 0,
            herbsMastered: {
                bawang: false,
                sambong: false,
                tsaang_gubat: false,
                ampalaya: false,
                yerba_buena: false,
                ulasimang_bato: false,
                bayabas: false,
                akapulko: false,
                lagundi: false,
                niyog_niyogan: false
            }
        });
    }
}

auth.onAuthStateChanged(user => {
    const authBtn = document.getElementById('authBtn');
    if (user) {
        authBtn.textContent = 'Logout';
        authBtn.onclick = async e => { e.preventDefault(); await auth.signOut(); authBtn.textContent = 'Login →'; };
    } else {
        authBtn.textContent = 'Login →';
        authBtn.onclick = e => { e.preventDefault(); loginModal.classList.add('active'); document.body.style.overflow = 'hidden'; };
    }
});