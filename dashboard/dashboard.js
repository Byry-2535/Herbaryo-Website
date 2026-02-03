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
    document.getElementById('userAvatar').textContent = userData.displayName.charAt(0).toUpperCase();
    document.getElementById('welcomeText').textContent = `Welcome back, ${userData.displayName}!`;
    document.getElementById('userEmail').textContent = userData.email;
}

function updateStats(herbsMastered, points) {
    document.querySelectorAll('.stat-card .stat-number')[0].textContent = `🌿 ${herbsMastered}/10`;
    document.querySelectorAll('.stat-card .stat-number')[1].textContent = `🏆 ${points}`;
}

const editBtn = document.getElementById('editBtn');
const profileModal = document.createElement('div');
profileModal.className = 'profile-modal';
profileModal.innerHTML = `
    <div class="edit-form">
        <h2>🌿 Edit Profile</h2>
        <input type="text" class="edit-input" id="editUsername" placeholder="Enter new username">
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
    const newUsername = document.getElementById('editUsername').value.trim();
    
    if (newUsername.length < 3) {
        alert('Username must be 3+ characters!');
        return;
    }
    
    try {
        const userRef = db.ref(`herbaryo-users/${auth.currentUser.uid}`);
        await userRef.update({
            displayName: newUsername,
            username: newUsername
        });
        closeEditModal();
    } catch (error) {
        alert('Failed to update profile!');
    }
}

editBtn.addEventListener('click', () => {
    document.getElementById('editUsername').value = currentUserData.displayName || '';
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
    userRef.on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            const displayName = userData.displayName || user.displayName || 'Herbalist';
            const email = userData.email || user.email;
            
            updateUserUI({ displayName, email });
            updateStats(userData.herbsMastered || 0, userData.points || 0);
            currentUserData = { displayName, email };
        } else {
            updateUserUI({
                displayName: user.displayName || 'Herbalist',
                email: user.email
            });
            updateStats(0, 0);
            currentUserData = { 
                displayName: user.displayName || 'Herbalist', 
                email: user.email 
            };
        }
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});