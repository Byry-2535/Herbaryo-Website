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

const generalAchievementCatalog = [
    ['hello_world', 'Hello, World!', 'First login into the game'],
    ['no_more_limits', 'No More Limits', 'Buy the full version of the game'],
    ['serious_dedication', 'Serious Dedication', 'Survive 20 days'],
    ['good_neighbour', 'Good Neighbour', 'Keep 200 reputation for at least 5 days'],
    ['a_whole_new_world', 'A Whole New World', "Join another player's world"],
    ['master_herbalist', 'Master Herbalist', 'Master all 10 herbs']
];

let currentUserData = {};
let currentSaveData = {};
let selectedSaveSlot = 'slot1';

function getHerbsCount(herbsObj = {}) {
    return herbCatalog.filter(([key]) => {
        const herb = herbsObj[key];
        return herb === true || herb?.mastered === true;
    }).length;
}

function getInitials(username = 'Herbalist') {
    return username.trim().charAt(0).toUpperCase() || 'H';
}

function updateUserUI(userData) {
    const displayName = userData.username || 'Herbalist';
    const avatar = document.getElementById('userAvatar');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    document.getElementById('welcomeText').textContent = `${greeting}, ${displayName}`;
    document.getElementById('usernameValue').textContent = displayName;
    document.getElementById('userEmail').textContent = userData.email || auth.currentUser?.email || '-';
    document.getElementById('accountTypeValue').textContent = userData.isPremium === true ? 'Premium' : 'Free';

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
        const herb = herbsObj[key];
        const mastered = herb === true || herb?.mastered === true;
        const discovered = mastered || herb?.discovered === true;
        return `<article class="herb-card ${mastered ? 'mastered' : 'locked'}">
            <strong>${label}</strong>
            <span>${mastered ? 'Mastered' : discovered ? 'Discovered' : 'Not discovered'}</span>
        </article>`;
    }).join('');
}

function renderAchievements(achievementData = {}) {
    const general = achievementData.general || {};
    const herbs = achievementData.herbs || {};
    const achievements = [
        ...generalAchievementCatalog.map(([key, title, description]) => ({
            key,
            title,
            description,
            unlocked: general[key] === true
        })),
        ...herbCatalog.map(([key, title]) => ({
            key: `master_${key}`,
            title: `Master ${title}`,
            description: `Master ${title}`,
            unlocked: herbs[`master_${key}`] === true
        }))
    ];

    const unlockedCount = achievements.filter(achievement => achievement.unlocked).length;
    document.getElementById('achievementCount').textContent = `${unlockedCount}/${achievements.length}`;
    document.getElementById('achievementList').innerHTML = achievements.map(achievement => `
        <article class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
            <strong>${achievement.title}</strong>
            <span>${achievement.unlocked ? 'Unlocked' : achievement.description}</span>
        </article>
    `).join('');
}

function renderSaveSlot(saveData = {}) {
    const gender = saveData.gender === 'female' ? 'Female' : 'Male';
    document.getElementById('genderValue').textContent = gender;
    document.getElementById('aurelsValue').textContent = saveData.aurels ?? 0;
    document.getElementById('reputationValue').textContent = saveData.reputation ?? 0;
    document.getElementById('levelValue').textContent = saveData.level ?? 1;
    document.getElementById('dayValue').textContent = saveData.day ?? 1;
    renderHerbs(saveData.herbsMastered || {});
    renderAchievements(saveData.achievements || {});
}

document.querySelectorAll('.save-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        selectedSaveSlot = tab.dataset.slot;
        document.querySelectorAll('.save-tab').forEach(saveTab => {
            const isSelected = saveTab === tab;
            saveTab.classList.toggle('active', isSelected);
            saveTab.setAttribute('aria-selected', String(isSelected));
        });

        document.getElementById('saveSlotPanel').setAttribute('aria-labelledby', tab.id);
        currentSaveData = currentUserData.saves?.[selectedSaveSlot]
            || HerbaryoSchema.createDefaultSave('male');
        renderSaveSlot(currentSaveData);
    });
});

const editBtn = document.getElementById('editBtn');
const dashboardMenuBtn = document.getElementById('dashboardMenuBtn');
const dashboardActions = document.getElementById('dashboardActions');

function setDashboardMenuOpen(isOpen) {
    dashboardActions.classList.toggle('open', isOpen);
    dashboardMenuBtn.setAttribute('aria-expanded', String(isOpen));
    dashboardMenuBtn.setAttribute('aria-label', isOpen ? 'Close dashboard menu' : 'Open dashboard menu');
}

dashboardMenuBtn.addEventListener('click', event => {
    event.stopPropagation();
    setDashboardMenuOpen(!dashboardActions.classList.contains('open'));
});

document.addEventListener('click', event => {
    if (dashboardActions.classList.contains('open') && !dashboardActions.contains(event.target)) {
        setDashboardMenuOpen(false);
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dashboardActions.classList.contains('open')) {
        setDashboardMenuOpen(false);
        dashboardMenuBtn.focus();
    }
});

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
    setDashboardMenuOpen(false);
    const hasPasswordProvider = auth.currentUser?.providerData.some(
        provider => provider.providerId === 'password'
    );

    document.getElementById('editUsername').value = currentUserData.username || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('editGender').value = (currentSaveData.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
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
        await db.ref(`herbaryo-users/${auth.currentUser.uid}`).update({
            username,
            [`saves/${selectedSaveSlot}/gender`]: gender
        });
        if (password) await auth.currentUser.updatePassword(password);
        closeEditModal();
    } catch (updateError) {
        console.error(updateError);
        error.textContent = updateError.code === 'auth/requires-recent-login'
            ? 'Please sign in again before changing your password.'
            : 'Unable to save your profile right now.';
    }
});

auth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.replace('../index.html');
        return;
    }

    const userRef = db.ref(`herbaryo-users/${user.uid}`);

    try {
        await HerbaryoSchema.migrateUser(userRef, user);
    } catch (error) {
        console.error('Failed to migrate player profile:', error);
    }

    userRef.on('value', snapshot => {
        const data = snapshot.val() || {};
        currentUserData = data;
        currentSaveData = data.saves?.slot1 || HerbaryoSchema.createDefaultSave(data.gender || 'male', data);

        const adminBtn = document.getElementById('adminBtn');
        db.ref(`admins/${user.uid}`).get().then(adminSnap => {
            adminBtn.style.display = adminSnap.exists() && adminSnap.val() === true ? 'inline-block' : 'none';
        });
        adminBtn.onclick = () => {
            setDashboardMenuOpen(false);
            window.location.href = '../admin/admin.html';
        };

        updateUserUI(data);
        currentSaveData = data.saves?.[selectedSaveSlot]
            || HerbaryoSchema.createDefaultSave('male');
        renderSaveSlot(currentSaveData);
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    setDashboardMenuOpen(false);
    await auth.signOut();
    window.location.replace('../index.html');
});