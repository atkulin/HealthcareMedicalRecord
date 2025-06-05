/*
    Copyright (C) 2025 Atanas Kulin

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

// Uhr
function updateClock() {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const clock = document.getElementById('clock');
    if (clock) {
        clock.textContent =
            pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }
}
setInterval(updateClock, 1000);
updateClock();

// Profil-Handling
let currentProfile = null;
const profileStatus = document.getElementById('profileStatus');
const loadBtn = document.getElementById('loadProfileBtn');
const saveBtn = document.getElementById('saveProfileBtn');
const loader = document.getElementById('profileLoader');
const createBtn = document.getElementById('createProfileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const profileForm = document.getElementById('profileForm');

if (loadBtn && loader && saveBtn && profileStatus) {
    loadBtn.onclick = () => loader.click();
    loader.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                currentProfile = JSON.parse(evt.target.result);
                profileStatus.textContent = `Profil: ${currentProfile.name || 'Unbenannt'}`;
                saveBtn.disabled = false;
            } catch {
                profileStatus.textContent = 'Fehler beim Laden!';
            }
        };
        reader.readAsText(file);
    };

    saveBtn.onclick = () => {
        if (!currentProfile) return;
        const blob = new Blob([JSON.stringify(currentProfile, null, 2)], {type: "application/json"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (currentProfile.name || 'profil') + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
    };
}

if (createBtn && profileModal && closeProfileModal && profileForm) {
    createBtn.onclick = () => {
        profileForm.reset();
        profileModal.style.display = 'flex';
    };
    closeProfileModal.onclick = () => {
        profileModal.style.display = 'none';
    };
    window.onclick = (event) => {
        if (event.target === profileModal) profileModal.style.display = 'none';
    };
    profileForm.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        currentProfile = {};
        for (const [key, value] of formData.entries()) {
            currentProfile[key] = value;
        }
        profileStatus.textContent = `Profil: ${currentProfile.vorname || ''} ${currentProfile.nachname || ''}`.trim() || 'Profil: Unbenannt';
        saveBtn.disabled = false;
        profileModal.style.display = 'none';
    };
}