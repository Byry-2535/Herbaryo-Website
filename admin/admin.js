const firebaseConfig = {
    apiKey: "AIzaSyCGhmcMfla7-mfYwzxcy1XxZ-24vZqVSS0",
    authDomain: "login-4baca.firebaseapp.com",
    databaseURL: "https://login-4baca-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "login-4baca",
    storageBucket: "login-4baca.firebasestorage.app",
    messagingSenderId: "874293361860",
    appId: "1:874293361860:web:65808ac513134660fcdd91"
};

const ADMIN_EMAILS = window.HERBARYO_CONFIG?.ADMIN_EMAILS || [];
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

auth.onAuthStateChanged((user) => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
        window.location.replace('../index.html');
        return;
    }
    
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
});

function loadUsers() {
    const usersRef = db.ref('herbaryo-users');
    usersRef.on('value', (snapshot) => {
        const users = [];
        snapshot.forEach((child) => {
            const userData = child.val();
            users.push({
                uid: child.key,
                displayName: userData.displayName || 'Unknown',
                email: userData.email,
                herbsMastered: userData.herbsMastered || 0,
                points: userData.points || 0
            });
        });
        
        updateStats(users);
        displayUsers(users);
    });
}

function updateStats(users) {
    document.getElementById('totalUsers').textContent = users.length;
    
    const topPlayer = users.reduce((top, user) => 
        user.points > top.points ? user : top, { points: 0 }
    );
    document.getElementById('topPlayer').textContent = topPlayer.points || 0;
}

let allUsers = [];

function displayUsers(users) {
    allUsers = users;
    const tbody = document.querySelector('#usersTable tbody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No players yet</td></tr>';
        return;
    }
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
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
            <td>🏆 ${user.points}</td>
            <td>
                <button class="action-btn btn-view" data-uid="${user.uid}">View</button>
            </td>
        </tr>
    `).join('');

    tbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-view')) {
            const uid = e.target.dataset.uid;
            viewUserData(uid);
        }
    });
}

function viewUserData(uid) {
    const userRef = db.ref(`herbaryo-users/${uid}`);
    userRef.once('value').then((snapshot) => {
        const userData = snapshot.val();
        showUserModal(userData);
    });
}

function showUserModal(userData) {
    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.innerHTML = `
        <div class="user-modal-content">
            <button class="modal-close">&times;</button>
            <h2>${userData.displayName || 'Unknown'}</h2>
            <div class="user-data-grid">
                <div><strong>Email:</strong> ${userData.email}</div>
                <div><strong>Herbs Mastered:</strong> 🌿 ${userData.herbsMastered || 0}/10</div>
                <div><strong>Aurels:</strong> 💰 ${userData.aurels || 0}</div>
                <div><strong>Aetherion:</strong> ✨ ${userData.aetherion || 0}</div>
                <div><strong>Gender:</strong> ${userData.gender === 'male' ? 'Male' : 'Female'}</div>
                <div><strong>Progress:</strong> ${Object.keys(userData.progress || {}).length} herbs unlocked</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function deleteUser(uid) {
    if (confirm('Delete this player permanently?')) {
        db.ref(`herbaryo-users/${uid}`).remove();
    }
}

document.getElementById('searchInput').addEventListener('input', () => {
    displayUsers(allUsers);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});