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

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.replace('../index.html');
        return;
    }

    const adminRef = db.ref(`admins/${user.uid}`);
    adminRef.get().then(snapshot => {
        if (snapshot.exists()) {
            console.log('Admin verified ✅');
            const avatar = document.getElementById('adminAvatar');
            const displayName = user.displayName || user.email;
            avatar.innerHTML = '';
            avatar.setAttribute('data-initials', displayName.charAt(0).toUpperCase());

            if (user.photoURL) {
                avatar.style.backgroundImage = `url(${user.photoURL})`;
                avatar.classList.add('has-photo');
            } else {
                avatar.style.backgroundImage = '';
                avatar.classList.remove('has-photo');
            }

            loadUsers();
            displayDailyTransactions();
        } else {
            console.log('Not admin ❌');
            window.location.replace('../index.html');
        }
    }).catch(err => {
        console.error('Error checking admin status:', err);
        window.location.replace('../index.html');
    });
});

async function loadUsers() {
    const usersRef = db.ref('herbaryo-users');
    try {
        const snapshot = await usersRef.once('value');
        const users = [];
        const promises = [];

        snapshot.forEach((child) => {
            const userData = child.val() || {};
            const uid = child.key;
            const p = db.ref(`progress/${uid}`).once('value').then(progressSnap => {
                const progress = progressSnap.val() || {};
                users.push({
                    uid: uid,
                    displayName: userData.username || 'Unknown',
                    email: userData.email || '',
                    herbsMastered: progress.herbsMastered || 0
                });
            });

            promises.push(p);
        });

        await Promise.all(promises);
        users.sort((a, b) => b.herbsMastered - a.herbsMastered);
        allUsers = users;
        updateStats(users);
        displayUsers(users);
        loadTransactions();
    } catch (err) {
        console.error('Error loading users:', err);
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '<tr><td colspan="4">Failed to load players</td></tr>';
    }
}

function loadTransactions() {
    const fakeTransactions = {
        '2026-03-15': { orders: 5, aetherion: 250, revenue: 499.00 },
        '2026-03-14': { orders: 3, aetherion: 150, revenue: 299.00 },
        '2026-03-13': { orders: 8, aetherion: 400, revenue: 799.00 },
        '2026-03-12': { orders: 2, aetherion: 75, revenue: 149.00 },
        '2026-03-11': { orders: 6, aetherion: 300, revenue: 599.00 }
    };

    displayDailyTransactions(fakeTransactions);
}

function displayDailyTransactions() {
    const fakeTransactions = {
        '2026-03-15': { orders: 5, aetherion: 250, revenue: 499.00 },
        '2026-03-14': { orders: 3, aetherion: 150, revenue: 299.00 },
        '2026-03-13': { orders: 8, aetherion: 400, revenue: 799.00 },
        '2026-03-12': { orders: 2, aetherion: 75, revenue: 149.00 },
        '2026-03-11': { orders: 6, aetherion: 300, revenue: 599.00 }
    };
    
    const tbody = document.getElementById('transactionsTbody');
    tbody.innerHTML = Object.entries(fakeTransactions)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .map(([date, data]) => `
            <tr>
                <td>${new Date(date).toLocaleDateString('en-PH')}</td>
                <td>${data.orders}</td>
                <td>+${data.aetherion}</td>
                <td>₱${data.revenue.toFixed(2)}</td>
            </tr>
        `).join('');
}

function updateStats(users) {
    document.getElementById('totalUsers').textContent = users.length;
}

let allUsers = [];

function displayUsers(users) {
    allUsers = users;
    const tbody = document.querySelector('#usersTable tbody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No players yet</td></tr>';
        return;
    }
    
    const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
    const filteredUsers = users.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm) || 
        user.email.toLowerCase().includes(searchTerm)
    );
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No players found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>${user.displayName}</td>
            <td>${user.email}</td>
            <td>🌿 ${user.herbsMastered}/10</td>
            <td>
                <button class="action-btn btn-view" data-uid="${user.uid}">View</button>
                <button class="action-btn btn-delete" data-uid="${user.uid}">Delete</button>
                <button class="action-btn btn-edit" data-uid="${user.uid}">Edit</button>
            </td>
        </tr>
    `).join('');

    tbody.onclick = (e) => {
        if (e.target.classList.contains('btn-view')) {
            const uid = e.target.dataset.uid;
            viewUserData(uid);
        }

        if (e.target.classList.contains('btn-delete')) {
            const uid = e.target.dataset.uid;
            const confirmDelete = confirm('⚠️ This will permanently delete the user. Continue?');
            if (!confirmDelete) return;
            const updates = {};
            updates[`herbaryo-users/${uid}`] = null;
            updates[`currency/${uid}`] = null;
            updates[`progress/${uid}`] = null;
            updates[`transactions/${uid}`] = null;
            db.ref().update(updates);
        }

        if (e.target.classList.contains('btn-edit')) {
            const uid = e.target.dataset.uid;
            editUserData(uid);
        }
    };
}

function viewUserData(uid) {
    Promise.all([
    db.ref(`herbaryo-users/${uid}`).once('value'),
    db.ref(`currency/${uid}`).once('value'),
    db.ref(`progress/${uid}`).once('value')
    ]).then(([userSnap, currencySnap, progressSnap]) => {
        const userData = userSnap.val() || {};
        const currencyData = currencySnap.val() || {};
        const progressData = progressSnap.val() || {};
        const merged = {
            ...userData,
            ...currencyData,
            ...progressData
        };
        showUserModal(merged);
    });
}

function editUserData(uid) {
    Promise.all([
        db.ref(`herbaryo-users/${uid}`).once('value'),
        db.ref(`progress/${uid}`).once('value')
    ]).then(([userSnap, progressSnap]) => {
        const userData = userSnap.val() || {};
        const progressData = progressSnap.val() || {};

        showEditModal(uid, {
            ...userData,
            ...progressData
        });
    });
}

function showUserModal(userData) {
    const modal = document.createElement('div');
    modal.className = 'user-modal';

    modal.innerHTML = `
        <div class="user-modal-content">
            <button class="modal-close">&times;</button>
            <h2>${userData.username || 'Unknown'}</h2>
            <div class="user-data-grid">
                <div><strong>Email:</strong> ${userData.email}</div>
                <div><strong>Herbs Mastered:</strong> 🌿 ${userData.herbsMastered || 0}/10</div>
                <div><strong>Aurels:</strong> 💰 ${userData.aurels || 0}</div>
                <div><strong>Aetherion:</strong> ✨ ${userData.aetherion || 0}</div>
                <div><strong>Gender:</strong> ${userData.gender === 'male' ? 'Male' : 'Female'}</div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function showEditModal(uid, userData) {
    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.innerHTML = `
        <div class="user-modal-content">
            <button class="modal-close">&times;</button>
            <h2>Edit Player</h2>
            <p style="color:#555; margin-bottom: 1.5rem;">Update player information below.</p>
            <div class="user-data-grid">
                <label>
                    Username
                    <input type="text" id="editName" value="${userData.username || ''}" placeholder="Enter username">
                </label>
                <label>
                    Gender
                    <select id="editGender">
                        <option value="male" ${userData.gender === 'male' ? 'selected' : ''}>Male</option>
                        <option value="female" ${userData.gender === 'female' ? 'selected' : ''}>Female</option>
                    </select>
                </label>
                <label>
                    Herbs Mastered
                    <input type="number" id="editHerbs" value="${userData.herbsMastered || 0}" min="0" max="10">
                </label>
                <div style="display:flex; justify-content:flex-end; gap:1rem;">
                    <button id="cancelEditBtn" class="action-btn btn-delete">Cancel</button>
                    <button id="saveEditBtn">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.querySelector('#cancelEditBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.querySelector('#saveEditBtn').onclick = () => {
        const updatedData = {
            username: modal.querySelector('#editName').value,
            gender: modal.querySelector('#editGender').value,
            herbsMastered: Number(modal.querySelector('#editHerbs').value)
        };

        const herbsValue = Number(modal.querySelector('#editHerbs').value);
        const cappedHerbs = Math.max(0, Math.min(10, herbsValue));
        const updates = {};
        updates[`herbaryo-users/${uid}/username`] = updatedData.username;
        updates[`herbaryo-users/${uid}/gender`] = updatedData.gender;
        updates[`progress/${uid}/herbsMastered`] = cappedHerbs;

        db.ref().update(updates)
        .then(() => {
            alert('User updated successfully!');
            modal.remove();
        })
        .catch(err => alert('Error updating user: ' + err.message));
    };
}

document.getElementById('searchInput').addEventListener('input', () => {
    displayUsers(allUsers);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});

document.getElementById('scrollTop').addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});