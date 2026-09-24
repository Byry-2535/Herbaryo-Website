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

const herbCatalog = [
    ['bawang', 'Bawang'],
    ['sambong', 'Sambong'],
    ['tsaang_gubat', 'Tsaang Gubat'],
    ['ampalaya', 'Ampalaya'],
    ['yerba_buena', 'Yerba Buena'],
    ['ulasimang_bato', 'Ulasimang Bato'],
    ['bayabas', 'Bayabas'],
    ['akapulko', 'Akapulko'],
    ['lagundi', 'Lagundi'],
    ['niyog_niyogan', 'Niyog-niyogan']
];

let currentUserData = {};

function getHerbsCount(herbsObj = {}) {
    return herbCatalog.filter(([key]) => herbsObj[key] === true).length;
}

function getInitials(username = 'Herbalist') {
    return username.trim().charAt(0).toUpperCase() || 'H';
}

function updateUserUI(userData) {
    const displayName = userData.username || 'Herbalist';
    const avatar = document.getElementById('userAvatar');
    const gender = userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1).toLowerCase() : 'Not specified';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    document.getElementById('welcomeText').textContent = `${greeting}, ${displayName}`;
    document.getElementById('usernameValue').textContent = displayName;
    document.getElementById('userEmail').textContent = userData.email || auth.currentUser?.email || '-';
    document.getElementById('genderText').textContent = gender;
    document.getElementById('aurelsCount').textContent = userData.aurels || 0;
    document.getElementById('aetherionCount').textContent = userData.aetherion || 0;

    avatar.textContent = getInitials(displayName);
    if (userData.photoURL) {
        avatar.style.backgroundImage = `url(${userData.photoURL})`;
        avatar.textContent = '';
    } else {
        avatar.style.backgroundImage = '';
    }
}

function renderHerbs(herbsObj = {}) {
    const masteredCount = getHerbsCount(herbsObj);
    document.getElementById('herbsMasteredCount').textContent = `${masteredCount}/10`;
    document.getElementById('herbsList').innerHTML = herbCatalog.map(([key, label]) => {
        const mastered = herbsObj[key] === true;
        return `<article class="herb-card${mastered ? ' mastered' : ''}">
            <strong>${label}</strong>
            <span>${mastered ? 'Mastered' : 'Not mastered'}</span>
        </article>`;
    }).join('');

    renderAchievements(masteredCount);
}

function renderAchievements(masteredCount) {
    const achievements = [
        ['First Discovery', 'Master your first herb.', masteredCount >= 1],
        ['Field Student', 'Master five herbs.', masteredCount >= 5],
        ['Herbaryo Keeper', 'Master all ten herbs.', masteredCount >= 10]
    ];

    document.getElementById('achievementList').innerHTML = achievements.map(([title, description, unlocked]) => `
        <article class="achievement-card${unlocked ? ' unlocked' : ''}">
            <h3>${title}</h3>
            <p>${unlocked ? 'Unlocked' : description}</p>
        </article>
    `).join('');
}

const editBtn = document.getElementById('editBtn');
const profileModal = document.createElement('div');
profileModal.className = 'profile-modal';
profileModal.innerHTML = `
    <form class="edit-form" id="editForm">
        <h2>Edit Profile</h2>
        <label class="edit-field">Edit username
            <input type="text" id="editUsername" minlength="3" required>
        </label>
        <div id="passwordEditField">
            <label class="edit-field">Change password
                <input type="password" id="editPassword" minlength="8" placeholder="Enter a new password">
            </label>
            <p class="edit-note">Leave it blank to keep your current password. A recent sign-in may be required.</p>
        </div>
        <label class="edit-field">Gender
            <select id="editGender">
                <option value="male">Male</option>
                <option value="female">Female</option>
            </select>
        </label>
        <p class="edit-error" id="editError" role="alert"></p>
        <div class="edit-buttons">
            <button type="submit" class="btn-save">Save</button>
            <button type="button" class="btn-cancel" id="cancelBtn">Cancel</button>
        </div>
    </form>
`;
document.body.appendChild(profileModal);

function closeEditModal() {
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('editError').textContent = '';
}

editBtn.addEventListener('click', () => {
    const hasPasswordProvider = auth.currentUser?.providerData.some(
        provider => provider.providerId === 'password'
    );

    document.getElementById('editUsername').value = currentUserData.username || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('editGender').value = (currentUserData.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
    document.getElementById('passwordEditField').hidden = !hasPasswordProvider;
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

document.getElementById('cancelBtn').addEventListener('click', closeEditModal);
profileModal.addEventListener('click', e => { if (e.target === profileModal) closeEditModal(); });

document.getElementById('editForm').addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.getElementById('editError');
    const username = document.getElementById('editUsername').value.trim();
    const password = document.getElementById('editPassword').value;
    const gender = document.getElementById('editGender').value;

    if (username.length < 3) {
        error.textContent = 'Username must be at least 3 characters.';
        return;
    }
    if (password && password.length < 8) {
        error.textContent = 'Password must be at least 8 characters.';
        return;
    }

    try {
        await db.ref(`herbaryo-users/${auth.currentUser.uid}`).update({ username, gender });
        if (password) await auth.currentUser.updatePassword(password);
        closeEditModal();
    } catch (updateError) {
        console.error(updateError);
        error.textContent = updateError.code === 'auth/requires-recent-login'
            ? 'Please sign in again before changing your password.'
            : 'Unable to save your profile right now.';
    }
});

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.replace('../index.html');
        return;
    }

    const userRef = db.ref(`herbaryo-users/${user.uid}`);

    userRef.on('value', snapshot => {
        const data = snapshot.val() || {};
        currentUserData = data;

        const adminBtn = document.getElementById('adminBtn');
        db.ref(`admins/${user.uid}`).get().then(adminSnap => {
            adminBtn.style.display = adminSnap.exists() && adminSnap.val() === true ? 'inline-block' : 'none';
        });
        adminBtn.onclick = () => { window.location.href = '../admin/admin.html'; };

        updateUserUI(data);
        renderHerbs(data.herbsMastered || {});
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});