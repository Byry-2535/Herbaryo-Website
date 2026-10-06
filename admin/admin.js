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
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            window.location.replace('../index.html');
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

        if (user.photoURL) {
            avatar.style.backgroundImage = `url(${user.photoURL})`;
            avatar.classList.add('has-photo');
        } else {
            avatar.style.backgroundImage = '';
            avatar.classList.remove('has-photo');
        }
    }

    async function loadUsers() {
        try {
            const snapshot = await db.ref('herbaryo-users').once('value');
            const users = [];

            snapshot.forEach(child => {
                const u = child.val() || {};
                users.push({
                    uid: child.key,
                    username: u.username || 'Unknown',
                    email: u.email || '',
                    gender: u.gender || 'Not Specified',
                    herbsMastered: u.herbsMastered || {},
                    herbsMasteredCount: Object.values(u.herbsMastered || {}).filter(v => v).length,
                    aurels: u.aurels || 0
                });
            });

            users.sort((a, b) => b.herbsMasteredCount - a.herbsMasteredCount);
            allUsers = users;
            updateStats(users);
            displayUsers(users);
        } catch (err) {
            console.error('Failed to load users:', err);
            const tbody = document.querySelector('#usersTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="4">Failed to load players</td></tr>';
        }
    }

    function displayUsers(filteredUsers) {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;

        if (!filteredUsers.length) {
            tbody.innerHTML = '<tr><td colspan="4">No players found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.herbsMasteredCount}/${Object.keys(user.herbsMastered).length}</td>
                <td>
                    <button class="action-btn btn-view" data-uid="${user.uid}">View</button>
                    <button class="action-btn btn-delete" data-uid="${user.uid}">Delete</button>
                    <button class="action-btn btn-edit" data-uid="${user.uid}">Edit</button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.btn-view').forEach(btn => btn.onclick = () => showUserModal(allUsers.find(u => u.uid === btn.dataset.uid)));
        document.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = () => showEditModal(btn.dataset.uid, allUsers.find(u => u.uid === btn.dataset.uid)));
        document.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = () => deleteUser(btn.dataset.uid));
    }

    function deleteUser(uid) {
        if (!confirm('Are you sure you want to delete this player?')) return;

        db.ref(`herbaryo-users/${uid}`).remove()
            .then(() => {
                alert('Player deleted successfully');
                loadUsers();
            })
            .catch(err => {
                console.error('Failed to delete player:', err);
                alert('Failed to delete player');
            });
    }

    function showUserModal(userData) {
        if (!userData) return;

        const herbEntries = Object.entries(userData.herbsMastered || {});
        const totalHerbs = herbEntries.length || 10;
        const masteredHerbs = herbEntries.filter(([_, mastered]) => mastered).map(([name]) => name);
        const allHerbs = herbEntries.length ? herbEntries.map(([name]) => name) : [
            'bawang', 'sambong', 'tsaang_gubat', 'ampalaya', 'yerba_buena',
            'ulasimang_bato', 'bayabas', 'akapulko', 'lagundi', 'niyog_niyogan'
        ];

        const herbsMarkup = allHerbs.map(herb => {
            const isMastered = herbEntries.length ? !!userData.herbsMastered[herb] : false;
            const label = herb.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `
                <div class="herb-pill ${isMastered ? 'mastered' : 'locked'}">
                    <span>${label}</span>
                </div>
            `;
        }).join('');

        const modal = document.createElement('div');
        modal.className = 'user-modal';
        modal.innerHTML = `
        <div class="user-modal-content">
            <button class="modal-close">&times;</button>
            <div class="profile-header">
                <h2>${userData.username || 'Unknown'}</h2>
            </div>

            <div class="user-data-grid">
                <div class="profile-meta-row">
                    <span><strong>Email:</strong> ${userData.email || 'Not provided'}</span>
                </div>
                <div class="profile-meta-row">
                    <span><strong>Gender:</strong> ${userData.gender?.toLowerCase() === 'male' ? 'Male' : userData.gender?.toLowerCase() === 'female' ? 'Female' : 'Not specified'}</span>
                    <span><strong>Aurels:</strong> ${userData.aurels !== undefined ? userData.aurels : 0}</span>
                </div>
            </div>

            <div class="herbs-summary">
                <strong>Herbs Mastered:</strong>
                <span>${masteredHerbs.length}/${totalHerbs}</span>
            </div>

            <div class="herb-grid">
                ${herbsMarkup}
            </div>
        </div>`;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
    }

    function showEditModal(uid, userData) {
        if (!userData) return;

        const defaultHerbs = [
            'bawang', 'sambong', 'tsaang_gubat', 'ampalaya', 'yerba_buena',
            'ulasimang_bato', 'bayabas', 'akapulko', 'lagundi', 'niyog_niyogan'
        ];
        const allHerbs = Object.keys(userData.herbsMastered || {}).length
            ? Object.keys(userData.herbsMastered)
            : defaultHerbs;
        const modal = document.createElement('div');
        modal.className = 'user-modal';

        const herbsCheckboxes = allHerbs.map(herb => `
            <label class="edit-herb-item">
                <input type="checkbox" class="editHerbCheckbox" value="${herb}" ${userData.herbsMastered[herb] ? 'checked' : ''}>
                <span>${herb.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            </label>
        `).join('');

        modal.innerHTML = `
        <div class="user-modal-content">
            <button class="modal-close">&times;</button>
            <h2>Edit Player</h2>
            <div class="edit-form">
                <label class="field-group">
                    <span>Username</span>
                    <input type="text" id="editName" value="${userData.username || ''}">
                </label>
                <label class="field-group">
                    <span>Gender</span>
                    <select id="editGender">
                        <option value="male" ${userData.gender?.toLowerCase() === 'male' ? 'selected' : ''}>Male</option>
                        <option value="female" ${userData.gender?.toLowerCase() === 'female' ? 'selected' : ''}>Female</option>
                    </select>
                </label>
                <label class="field-group">
                    <span>Aurels</span>
                    <input type="number" id="editAurels" min="0" step="1" value="${userData.aurels !== undefined ? userData.aurels : 0}">
                </label>
                <div class="field-group">
                    <span>Herbs Mastered</span>
                    <div class="edit-herb-grid">${herbsCheckboxes}</div>
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

        modal.querySelector('#saveEditBtn').onclick = () => {
            const updatedUsername = modal.querySelector('#editName').value;
            const updatedGender = modal.querySelector('#editGender').value;
            const updatedHerbs = {};
            modal.querySelectorAll('.editHerbCheckbox').forEach(checkbox => {
                updatedHerbs[checkbox.value] = checkbox.checked;
            });

            const updatedAurels = parseInt(modal.querySelector('#editAurels').value, 10) || 0;

            db.ref(`herbaryo-users/${uid}`).update({
                username: updatedUsername,
                gender: updatedGender,
                herbsMastered: updatedHerbs,
                aurels: updatedAurels
            }).then(() => {
                db.ref(`herbaryo-users/${uid}`).once('value', snapshot => {
                    const updatedUserData = snapshot.val();
                    if (updatedUserData) {
                        showUserModal(updatedUserData);
                    }
                });
                modal.remove();
                loadUsers();
            }).catch(err => {
                console.error('Failed to update player:', err);
                alert('Failed to save changes');
            });
        };
    }

    function updateStats(users) {
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) totalUsersEl.textContent = users.length;
    }
});