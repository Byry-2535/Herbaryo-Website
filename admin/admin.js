const firebaseConfig = {
    apiKey: "AIzaSyCGhmcMfla7-mfYwzxcy1XxZ-24vZqVSS0",
    authDomain: "login-4baca.firebaseapp.com",
    databaseURL: "https://login-4baca-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "login-4baca",
    storageBucket: "login-4baca.firebasestorage.app",
    messagingSenderId: "874293361860",
    appId: "1:874293361860:web:65808ac513134660fcdd91"
};

const ADMIN_EMAILS = window.HERBARYO_CONFIG.ADMIN_EMAILS;
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.replace('../index.html');
        return;
    }
    
    document.getElementById('adminUser').textContent = user.displayName || user.email;
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
                <button class="action-btn btn-reset" onclick="resetProgress('${user.uid}')">Reset</button>
                <button class="action-btn btn-delete" onclick="deleteUser('${user.uid}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function resetProgress(uid) {
    if (confirm('Reset this player\'s progress?')) {
        db.ref(`herbaryo-users/${uid}`).update({
            herbsMastered: 0,
            points: 0,
            progress: {}
        });
    }
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