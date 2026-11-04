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
    ['good_neighbour', 'Good Neighbour', 'Keep 100 reputation for at least 5 days'],
    ['a_whole_new_world', 'A Whole New World', "Join another player's world"],
    ['master_herbalist', 'Master Herbalist', 'Master all 10 herbs'],
    ['becoming_an_apprentice', 'Becoming an Apprentice', 'Complete the tutorial'],
    ['ohhh_kawaaiii', 'Ohhh Kawaaiii', 'Use your first emote'],
    ['press_b_button', 'Press B Button', 'Purchase a boots upgrade'],
    ['brochure_expert', 'Brochure Expert', 'Purchase all upgrades']
];

let currentUserData = {};
let currentSaveData = {};
let selectedSaveSlot = 'slot1';
let selectedAvatarPath = HerbaryoSchema.defaultAvatarPath;

function getHerbsCount(herbsObj = {}) {
    return herbCatalog.filter(([key]) => {
        const herb = herbsObj[key];
        return herb === true || herb?.mastered === true || herb?.mastery >= HerbaryoSchema.maxHerbMastery;
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
    avatar.style.backgroundImage = `url("${HerbaryoSchema.normalizeAvatar(userData.photoURL)}")`;
    avatar.textContent = '';
}

function renderHerbs(herbsObj = {}) {
    const masteredCount = getHerbsCount(herbsObj);
    document.getElementById('herbsMasteredCount').textContent = `${masteredCount}/10`;
    document.getElementById('herbsList').innerHTML = herbCatalog.map(([key, label]) => {
        const herb = herbsObj[key];
        const mastery = herb === true
            ? HerbaryoSchema.maxHerbMastery
            : Math.min(HerbaryoSchema.maxHerbMastery, Math.max(0, Number(herb?.mastery) || 0));
        const mastered = herb === true
            || herb?.mastered === true
            || mastery >= HerbaryoSchema.maxHerbMastery;
        return `<article class="herb-card ${mastered ? 'mastered' : 'locked'}">
            <strong>${label}</strong>
            <span>${mastered ? 'Mastered' : `${mastery}/${HerbaryoSchema.maxHerbMastery} mastery`}</span>
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
    const gender = saveData.gender === 'female'
        ? 'Female'
        : saveData.gender === 'male' ? 'Male' : 'N/A';
    document.getElementById('genderValue').textContent = gender;
    document.getElementById('aurelsValue').textContent = saveData.aurels ?? 0;
    document.getElementById('reputationValue').textContent = saveData.reputation ?? 0;
    document.getElementById('chapterValue').textContent = saveData.chapter ?? 1;
    document.getElementById('dayValue').textContent = saveData.day ?? 1;
    renderHerbs(saveData.herbsMastered || {});
    renderAchievements(saveData.achievements || {});
}

document.querySelectorAll('[data-section-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const content = document.getElementById(toggle.dataset.sectionToggle);
        if (!content) {
            console.error('Unable to toggle dashboard section:', toggle.dataset.sectionToggle);
            return;
        }

        const nextExpanded = content.hidden;
        const sectionName = toggle.dataset.sectionName;

        content.toggleAttribute('hidden', !nextExpanded);
        toggle.setAttribute('aria-expanded', String(nextExpanded));
        toggle.setAttribute('aria-label', `${nextExpanded ? 'Hide' : 'Show'} ${sectionName}`);
        toggle.title = `${nextExpanded ? 'Hide' : 'Show'} ${sectionName}`;
    });
});

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
            || HerbaryoSchema.createDefaultSave();
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

function createProfileModal(className, content) {
    const modal = document.createElement('div');
    modal.className = `profile-modal ${className}`;
    modal.innerHTML = content;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closeProfileModal();
    });
    return modal;
}

const miniProfileModal = createProfileModal('mini-profile-modal', `
    <section class="profile-dialog mini-profile-dialog" role="dialog" aria-modal="true"
        aria-labelledby="miniProfileTitle">
        <button class="edit-close" id="closeMiniProfileBtn" type="button" aria-label="Close profile">&times;</button>
        <span class="edit-kicker">Player account</span>
        <h2 id="miniProfileTitle">Profile</h2>
        <img class="edit-profile-avatar" id="profileAvatarPreview"
            src="${HerbaryoSchema.defaultAvatarPath}" alt="Profile avatar">
        <strong class="edit-profile-username" id="profilePreviewUsername">Herbalist</strong>
        <span class="edit-profile-plan" id="profilePlan">Free</span>
        <span class="edit-profile-email" id="profilePreviewEmail"></span>
        <div class="profile-dialog-actions">
            <button class="btn-save" id="openEditProfileBtn" type="button">Edit username &amp; avatar</button>
            <button class="btn-cancel" id="openChangePasswordBtn" type="button">Change password</button>
        </div>
        <p class="edit-google-note" id="googlePasswordNote" hidden>
            Your password is managed by Google. Change it in your Google Account.
        </p>
    </section>
`);

const editProfileModal = createProfileModal('edit-profile-modal', `
    <form class="edit-form profile-dialog" id="editForm" role="dialog" aria-modal="true"
        aria-labelledby="editProfileTitle">
        <header class="edit-header">
            <div>
                <span class="edit-kicker">Profile settings</span>
                <h2 id="editProfileTitle">Edit username &amp; avatar</h2>
            </div>
            <button class="edit-close" id="closeEditBtn" type="button" aria-label="Close editor">&times;</button>
        </header>
        <label class="edit-field" for="editUsername">Username
            <input type="text" id="editUsername" minlength="3" maxlength="20" autocomplete="username" required>
        </label>
        <div class="avatar-editor">
            <span class="edit-field">Profile avatar</span>
            <div class="avatar-picker" id="avatarPicker" role="group" aria-label="Choose your profile avatar">
                ${HerbaryoSchema.avatarPaths.map(avatarPath => {
                    const avatarName = avatarPath.split('/').pop().replace('.png', '').replace(/_/g, ' ');
                    return `<button class="avatar-option" type="button" data-avatar-path="${avatarPath}"
                        aria-label="Choose ${avatarName}" aria-pressed="false">
                        <img src="${avatarPath}" alt="">
                    </button>`;
                }).join('')}
            </div>
        </div>
        <p class="edit-error" id="editError" role="alert"></p>
        <div class="edit-buttons">
            <button type="submit" class="btn-save">Save changes</button>
            <button type="button" class="btn-cancel" id="cancelEditBtn">Back to profile</button>
        </div>
    </form>
`);

const changePasswordModal = createProfileModal('change-password-modal', `
    <form class="edit-form profile-dialog" id="passwordForm" role="dialog" aria-modal="true"
        aria-labelledby="changePasswordTitle">
        <header class="edit-header">
            <div>
                <span class="edit-kicker">Security settings</span>
                <h2 id="changePasswordTitle">Change password</h2>
            </div>
            <button class="edit-close" id="closePasswordBtn" type="button" aria-label="Close password form">
                &times;
            </button>
        </header>
        <label class="edit-field" for="editCurrentPassword">Old password
            <input type="password" id="editCurrentPassword" autocomplete="current-password"
                placeholder="Enter your old password" required>
        </label>
        <label class="edit-field" for="editPassword">New password
            <input type="password" id="editPassword" minlength="8" autocomplete="new-password"
                placeholder="At least 8 characters" required>
        </label>
        <p class="edit-note">Your new password must be at least 8 characters.</p>
        <p class="edit-error" id="passwordError" role="alert"></p>
        <div class="edit-buttons">
            <button type="submit" class="btn-save">Update password</button>
            <button type="button" class="btn-cancel" id="cancelPasswordBtn">Back to profile</button>
        </div>
    </form>
`);

const currentPasswordInput = document.getElementById('editCurrentPassword');
const newPasswordInput = document.getElementById('editPassword');
const editUsernameInput = document.getElementById('editUsername');
const avatarPicker = document.getElementById('avatarPicker');
const googlePasswordNote = document.getElementById('googlePasswordNote');
let previousProfileModalOverflow = '';
let previousEditTrigger = null;
let activeProfileModal = null;

function selectAvatar(avatarPath) {
    selectedAvatarPath = HerbaryoSchema.normalizeAvatar(avatarPath);
    editProfileModal.querySelectorAll('.avatar-option').forEach(option => {
        const isSelected = option.dataset.avatarPath === selectedAvatarPath;
        option.classList.toggle('selected', isSelected);
        option.setAttribute('aria-pressed', String(isSelected));
    });
}

avatarPicker.addEventListener('click', event => {
    const option = event.target.closest('.avatar-option');
    if (option) selectAvatar(option.dataset.avatarPath);
});

function openProfileModal(modal, focusSelector) {
    if (!activeProfileModal) previousProfileModalOverflow = document.body.style.overflow;
    if (activeProfileModal) activeProfileModal.classList.remove('active');
    activeProfileModal = modal;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.querySelector(focusSelector)?.focus();
}

function closeProfileModal() {
    if (!activeProfileModal) return;
    activeProfileModal.classList.remove('active');
    activeProfileModal = null;
    document.body.style.overflow = previousProfileModalOverflow;
    if (previousEditTrigger?.isConnected) previousEditTrigger.focus();
}

function openMiniProfile(focusSelector = '#openEditProfileBtn') {
    const user = auth.currentUser;
    const hasPasswordProvider = user?.providerData.some(provider => provider.providerId === 'password');
    document.getElementById('profilePreviewUsername').textContent = currentUserData.username || 'Herbalist';
    document.getElementById('profilePreviewEmail').textContent =
        currentUserData.email || user?.email || '';
    document.getElementById('profileAvatarPreview').src =
        HerbaryoSchema.normalizeAvatar(currentUserData.photoURL);
    const isPremium = currentUserData.isPremium === true;
    const planBadge = document.getElementById('profilePlan');
    planBadge.textContent = isPremium ? 'Premium' : 'Free';
    planBadge.classList.toggle('premium', isPremium);
    document.getElementById('openChangePasswordBtn').hidden = !hasPasswordProvider;
    googlePasswordNote.hidden = hasPasswordProvider;
    openProfileModal(miniProfileModal, focusSelector);
}

editBtn.addEventListener('click', () => {
    setDashboardMenuOpen(false);
    previousEditTrigger = editBtn;
    editUsernameInput.value = currentUserData.username || '';
    selectAvatar(currentUserData.photoURL);
    document.getElementById('editError').textContent = '';
    openMiniProfile();
});

document.getElementById('openEditProfileBtn').addEventListener('click', () => {
    document.getElementById('editError').textContent = '';
    openProfileModal(editProfileModal, '#editUsername');
});

document.getElementById('openChangePasswordBtn').addEventListener('click', () => {
    document.getElementById('passwordError').textContent = '';
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    openProfileModal(changePasswordModal, '#editCurrentPassword');
});

document.getElementById('closeMiniProfileBtn').addEventListener('click', closeProfileModal);
document.getElementById('closeEditBtn').addEventListener('click', closeProfileModal);
document.getElementById('closePasswordBtn').addEventListener('click', closeProfileModal);
document.getElementById('cancelEditBtn').addEventListener('click', () => openMiniProfile('#openEditProfileBtn'));
document.getElementById('cancelPasswordBtn').addEventListener('click', () => openMiniProfile('#openChangePasswordBtn'));
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeProfileModal) {
        closeProfileModal();
    }
});

document.getElementById('editForm').addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.getElementById('editError');
    const username = document.getElementById('editUsername').value.trim();

    if (username.length < 3) {
        error.textContent = 'Username must be at least 3 characters.';
        return;
    }

    try {
        await db.ref(`herbaryo-users/${auth.currentUser.uid}`).update({
            username,
            photoURL: selectedAvatarPath
        });
        currentUserData = { ...currentUserData, username, photoURL: selectedAvatarPath };
        updateUserUI(currentUserData);
        openMiniProfile('#openEditProfileBtn');
    } catch (updateError) {
        console.error(updateError);
        error.textContent = 'Unable to save your profile right now.';
    }
});

document.getElementById('passwordForm').addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.getElementById('passwordError');
    const currentPassword = currentPasswordInput.value;
    const password = newPasswordInput.value;

    if (password.length < 8) {
        error.textContent = 'New password must be at least 8 characters.';
        return;
    }

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(
            auth.currentUser.email,
            currentPassword
        );
        await auth.currentUser.reauthenticateWithCredential(credential);
        await auth.currentUser.updatePassword(password);
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        openMiniProfile('#openChangePasswordBtn');
    } catch (updateError) {
        console.error(updateError);
        if (['auth/wrong-password', 'auth/invalid-credential'].includes(updateError.code)) {
            error.textContent = 'Your current password is incorrect.';
        } else if (updateError.code === 'auth/requires-recent-login') {
            error.textContent = 'Please sign in again before changing your password.';
        } else {
            error.textContent = 'Unable to change your password right now.';
        }
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
        currentSaveData = data.saves?.slot1 || HerbaryoSchema.createDefaultSave(undefined, data);

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
            || HerbaryoSchema.createDefaultSave();
        renderSaveSlot(currentSaveData);
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    setDashboardMenuOpen(false);
    const trigger = document.getElementById('logoutBtn');
    const modal = document.createElement('div');
    modal.className = 'logout-confirm-modal';
    modal.innerHTML = `
        <section class="logout-confirm-dialog" role="alertdialog" aria-modal="true"
            aria-labelledby="logoutDialogTitle" aria-describedby="logoutDialogDescription">
            <span class="logout-dialog-kicker">Dashboard</span>
            <h2 id="logoutDialogTitle">Log out?</h2>
            <p id="logoutDialogDescription">Are you sure you want to log out of your account?</p>
            <p class="logout-dialog-error" role="alert" hidden></p>
            <div class="logout-dialog-actions">
                <button class="logout-cancel-btn" type="button">Cancel</button>
                <button class="logout-confirm-btn" type="button">Log out</button>
            </div>
        </section>`;
    document.body.appendChild(modal);
    const previousOverflow = document.body.style.overflow;
    let isSigningOut = false;
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
        if (isSigningOut) return;
        modal.remove();
        document.body.style.overflow = previousOverflow;
        document.removeEventListener('keydown', handleKeydown);
        if (trigger.isConnected) trigger.focus();
    };
    const handleKeydown = event => {
        if (event.key === 'Escape') closeModal();
    };

    const cancelButton = modal.querySelector('.logout-cancel-btn');
    cancelButton.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', handleKeydown);
    modal.querySelector('.logout-cancel-btn').focus();

    modal.querySelector('.logout-confirm-btn').addEventListener('click', async event => {
        const confirmButton = event.currentTarget;
        const error = modal.querySelector('.logout-dialog-error');
        isSigningOut = true;
        confirmButton.disabled = true;
        cancelButton.disabled = true;
        confirmButton.textContent = 'Logging out...';

        try {
            await auth.signOut();
            isSigningOut = false;
            closeModal();
            window.location.replace('../index.html');
        } catch (signOutError) {
            console.error('Failed to log out:', signOutError);
            error.textContent = 'Unable to log out right now. Please try again.';
            error.hidden = false;
            isSigningOut = false;
            confirmButton.disabled = false;
            cancelButton.disabled = false;
            confirmButton.textContent = 'Log out';
        }
    });
});