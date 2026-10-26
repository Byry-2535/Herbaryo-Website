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

let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.replace('../index.html');
            return;
        }

        db.ref(`admins/${user.uid}`).get().then(snapshot => {
            if (snapshot.exists() && snapshot.val() === true) {
                console.log('Admin verified ✅');
                initAdminUI(user);
                loadUsers();
            } else {
                console.log('Not admin ❌');
                window.location.replace('../index.html');
            }
        }).catch(err => {
            console.error('Error checking admin status:', err);
            window.location.replace('../index.html');
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            displayUsers(allUsers.filter(u => u.username.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)));
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const trigger = logoutBtn;
            const modal = document.createElement('div');
            modal.className = 'user-modal logout-confirm-modal';
            modal.innerHTML = `
                <section class="logout-confirm-dialog" role="alertdialog" aria-modal="true"
                    aria-labelledby="logoutDialogTitle" aria-describedby="logoutDialogDescription">
                    <button class="logout-dialog-close" type="button" aria-label="Cancel logout">&times;</button>
                    <span class="logout-dialog-kicker">Admin</span>
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

            const closeButton = modal.querySelector('.logout-dialog-close');
            const cancelButton = modal.querySelector('.logout-cancel-btn');
            closeButton.addEventListener('click', closeModal);
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
                closeButton.disabled = true;
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
                    closeButton.disabled = false;
                    cancelButton.disabled = false;
                    confirmButton.textContent = 'Log out';
                }
            });
        });
    }

    const adminMenuBtn = document.getElementById('adminMenuBtn');
    const adminActions = document.getElementById('adminActions');
    if (adminMenuBtn && adminActions) {
        const setAdminMenuOpen = isOpen => {
            adminActions.classList.toggle('open', isOpen);
            adminMenuBtn.setAttribute('aria-expanded', String(isOpen));
            adminMenuBtn.setAttribute('aria-label', isOpen ? 'Close admin menu' : 'Open admin menu');
        };

        adminMenuBtn.addEventListener('click', event => {
            event.stopPropagation();
            setAdminMenuOpen(!adminActions.classList.contains('open'));
        });

        document.addEventListener('click', event => {
            if (adminActions.classList.contains('open') && !event.target.closest('.admin-user')) {
                setAdminMenuOpen(false);
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && adminActions.classList.contains('open')) {
                setAdminMenuOpen(false);
                adminMenuBtn.focus();
            }
        });
    }

    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    function initAdminUI(user) {
        const avatar = document.getElementById('adminAvatar');
        if (!avatar) return;

        const displayName = user.displayName || user.email || 'Admin';
        avatar.innerHTML = '';
        avatar.setAttribute('data-initials', displayName.charAt(0).toUpperCase());

        avatar.style.backgroundImage = `url("${HerbaryoSchema.defaultAvatarPath}")`;
        avatar.classList.add('has-photo');
    }

    function normalizePlayer(uid, profile) {
        const saveData = profile.saves?.slot1 || HerbaryoSchema.createDefaultSave(undefined, profile);
        const herbsMastered = HerbaryoSchema.createHerbMastery(saveData.herbsMastered || {});
        const herbsMasteredCount = Object.values(herbsMastered)
            .filter(herb => herb.mastered || herb.mastery >= HerbaryoSchema.maxHerbMastery).length;
        const achievements = saveData.achievements || {};
        const achievementsCount = [
            ...Object.values(achievements.general || {}),
            ...Object.values(achievements.herbs || {})
        ].filter(unlocked => unlocked === true).length;

        return {
            ...profile,
            uid,
            username: profile.username || 'Unknown',
            email: profile.email || '',
            photoURL: HerbaryoSchema.normalizeAvatar(profile.photoURL),
            gender: saveData.gender || 'N/A',
            aurels: saveData.aurels || 0,
            saveData,
            herbsMastered,
            herbsMasteredCount,
            achievementsCount
        };
    }

    async function loadUsers() {
        try {
            const snapshot = await db.ref('herbaryo-users').once('value');
            const users = [];
            const avatarUpdates = {};

            snapshot.forEach(child => {
                const u = child.val() || {};
                const avatarPath = HerbaryoSchema.normalizeAvatar(u.photoURL);
                if (u.photoURL !== avatarPath) {
                    avatarUpdates[`${child.key}/photoURL`] = avatarPath;
                    u.photoURL = avatarPath;
                }
                users.push(normalizePlayer(child.key, u));
            });

            if (Object.keys(avatarUpdates).length) {
                try {
                    await db.ref('herbaryo-users').update(avatarUpdates);
                } catch (error) {
                    console.error('Failed to update existing player avatars:', error);
                    showAdminToast('Could not save the default avatar for all players. Please try again.', 'error');
                }
            }

            users.sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: 'base' }));
            allUsers = users;
            updateStats(users);
            displayUsers(users);
        } catch (err) {
            console.error('Failed to load users:', err);
            const tbody = document.querySelector('#usersTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5">Failed to load players</td></tr>';
        }
    }

    function displayUsers(filteredUsers) {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;

        if (!filteredUsers.length) {
            tbody.innerHTML = '<tr><td colspan="5">No players found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>
                    <span class="player-name-cell">
                        <img class="player-avatar" src="${HerbaryoSchema.normalizeAvatar(user.photoURL)}" alt="">
                        <span>${user.username}</span>
                    </span>
                </td>
                <td>${user.email}</td>
                <td>${user.herbsMasteredCount}/${Object.keys(user.herbsMastered).length}</td>
                <td>${user.achievementsCount}/${Object.keys(HerbaryoSchema.createDefaultSave().achievements.general).length + HerbaryoSchema.herbKeys.length}</td>
                <td>
                    <button class="action-btn btn-view" data-uid="${user.uid}">View</button>
                    <button class="action-btn btn-edit" data-uid="${user.uid}">Edit</button>
                    <button class="action-btn btn-delete" data-uid="${user.uid}">Delete</button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.btn-view').forEach(btn => btn.onclick = () => showUserModal(allUsers.find(u => u.uid === btn.dataset.uid)));
        document.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = () => showEditModal(btn.dataset.uid, allUsers.find(u => u.uid === btn.dataset.uid)));
        document.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = () => deleteUser(btn.dataset.uid, btn));
    }

    function showAdminToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.textContent = message;
        document.body.appendChild(toast);
        window.setTimeout(() => toast.remove(), 3500);
    }

    function deleteUser(uid, trigger) {
        const player = allUsers.find(user => user.uid === uid);
        const modal = document.createElement('div');
        modal.className = 'user-modal delete-modal';
        modal.innerHTML = `
            <section class="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deleteDialogTitle" aria-describedby="deleteDialogDescription">
                <button class="delete-dialog-close" type="button" aria-label="Cancel delete">&times;</button>
                <span class="delete-dialog-kicker">Manage Players</span>
                <h2 id="deleteDialogTitle">Delete ${player?.username || 'this player'}?</h2>
                <p id="deleteDialogDescription">This permanently removes the player's profile and all three save slots.</p>
                <div class="delete-dialog-actions">
                    <button class="delete-cancel-btn" id="cancelDeleteBtn" type="button">Cancel</button>
                    <button class="delete-confirm-btn" id="confirmDeleteBtn" type="button">Delete player</button>
                </div>
            </section>`;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
            if (trigger?.isConnected) trigger.focus();
        };

        modal.querySelector('.delete-dialog-close').onclick = closeModal;
        modal.querySelector('#cancelDeleteBtn').onclick = closeModal;
        modal.onclick = event => {
            if (event.target === modal) closeModal();
        };
        modal.onkeydown = event => {
            if (event.key === 'Escape') closeModal();
        };
        modal.querySelector('#cancelDeleteBtn').focus();

        modal.querySelector('#confirmDeleteBtn').onclick = async event => {
            const confirmButton = event.currentTarget;
            confirmButton.disabled = true;
            confirmButton.textContent = 'Deleting...';

            try {
                await db.ref(`herbaryo-users/${uid}`).remove();
                closeModal();
                showAdminToast('Player deleted successfully.', 'success');
                await loadUsers();
            } catch (err) {
                console.error('Failed to delete player:', err);
                closeModal();
                showAdminToast('Failed to delete player. Please try again.', 'error');
            }
        };
    }

    function showUserModal(userData) {
        if (!userData) return;

        const generalAchievements = [
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
        const modalHerbCatalog = [
            ['akapulko', 'Akapulko'], ['ampalaya', 'Ampalaya'], ['bawang', 'Bawang'],
            ['bayabas', 'Bayabas'], ['lagundi', 'Lagundi'], ['niyog_niyogan', 'Niyog Niyogan'],
            ['sambong', 'Sambong'], ['tsaang_gubat', 'Tsaang Gubat'],
            ['ulasimang_bato', 'Ulamisang Bato'], ['yerba_buena', 'Yerba Buena']
        ];

        const modal = document.createElement('div');
        modal.className = 'user-modal';
        modal.innerHTML = `
        <div class="user-modal-content user-view-content">
            <button class="modal-close">&times;</button>
            <div class="view-profile-header">
                <div class="view-name-row">
                    <img class="view-player-avatar" src="${HerbaryoSchema.normalizeAvatar(userData.photoURL)}" alt="">
                    <h2>${userData.username || 'Unknown'}</h2>
                    <span class="account-type-badge">${userData.isPremium === true ? 'Premium' : 'Free'}</span>
                </div>
                <p>${userData.email || 'No email available'}</p>
            </div>

            <div class="view-save-tabs" role="tablist" aria-label="Player save slots">
                <button class="view-save-tab active" id="viewSlot1Tab" type="button" role="tab" aria-selected="true" data-slot="slot1">Slot 1</button>
                <button class="view-save-tab" id="viewSlot2Tab" type="button" role="tab" aria-selected="false" data-slot="slot2">Slot 2</button>
                <button class="view-save-tab" id="viewSlot3Tab" type="button" role="tab" aria-selected="false" data-slot="slot3">Slot 3</button>
            </div>

            <div class="view-save-panel" id="viewSavePanel" role="tabpanel" aria-labelledby="viewSlot1Tab">
                <div class="view-stats-grid">
                    <div class="view-stat"><span>Gender</span><strong id="viewGender">-</strong></div>
                    <div class="view-stat"><span>Aurels</span><strong id="viewAurels">0</strong></div>
                    <div class="view-stat"><span>Reputation</span><strong id="viewReputation">0</strong></div>
                    <div class="view-stat"><span>Chapter</span><strong id="viewChapter">1</strong></div>
                    <div class="view-stat"><span>Day</span><strong id="viewDay">1</strong></div>
                </div>

                <section class="view-modal-section">
                    <div class="view-section-heading">
                        <h3>Herbs Mastered</h3>
                        <strong id="viewHerbsCount">0/10</strong>
                    </div>
                    <div class="herb-grid view-herb-grid" id="viewHerbGrid"></div>
                </section>

                <section class="view-modal-section">
                    <div class="view-section-heading">
                        <h3>Achievements</h3>
                        <strong id="viewAchievementsCount">0/${generalAchievements.length + modalHerbCatalog.length}</strong>
                    </div>
                    <div class="view-achievement-grid" id="viewAchievementGrid"></div>
                </section>
            </div>
        </div>`;
        document.body.appendChild(modal);

        const renderSlot = slotKey => {
            const saveData = userData.saves?.[slotKey]
                || (slotKey === 'slot1' ? userData.saveData : null)
                || HerbaryoSchema.createDefaultSave();
            const herbs = HerbaryoSchema.createHerbMastery(saveData.herbsMastered || {});
            const masteredCount = Object.values(herbs).filter(herb => herb.mastered).length;
            const achievements = saveData.achievements || {};

            modal.querySelector('#viewGender').textContent = saveData.gender === 'female'
                ? 'Female'
                : saveData.gender === 'male' ? 'Male' : 'N/A';
            modal.querySelector('#viewAurels').textContent = saveData.aurels ?? 0;
            modal.querySelector('#viewReputation').textContent = Math.min(
                HerbaryoSchema.maxReputation,
                Math.max(0, Number(saveData.reputation) || 0)
            );
            modal.querySelector('#viewChapter').textContent = saveData.chapter ?? 1;
            modal.querySelector('#viewDay').textContent = saveData.day ?? 1;
            modal.querySelector('#viewHerbsCount').textContent = `${masteredCount}/10`;
            modal.querySelector('#viewHerbGrid').innerHTML = modalHerbCatalog.map(([key, label]) => {
                const mastery = herbs[key].mastery;
                const mastered = herbs[key].mastered;
                return `<div class="view-herb-card ${mastered ? 'mastered' : 'locked'}"><strong>${label}</strong><span>${mastered ? 'Mastered' : `${mastery}/${HerbaryoSchema.maxHerbMastery} mastery`}</span></div>`;
            }).join('');

            const achievementCards = [
                ...generalAchievements.map(([key, title, description]) => ({
                    title,
                    description,
                    unlocked: achievements.general?.[key] === true
                })),
                ...modalHerbCatalog.map(([key, title]) => ({
                    title: `Master ${title}`,
                    description: `Master ${title}`,
                    unlocked: achievements.herbs?.[`master_${key}`] === true
                }))
            ];
            const achievementsUnlocked = achievementCards.filter(achievement => achievement.unlocked).length;
            modal.querySelector('#viewAchievementsCount').textContent = `${achievementsUnlocked}/${achievementCards.length}`;
            modal.querySelector('#viewAchievementGrid').innerHTML = achievementCards.map(achievement => `
                <div class="view-achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                    <strong>${achievement.title}</strong>
                    <span>${achievement.unlocked ? 'Unlocked' : achievement.description}</span>
                </div>
            `).join('');
        };

        modal.querySelectorAll('.view-save-tab').forEach(tab => {
            tab.onclick = () => {
                modal.querySelectorAll('.view-save-tab').forEach(saveTab => {
                    const isSelected = saveTab === tab;
                    saveTab.classList.toggle('active', isSelected);
                    saveTab.setAttribute('aria-selected', String(isSelected));
                });
                modal.querySelector('#viewSavePanel').setAttribute('aria-labelledby', tab.id);
                renderSlot(tab.dataset.slot);
            };
        });

        renderSlot('slot1');
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
    }

    function showEditModal(uid, userData) {
        if (!userData) return;

        const slotNames = ['slot1', 'slot2', 'slot3'];
        const slotDrafts = Object.fromEntries(slotNames.map(slotName => {
            const existingSave = userData.saves?.[slotName]
                || (slotName === 'slot1' ? userData.saveData : null)
                || HerbaryoSchema.createDefaultSave();
            return [slotName, {
                ...existingSave,
                reputation: Math.min(
                    HerbaryoSchema.maxReputation,
                    Math.max(0, Math.trunc(Number(existingSave.reputation) || 0))
                ),
                herbsMastered: HerbaryoSchema.createHerbMastery(existingSave.herbsMastered || {}),
                achievements: {
                    general: { ...(existingSave.achievements?.general || {}) },
                    herbs: { ...(existingSave.achievements?.herbs || {}) }
                }
            }];
        }));
        const generalAchievements = [
            ['hello_world', 'Hello, World!'],
            ['no_more_limits', 'No More Limits'],
            ['serious_dedication', 'Serious Dedication'],
            ['good_neighbour', 'Good Neighbour'],
            ['a_whole_new_world', 'A Whole New World'],
            ['master_herbalist', 'Master Herbalist'],
            ['becoming_an_apprentice', 'Becoming an Apprentice'],
            ['ohhh_kawaaiii', 'Ohhh Kawaaiii'],
            ['press_b_button', 'Press B Button'],
            ['brochure_expert', 'Brochure Expert']
        ];
        const herbLabels = Object.fromEntries(HerbaryoSchema.herbKeys.map(herb => [
            herb,
            herb.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
        ]));
        let selectedSlot = 'slot1';
        let selectedAvatarPath = HerbaryoSchema.normalizeAvatar(userData.photoURL);
        const modal = document.createElement('div');
        modal.className = 'user-modal';

        const herbCheckboxes = HerbaryoSchema.herbKeys.map(herb => `
            <label class="edit-herb-item">
                <span>${herbLabels[herb]}</span>
                <input type="number" class="editHerbMastery" data-herb="${herb}" value="0" min="0" max="${HerbaryoSchema.maxHerbMastery}" step="1" required aria-label="${herbLabels[herb]} mastery">
            </label>
        `).join('');
        const achievementCheckboxes = [
            ...generalAchievements.map(([key, label]) => `
                <label class="edit-herb-item">
                    <input type="checkbox" class="editAchievementCheckbox" data-category="general" value="${key}">
                    <span>${label}</span>
                </label>
            `),
            ...HerbaryoSchema.herbKeys.map(herb => `
                <label class="edit-herb-item">
                    <input type="checkbox" class="editAchievementCheckbox" data-category="herbs" value="master_${herb}">
                    <span>Master ${herbLabels[herb]}</span>
                </label>
            `)
        ].join('');

        modal.innerHTML = `
        <div class="user-modal-content user-edit-content">
            <button class="modal-close">&times;</button>
            <h2>Edit Player</h2>
            <div class="edit-form">
                <label class="field-group">
                    <span>Username</span>
                    <input type="text" id="editName" minlength="3" required value="${userData.username || ''}">
                </label>
                <div class="edit-avatar-section">
                    <span class="edit-avatar-label">Profile avatar</span>
                    <div class="admin-avatar-picker" role="group" aria-label="Choose player avatar">
                        ${HerbaryoSchema.avatarPaths.map(avatarPath => {
                            const avatarName = avatarPath.split('/').pop().replace(/\.[^.]+$/, '').replace(/_/g, ' ');
                            const isSelected = avatarPath === selectedAvatarPath;
                            return `<button class="admin-avatar-option${isSelected ? ' selected' : ''}" type="button"
                                data-avatar-path="${avatarPath}" aria-label="Choose ${avatarName}"
                                aria-pressed="${isSelected}">
                                <img src="${avatarPath}" alt="${avatarName}">
                            </button>`;
                        }).join('')}
                    </div>
                </div>
                <label class="field-group">
                    <span>Account Type</span>
                    <select id="editAccountType">
                        <option value="false" ${userData.isPremium === true ? '' : 'selected'}>Free</option>
                        <option value="true" ${userData.isPremium === true ? 'selected' : ''}>Premium</option>
                    </select>
                </label>

                <div class="edit-save-tabs" role="tablist" aria-label="Save slots">
                    <button class="edit-save-tab active" id="editSlot1Tab" type="button" role="tab" aria-selected="true" data-slot="slot1">Slot 1</button>
                    <button class="edit-save-tab" id="editSlot2Tab" type="button" role="tab" aria-selected="false" data-slot="slot2">Slot 2</button>
                    <button class="edit-save-tab" id="editSlot3Tab" type="button" role="tab" aria-selected="false" data-slot="slot3">Slot 3</button>
                </div>

                <div class="edit-slot-fields" id="editSlotFields" role="tabpanel" aria-labelledby="editSlot1Tab">
                    <label class="field-group">
                        <span>Gender</span>
                        <select id="editGender">
                            <option value="N/A">N/A</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </label>
                    <label class="field-group">
                        <span>Aurels</span>
                        <input type="number" id="editAurels" min="0" max="9999" step="1" required>
                    </label>
                    <label class="field-group">
                        <span>Reputation</span>
                        <input type="number" id="editReputation" min="0" max="${HerbaryoSchema.maxReputation}" step="1" required>
                    </label>
                    <label class="field-group">
                        <span>Chapter</span>
                        <input type="number" id="editChapter" min="1" max="3" step="1" required>
                    </label>
                    <label class="field-group">
                        <span>Day</span>
                        <input type="number" id="editDay" min="1" max="60" step="1" required>
                    </label>
                </div>

                <div class="field-group">
                    <span>Herbs Mastered</span>
                    <div class="edit-herb-grid">${herbCheckboxes}</div>
                </div>

                <div class="field-group">
                    <span>Achievements</span>
                    <div class="edit-achievement-grid">${achievementCheckboxes}</div>
                </div>

                <div class="edit-actions">
                    <button id="cancelEditBtn" class="action-btn btn-delete">Cancel</button>
                    <button id="saveEditBtn">Save Changes</button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('#cancelEditBtn').onclick = () => modal.remove();
        modal.querySelector('.admin-avatar-picker').addEventListener('click', event => {
            const option = event.target.closest('.admin-avatar-option');
            if (!option) return;

            selectedAvatarPath = HerbaryoSchema.normalizeAvatar(option.dataset.avatarPath);
            modal.querySelectorAll('.admin-avatar-option').forEach(avatarOption => {
                const isSelected = avatarOption === option;
                avatarOption.classList.toggle('selected', isSelected);
                avatarOption.setAttribute('aria-pressed', String(isSelected));
            });
        });

        const renderSlot = slotName => {
            const save = slotDrafts[slotName];
            modal.querySelector('#editGender').value = ['male', 'female'].includes(save.gender)
                ? save.gender
                : 'N/A';
            modal.querySelector('#editAurels').value = save.aurels ?? 0;
            modal.querySelector('#editReputation').value = save.reputation ?? 0;
            modal.querySelector('#editChapter').value = save.chapter ?? 1;
            modal.querySelector('#editDay').value = save.day ?? 1;

            modal.querySelectorAll('.editHerbMastery').forEach(input => {
                input.value = save.herbsMastered[input.dataset.herb]?.mastery ?? 0;
            });
            modal.querySelectorAll('.editAchievementCheckbox').forEach(checkbox => {
                checkbox.checked = save.achievements[checkbox.dataset.category]?.[checkbox.value] === true;
            });
        };

        const captureSlot = () => {
            const save = slotDrafts[selectedSlot];
            save.gender = modal.querySelector('#editGender').value;
            save.aurels = Number.parseInt(modal.querySelector('#editAurels').value, 10);
            save.reputation = Number.parseInt(modal.querySelector('#editReputation').value, 10);
            save.chapter = Number.parseInt(modal.querySelector('#editChapter').value, 10);
            save.day = Number.parseInt(modal.querySelector('#editDay').value, 10);

            modal.querySelectorAll('.editHerbMastery').forEach(input => {
                const herbKey = input.dataset.herb;
                const mastery = Math.min(
                    HerbaryoSchema.maxHerbMastery,
                    Number.parseInt(input.value, 10)
                );
                save.herbsMastered[herbKey] = {
                    mastery,
                    mastered: mastery >= HerbaryoSchema.maxHerbMastery
                };
            });
            modal.querySelectorAll('.editAchievementCheckbox').forEach(checkbox => {
                save.achievements[checkbox.dataset.category][checkbox.value] = checkbox.checked;
            });
        };

        modal.querySelectorAll('.edit-save-tab').forEach(tab => {
            tab.onclick = () => {
                captureSlot();
                selectedSlot = tab.dataset.slot;
                modal.querySelectorAll('.edit-save-tab').forEach(saveTab => {
                    const isSelected = saveTab === tab;
                    saveTab.classList.toggle('active', isSelected);
                    saveTab.setAttribute('aria-selected', String(isSelected));
                });
                modal.querySelector('#editSlotFields').setAttribute('aria-labelledby', tab.id);
                renderSlot(selectedSlot);
            };
        });

        renderSlot(selectedSlot);

        modal.querySelector('#saveEditBtn').onclick = async () => {
            const editableFields = [...modal.querySelectorAll('#editName, #editAccountType, #editGender, #editAurels, #editReputation, #editChapter, #editDay, .editHerbMastery')];
            const invalidField = editableFields.find(field => !field.checkValidity());
            if (invalidField) {
                invalidField.reportValidity();
                return;
            }

            captureSlot();
            const updatedUsername = modal.querySelector('#editName').value.trim();
            const userRef = db.ref(`herbaryo-users/${uid}`);

            try {
                await HerbaryoSchema.migrateUser(userRef, {
                    displayName: userData.username,
                    email: userData.email,
                    photoURL: userData.photoURL
                });
                const updates = {
                    username: updatedUsername,
                    photoURL: selectedAvatarPath,
                    isPremium: modal.querySelector('#editAccountType').value === 'true'
                };
                slotNames.forEach(slotName => {
                    updates[`saves/${slotName}`] = slotDrafts[slotName];
                });
                await userRef.update(updates);

                const snapshot = await userRef.once('value');
                const updatedUserData = snapshot.val();
                modal.remove();
                loadUsers();
                if (updatedUserData) showUserModal(normalizePlayer(uid, updatedUserData));
            } catch (err) {
                console.error('Failed to update player:', err);
                alert('Failed to save changes');
            }
        };
    }

    function updateStats(users) {
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) totalUsersEl.textContent = users.length;
    }
});