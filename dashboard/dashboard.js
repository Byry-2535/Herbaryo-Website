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

let currentUserData = {};

function getHerbsCount(herbsObj) {
    if (!herbsObj) return 0;
    return Object.values(herbsObj).filter(v => v).length;
}

function formatHerbsStat(herbsObj) {
    const count = getHerbsCount(herbsObj);
    const total = Object.keys(herbsObj || {}).length || 0;
    return `🌿 ${count}/${total}`;
}

function updateUserUI(userData) {
    const avatar = document.getElementById('userAvatar');
    const displayName = userData.username || 'Herbalist';
    const email = userData.email;  
    avatar.innerHTML = '';
    
    if (userData.photoURL) {
        avatar.style.backgroundImage = `url(${userData.photoURL})`;
        avatar.classList.add('has-photo'); 
    } else {
        avatar.style.backgroundImage = '';
        avatar.classList.remove('has-photo');
    }
    
    const hour = new Date().getHours();
    let greeting = 'Welcome';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    document.getElementById('welcomeText').textContent = `${greeting}, ${displayName}!`;
    document.getElementById('userEmail').textContent = email;
    document.getElementById('aurelsCount').textContent = userData.aurels || 0;
    document.getElementById('aetherionCount').textContent = userData.aetherion || 0;

    const gender = (userData.gender || '').toLowerCase();
    document.getElementById('genderIcon').textContent = gender === 'male' ? '♂' : gender === 'female' ? '♀' : '❓';
    document.getElementById('genderText').textContent = gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Unknown';
}

function updateStats(herbsObj) {
    document.querySelector('.stat-card .stat-number').textContent = formatHerbsStat(herbsObj);
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');
    if (!transactions || Object.keys(transactions).length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#666;">No transactions yet</td></tr>`;
        return;
    }

    tbody.innerHTML = Object.entries(transactions)
        .sort(([, a], [, b]) => b.date - a.date)
        .map(([id, tx]) => `
            <tr>
                <td>${new Date(tx.date).toLocaleDateString('en-PH')}</td>
                <td>+${tx.aetherion || 0}</td>
                <td>₱${(tx.phpAmount || 0).toFixed(2)}</td>
            </tr>
        `).join('');
}

const editBtn = document.getElementById('editBtn');
const profileModal = document.createElement('div');
profileModal.className = 'profile-modal';
profileModal.innerHTML = `
    <div class="edit-form">
        <h2>🌿 Edit Profile</h2>
        <input type="text" class="edit-input" id="editUsername" placeholder="Enter new display name">
        <div class="edit-buttons">
            <button class="btn-save" id="saveBtn">Save</button>
            <button class="btn-cancel" id="cancelBtn">Cancel</button>
        </div>
    </div>
`;
document.body.appendChild(profileModal);

function closeEditModal() {
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
}

async function saveProfile() {
    const newDisplayName = document.getElementById('editUsername').value.trim();
    if (newDisplayName.length < 3) {
        alert('Display name must be 3+ characters!');
        return;
    }

    try {
        const userRef = db.ref(`herbaryo-users/${auth.currentUser.uid}`);
        await userRef.update({ username: newDisplayName });
        closeEditModal();
    } catch (error) {
        console.error(error);
        alert('Failed to update profile!');
    }
}

editBtn.addEventListener('click', () => {
    document.getElementById('editUsername').value = currentUserData.username || '';
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

document.getElementById('cancelBtn').addEventListener('click', closeEditModal);
document.getElementById('saveBtn').addEventListener('click', saveProfile);
profileModal.addEventListener('click', e => { if (e.target === profileModal) closeEditModal(); });

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
        updateStats(data.herbsMastered);
        displayTransactions(data.transactions || {});
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});

const herbsCard = document.querySelector('.stat-card .stat-number');

herbsCard.addEventListener('click', () => {
    showHerbsModal(currentUserData.herbsMastered || {});
});

function showHerbsModal(herbsObj) {
    if (document.querySelector('.user-modal')) return;

    const masteredHerbs = Object.entries(herbsObj)
        .filter(([_, mastered]) => mastered)
        .map(([name]) => name);

    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.innerHTML = `
        <div class="user-modal-content">
            <button class="modal-close">&times;</button>
            <h2>🌿 Herbs Mastered</h2>
            <ul style="list-style:none; padding:0; margin:1rem 0;">
                ${masteredHerbs.length 
                    ? masteredHerbs.map(h => `<li>🌱 ${h}</li>`).join('') 
                    : '<li style="color:#666;">No herbs mastered yet</li>'}
            </ul>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
}