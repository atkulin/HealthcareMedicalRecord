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

// Einfache AES-GCM Verschlüsselung/Entschlüsselung mit Web Crypto API (ohne Drittanbieter-Bibliotheken)
async function encryptProfile(profileObj, password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(password), {name: "PBKDF2"}, false, ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );
    const data = enc.encode(JSON.stringify(profileObj));
    const ciphertext = new Uint8Array(await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, key, data
    ));
    // Datei enthält: salt + iv + ciphertext (alles base64)
    return btoa(String.fromCharCode(...salt) + String.fromCharCode(...iv) + String.fromCharCode(...ciphertext));
}

async function decryptProfile(ciphertextB64, password) {
    try {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const data = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const ciphertext = data.slice(28);
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", enc.encode(password), {name: "PBKDF2"}, false, ["deriveKey"]
        );
        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv }, key, ciphertext
        );
        return JSON.parse(dec.decode(decrypted));
    } catch {
        return null;
    }
}

if (loadBtn && loader && saveBtn && profileStatus) {
    loadBtn.onclick = () => loader.click();
    loader.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async evt => {
            const password = prompt("Bitte Passwort zum Entschlüsseln des Profils eingeben:");
            if (!password) return;
            const decrypted = await decryptProfile(evt.target.result, password);
            if (decrypted) {
                currentProfile = decrypted;
                profileStatus.textContent = `Profil: ${currentProfile.vorname || currentProfile.name || 'Unbenannt'}`;
                saveBtn.disabled = false;
            } else {
                profileStatus.textContent = 'Fehler beim Entschlüsseln!';
            }
        };
        reader.readAsText(file);
    };

    saveBtn.onclick = async () => {
        if (!currentProfile) return;
        const password = prompt("Bitte Passwort zum Verschlüsseln des Profils eingeben:");
        if (!password) return;
        const encrypted = await encryptProfile(currentProfile, password);
        const blob = new Blob([encrypted], {type: "text/plain"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = ((currentProfile.vorname || currentProfile.name || 'profil') + '.json');
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