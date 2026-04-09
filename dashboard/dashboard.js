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

function updateStats(herbsMastered) {
    const capped = Math.max(0, Math.min(10, herbsMastered));
    document.querySelector('.stat-card .stat-number').textContent = `🌿 ${capped}/10`;
}

function displayTransactions(userData) {
    const tbody = document.getElementById('transactionsBody');
    
    // SIMULATE Firebase transactions data - Placeholder lng muna to
    const fakeTransactions = {
        'tx1': { date: 1739980800000, aetherion: 50, phpAmount: 99.00 },
        'tx2': { date: 1740124800000, aetherion: 100, phpAmount: 199.00 },
        'tx3': { date: 1740768000000, aetherion: 25, phpAmount: 49.00 }
    };
    
    const transactions = userData.transactions || fakeTransactions;
    
    if (Object.keys(transactions).length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #666;">No transactions yet</td></tr>`;
        return;
    }
    
    tbody.innerHTML = Object.entries(transactions).map(([id, tx]) => `
        <tr>
            <td>${new Date(tx.date).toLocaleDateString('en-PH')}</td>
            <td>+${tx.aetherion}</td>
            <td>₱${(tx.phpAmount || 0).toFixed(2)}</td>
        </tr>
    `).reverse().join('');
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
        await userRef.update({
            username: newDisplayName
        });
        closeEditModal();
    } catch (error) {
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
profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) closeEditModal();
});

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.replace('../index.html');
        return;
    }

    const userRef = db.ref(`herbaryo-users/${user.uid}`);
    const currencyRef = db.ref(`currency/${user.uid}`);
    const progressRef = db.ref(`progress/${user.uid}`);

    userRef.on('value', (userSnap) => {
        currencyRef.on('value', (currencySnap) => {
            progressRef.on('value', (progressSnap) => {

                const userData = userSnap.val() || {};
                const currencyData = currencySnap.val() || {};
                const progressData = progressSnap.val() || {};

                const mergedData = {
                    ...userData,
                    ...currencyData,
                    ...progressData
                };

                currentUserData = mergedData;
                const adminBtn = document.getElementById('adminBtn');
                adminBtn.addEventListener('click', () => {
                    window.location.href = '../admin/admin.html';
                });
                db.ref(`admins/${user.uid}`).get().then(snapshot => {
                    if (snapshot.exists() && snapshot.val() === true) {
                        adminBtn.style.display = 'inline-block';
                    } else {
                        adminBtn.style.display = 'none';
                    }
                });
                updateUserUI(mergedData);
                updateStats(mergedData.herbsMastered || 0);
                displayTransactions(mergedData);

            });
        });
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});