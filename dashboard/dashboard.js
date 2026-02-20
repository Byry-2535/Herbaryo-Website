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
    const displayName = userData.displayName || 'Herbalist';
    const email = userData.email;
    
    avatar.setAttribute('data-initials', displayName.charAt(0).toUpperCase());
    
    if (userData.photoURL) {
        avatar.style.backgroundImage = `url(${userData.photoURL})`;
        avatar.classList.add('has-photo'); 
    } else {
        avatar.style.backgroundImage = '';
        avatar.classList.remove('has-photo');
    }
    
    document.getElementById('welcomeText').textContent = `Welcome back, ${displayName}!`;
    document.getElementById('userEmail').textContent = email;
}

function updateStats(herbsMastered) {
    document.querySelector('.stat-card .stat-number').textContent = `🌿 ${herbsMastered}/10`;
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
            displayName: newDisplayName
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
        const displayName = userData?.displayName || user.displayName || 'Herbalist';
        const email = userData?.email || user.email;
        
        updateUserUI({ displayName, email });
        updateStats(userData?.herbsMastered || 0);
        currentUserData = { displayName, email };
        
        const ADMIN_EMAILS = window.HERBARYO_CONFIG.ADMIN_EMAILS;
        const adminBtn = document.getElementById('adminBtn');
        adminBtn.style.display = ADMIN_EMAILS.includes(email) ? 'inline-block' : 'none';
        if (ADMIN_EMAILS.includes(email)) {
            adminBtn.onclick = () => window.location.href = '../admin/admin.html';
        }
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.replace('../index.html');
});