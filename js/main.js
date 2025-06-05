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

// Hilfsfunktionen
function calcAge(birthdate) {
    if (!birthdate) return '';
    const bd = new Date(birthdate);
    if (isNaN(bd)) return '';
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age;
}

// DOM-Elemente
const profileStatus = document.getElementById('profileStatus');
const loadBtn = document.getElementById('loadProfileBtn');
const saveBtn = document.getElementById('saveProfileBtn');
const loader = document.getElementById('profileLoader');
const createBtn = document.getElementById('createProfileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const profileForm = document.getElementById('profileForm');
const profileDataSection = document.getElementById('profileDataSection');
const profileDataView = document.getElementById('profileDataView');
const editProfileBtn = document.getElementById('editProfileBtn');
const passwordModal = document.getElementById('passwordModal');
const closePasswordModal = document.getElementById('closePasswordModal');
const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('passwordInput');
const passwordModalTitle = document.getElementById('passwordModalTitle');
const passwordError = document.getElementById('passwordError');

// Medizinische Akte
const medicalRecordSection = document.getElementById('medicalRecordSection');
const addMedicalEntryBtn = document.getElementById('addMedicalEntryBtn');
const medicalRecordList = document.getElementById('medicalRecordList');
const medicalEntryModal = document.getElementById('medicalEntryModal');
const closeMedicalEntryModal = document.getElementById('closeMedicalEntryModal');
const medicalEntryForm = document.getElementById('medicalEntryForm');
const medicalEntryType = document.getElementById('medicalEntryType');
const medicalEntryDynamicFields = document.getElementById('medicalEntryDynamicFields');

// Icons für die Anzeige in der Liste
const medicalTypeIcons = {
    "Symptom": "🩹",
    "Diagnose": "🩺",
    "Untersuchung": "🔬",
    "Medikation": "💊",
    "Impfung": "💉",
    "Allergie": "🌿",
    "Operation": "🏥",
    "Befund": "📄",
    "Laborwert": "🧪",
    "Sonstiges": "🗂️"
};

let currentProfile = null;
let isEditMode = false;

// AES-GCM Verschlüsselung/Entschlüsselung
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

// Profildaten anzeigen
function showProfileData() {
    if (!currentProfile) {
        profileDataSection.style.display = "none";
        return;
    }
    let html = '';
    html += `<div class="profile-row"><label>Vorname:</label> ${currentProfile.vorname || ''}</div>`;
    html += `<div class="profile-row"><label>Nachname:</label> ${currentProfile.nachname || ''}</div>`;
    html += `<div class="profile-row"><label>Geburtsdatum:</label> ${currentProfile.geburtsdatum || ''}</div>`;
    html += `<div class="profile-row"><label>Alter:</label> ${calcAge(currentProfile.geburtsdatum) || ''}</div>`;
    html += `<div class="profile-row"><label>Geschlecht:</label> ${currentProfile.geschlecht || ''}</div>`;
    html += `<div class="profile-row"><label>E-Mail:</label> ${currentProfile.email || ''}</div>`;
    html += `<div class="profile-row"><label>Telefon:</label> ${currentProfile.telefon || ''}</div>`;
    html += `<div class="profile-row"><label>Adresse:</label> ${currentProfile.adresse || ''}</div>`;
    html += `<div class="profile-row"><label>Notizen:</label> ${currentProfile.notizen || ''}</div>`;
    profileDataView.innerHTML = html;
    profileDataSection.style.display = "block";
}

// Medizinische Akte anzeigen
function showMedicalRecord() {
    if (!currentProfile) {
        medicalRecordSection.style.display = "none";
        return;
    }
    medicalRecordSection.style.display = "block";
    const entries = currentProfile.medicalRecord || [];
    if (entries.length === 0) {
        medicalRecordList.innerHTML = "<div style='color:#b2dfdb;text-align:center;'>Noch keine Einträge.</div>";
        return;
    }
    medicalRecordList.innerHTML = entries.map(entry => `
        <div class="medical-entry">
            <div class="entry-header">
                <span class="entry-type">${medicalTypeIcons[entry.type] || ''} ${entry.type || ''}</span>
                <span class="entry-date">${entry.date || ''}${entry.time ? ' ' + entry.time : ''}</span>
            </div>
            <div class="entry-title">${entry.title || ''}</div>
            ${entry.value ? `<div class="entry-description"><b>Wert:</b> ${entry.value} ${entry.unit || ''} ${entry.reference ? '(Ref: ' + entry.reference + ')' : ''}</div>` : ''}
            ${entry.dosage ? `<div class="entry-description"><b>Dosierung:</b> ${entry.dosage}</div>` : ''}
            ${entry.frequency ? `<div class="entry-description"><b>Frequenz:</b> ${entry.frequency}</div>` : ''}
            ${entry.icd ? `<div class="entry-description"><b>ICD-10:</b> ${entry.icd}</div>` : ''}
            ${entry.batch ? `<div class="entry-description"><b>Charge:</b> ${entry.batch}</div>` : ''}
            ${entry.manufacturer ? `<div class="entry-description"><b>Hersteller:</b> ${entry.manufacturer}</div>` : ''}
            ${entry.location ? `<div class="entry-description"><b>Impfstelle:</b> ${entry.location}</div>` : ''}
            ${entry.reaction ? `<div class="entry-description"><b>Reaktion:</b> ${entry.reaction}</div>` : ''}
            ${entry.result ? `<div class="entry-description"><b>Ergebnis:</b> ${entry.result}</div>` : ''}
            ${entry.severity ? `<div class="entry-description"><b>Schweregrad:</b> ${entry.severity}</div>` : ''}
            ${entry.substance ? `<div class="entry-description"><b>Wirkstoff:</b> ${entry.substance}</div>` : ''}
            ${entry.route ? `<div class="entry-description"><b>Verabreichungsweg:</b> ${entry.route}</div>` : ''}
            ${entry.duration ? `<div class="entry-description"><b>Behandlungsdauer:</b> ${entry.duration}</div>` : ''}
            ${entry.reason ? `<div class="entry-description"><b>Grund:</b> ${entry.reason}</div>` : ''}
            ${entry.surgeon ? `<div class="entry-description"><b>Chirurg:</b> ${entry.surgeon}</div>` : ''}
            ${entry.hospital ? `<div class="entry-description"><b>Krankenhaus:</b> ${entry.hospital}</div>` : ''}
            ${entry.method ? `<div class="entry-description"><b>Messmethode:</b> ${entry.method}</div>` : ''}
            <div class="entry-description">${entry.description || ''}</div>
        </div>
    `).join('');
}

// UI aktualisieren
function updateProfileUI() {
    profileStatus.textContent = `Profil: ${currentProfile.vorname || currentProfile.name || 'Unbenannt'}`;
    saveBtn.disabled = false;
    showProfileData();
    showMedicalRecord();
}

// Modal-Handling für Profil
function openProfileModal(editMode = false) {
    isEditMode = editMode;
    if (editMode && currentProfile) {
        // Felder mit aktuellen Werten füllen
        for (const el of profileForm.elements) {
            if (el.name && currentProfile[el.name] !== undefined) {
                el.value = currentProfile[el.name];
            }
        }
    } else {
        profileForm.reset();
    }
    profileModal.style.display = 'flex';
}
function closeProfileModalFunc() {
    profileModal.style.display = 'none';
}

// Event-Handler für Profil erstellen/bearbeiten
if (createBtn) {
    createBtn.onclick = () => openProfileModal(false);
}
if (editProfileBtn) {
    editProfileBtn.onclick = () => openProfileModal(true);
}
if (closeProfileModal) {
    closeProfileModal.onclick = closeProfileModalFunc;
}

// Formular absenden (Erstellen oder Bearbeiten)
if (profileForm) {
    profileForm.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        if (!currentProfile || !isEditMode) currentProfile = {};
        for (const [key, value] of formData.entries()) {
            currentProfile[key] = value;
        }
        updateProfileUI();
        closeProfileModalFunc();
    };
}

// Modal-Handling für Passwort
let passwordResolve = null;
function askPassword(title) {
    passwordModalTitle.textContent = title;
    passwordInput.value = '';
    passwordError.style.display = 'none';
    passwordModal.style.display = 'flex';
    passwordInput.focus();
    return new Promise(resolve => {
        passwordResolve = resolve;
    });
}
if (closePasswordModal) {
    closePasswordModal.onclick = () => {
        passwordModal.style.display = 'none';
        if (passwordResolve) passwordResolve(null);
    };
}
if (passwordForm) {
    passwordForm.onsubmit = e => {
        e.preventDefault();
        passwordModal.style.display = 'none';
        if (passwordResolve) passwordResolve(passwordInput.value);
    };
}

// Modal-Schließen nur bei Klick außerhalb
window.onclick = (event) => {
    if (profileModal && profileModal.style.display === 'flex' && event.target === profileModal) {
        profileModal.style.display = 'none';
    }
    if (passwordModal && passwordModal.style.display === 'flex' && event.target === passwordModal) {
        passwordModal.style.display = 'none';
        if (passwordResolve) passwordResolve(null);
    }
};

// Profil laden/speichern mit Passwort-Modal
if (loadBtn && loader && saveBtn && profileStatus) {
    loadBtn.onclick = () => loader.click();
    loader.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async evt => {
            const password = await askPassword("Bitte Passwort zum Entschlüsseln des Profils eingeben:");
            if (!password) return;
            const decrypted = await decryptProfile(evt.target.result, password);
            if (decrypted) {
                currentProfile = decrypted;
                updateProfileUI();
            } else {
                profileStatus.textContent = 'Fehler beim Entschlüsseln!';
                profileDataSection.style.display = "none";
            }
        };
        reader.readAsText(file);
    };

    saveBtn.onclick = async () => {
        if (!currentProfile) return;
        const password = await askPassword("Bitte Passwort zum Verschlüsseln des Profils eingeben:");
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

// Uhr (wie gehabt)
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

// Modal öffnen/schließen für medizinische Akte
if (addMedicalEntryBtn) {
    addMedicalEntryBtn.onclick = () => {
        medicalEntryForm.reset();
        renderMedicalEntryFields('');
        medicalEntryModal.style.display = 'flex';
    };
}
if (closeMedicalEntryModal) {
    closeMedicalEntryModal.onclick = () => {
        medicalEntryModal.style.display = 'none';
    };
}

// Modal-Schließen bei Klick außerhalb
window.addEventListener('click', (event) => {
    if (medicalEntryModal && medicalEntryModal.style.display === 'flex' && event.target === medicalEntryModal) {
        medicalEntryModal.style.display = 'none';
    }
});

// Eintrag speichern
if (medicalEntryForm) {
    medicalEntryForm.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(medicalEntryForm);
        const entry = {};
        for (const [key, value] of formData.entries()) {
            entry[key] = value;
        }
        if (!currentProfile.medicalRecord) currentProfile.medicalRecord = [];
        currentProfile.medicalRecord.push(entry);
        showMedicalRecord();
        medicalEntryModal.style.display = 'none';
        saveBtn.disabled = false;
    };
}

// Dynamische Felder je nach Typ
function renderMedicalEntryFields(type, values = {}) {
    let html = '';
    // Datum & Uhrzeit immer
    html += `<label>Datum: <input type="date" name="date" value="${values.date || ''}" required></label>`;
    html += `<label>Uhrzeit: <input type="time" name="time" value="${values.time || ''}" required></label>`;

    switch (type) {
        case "Symptom":
            html += `<label>Symptom: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Schweregrad: 
                        <select name="severity">
                            <option value="">Bitte wählen</option>
                            <option${values.severity==="leicht"?" selected":""}>leicht</option>
                            <option${values.severity==="mittel"?" selected":""}>mittel</option>
                            <option${values.severity==="schwer"?" selected":""}>schwer</option>
                        </select>
                     </label>
                     <label>Beschreibung: <textarea name="description" required>${values.description || ''}</textarea></label>`;
            break;
        case "Diagnose":
            html += `<label>Diagnose: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>ICD-10 Code: <input type="text" name="icd" value="${values.icd || ''}"></label>
                     <label>Beschreibung: <textarea name="description" required>${values.description || ''}</textarea></label>`;
            break;
        case "Untersuchung":
            html += `<label>Untersuchung: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Ergebnis: <input type="text" name="result" value="${values.result || ''}"></label>
                     <label>Beschreibung: <textarea name="description" required>${values.description || ''}</textarea></label>`;
            break;
        case "Medikation":
            html += `<label>Medikament: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Wirkstoff: <input type="text" name="substance" value="${values.substance || ''}"></label>
                     <label>Dosierung: <input type="text" name="dosage" value="${values.dosage || ''}" required></label>
                     <label>Frequenz: <input type="text" name="frequency" value="${values.frequency || ''}" required></label>
                     <label>Verabreichungsweg: <input type="text" name="route" value="${values.route || ''}"></label>
                     <label>Behandlungsdauer: <input type="text" name="duration" value="${values.duration || ''}"></label>
                     <label>Grund: <input type="text" name="reason" value="${values.reason || ''}"></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        case "Impfung":
            html += `<label>Impfstoff: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Charge: <input type="text" name="batch" value="${values.batch || ''}"></label>
                     <label>Hersteller: <input type="text" name="manufacturer" value="${values.manufacturer || ''}"></label>
                     <label>Impfstelle: <input type="text" name="location" value="${values.location || ''}"></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        case "Allergie":
            html += `<label>Allergen: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Reaktion: <input type="text" name="reaction" value="${values.reaction || ''}"></label>
                     <label>Schweregrad: 
                        <select name="severity">
                            <option value="">Bitte wählen</option>
                            <option${values.severity==="leicht"?" selected":""}>leicht</option>
                            <option${values.severity==="mittel"?" selected":""}>mittel</option>
                            <option${values.severity==="schwer"?" selected":""}>schwer</option>
                        </select>
                     </label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        case "Operation":
            html += `<label>Operation: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Ergebnis: <input type="text" name="result" value="${values.result || ''}"></label>
                     <label>Chirurg: <input type="text" name="surgeon" value="${values.surgeon || ''}"></label>
                     <label>Krankenhaus: <input type="text" name="hospital" value="${values.hospital || ''}"></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        case "Befund":
            html += `<label>Befund: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        case "Laborwert":
            html += `<label>Laborwert: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Wert: <input type="text" name="value" value="${values.value || ''}" required></label>
                     <label>Einheit: <input type="text" name="unit" value="${values.unit || ''}"></label>
                     <label>Referenzbereich: <input type="text" name="reference" value="${values.reference || ''}"></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        case "Vitalwert":
            html += `<label>Vitalwert: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Wert: <input type="text" name="value" value="${values.value || ''}" required></label>
                     <label>Einheit: <input type="text" name="unit" value="${values.unit || ''}"></label>
                     <label>Messmethode: <input type="text" name="method" value="${values.method || ''}"></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        case "Arztbesuch":
            html += `<label>Arzt/Institution: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Grund: <input type="text" name="reason" value="${values.reason || ''}"></label>
                     <label>Ergebnis: <input type="text" name="result" value="${values.result || ''}"></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
            break;
        default: // Sonstiges
            html += `<label>Titel: <input type="text" name="title" value="${values.title || ''}" required></label>
                     <label>Beschreibung: <textarea name="description">${values.description || ''}</textarea></label>`;
    }
    medicalEntryDynamicFields.innerHTML = html;
}

// Typ-Auswahl steuert die Felder
if (medicalEntryType) {
    medicalEntryType.onchange = () => renderMedicalEntryFields(medicalEntryType.value);
}

// Modal öffnen: Felder zurücksetzen
if (addMedicalEntryBtn) {
    addMedicalEntryBtn.onclick = () => {
        medicalEntryForm.reset();
        renderMedicalEntryFields('');
        medicalEntryModal.style.display = 'flex';
    };
}

// Modal schließen
if (closeMedicalEntryModal) {
    closeMedicalEntryModal.onclick = () => {
        medicalEntryModal.style.display = 'none';
    };
}

// Modal-Schließen bei Klick außerhalb
window.addEventListener('click', (event) => {
    if (medicalEntryModal && medicalEntryModal.style.display === 'flex' && event.target === medicalEntryModal) {
        medicalEntryModal.style.display = 'none';
    }
});

// Eintrag speichern
if (medicalEntryForm) {
    medicalEntryForm.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(medicalEntryForm);
        const entry = {};
        for (const [key, value] of formData.entries()) {
            entry[key] = value;
        }
        if (!currentProfile.medicalRecord) currentProfile.medicalRecord = [];
        currentProfile.medicalRecord.push(entry);
        showMedicalRecord();
        medicalEntryModal.style.display = 'none';
        saveBtn.disabled = false;
    };
}

// Anzeige der medizinischen Akte mit Icons und Uhrzeit
function showMedicalRecord() {
    if (!currentProfile) {
        medicalRecordSection.style.display = "none";
        return;
    }
    medicalRecordSection.style.display = "block";
    const entries = currentProfile.medicalRecord || [];
    if (entries.length === 0) {
        medicalRecordList.innerHTML = "<div style='color:#b2dfdb;text-align:center;'>Noch keine Einträge.</div>";
        return;
    }
    medicalRecordList.innerHTML = entries.map(entry => `
        <div class="medical-entry">
            <div class="entry-header">
                <span class="entry-type">${medicalTypeIcons[entry.type] || ''} ${entry.type || ''}</span>
                <span class="entry-date">${entry.date || ''}${entry.time ? ' ' + entry.time : ''}</span>
            </div>
            <div class="entry-title">${entry.title || ''}</div>
            ${entry.value ? `<div class="entry-description"><b>Wert:</b> ${entry.value} ${entry.unit || ''} ${entry.reference ? '(Ref: ' + entry.reference + ')' : ''}</div>` : ''}
            ${entry.dosage ? `<div class="entry-description"><b>Dosierung:</b> ${entry.dosage}</div>` : ''}
            ${entry.frequency ? `<div class="entry-description"><b>Frequenz:</b> ${entry.frequency}</div>` : ''}
            ${entry.icd ? `<div class="entry-description"><b>ICD-10:</b> ${entry.icd}</div>` : ''}
            ${entry.batch ? `<div class="entry-description"><b>Charge:</b> ${entry.batch}</div>` : ''}
            ${entry.manufacturer ? `<div class="entry-description"><b>Hersteller:</b> ${entry.manufacturer}</div>` : ''}
            ${entry.location ? `<div class="entry-description"><b>Impfstelle:</b> ${entry.location}</div>` : ''}
            ${entry.reaction ? `<div class="entry-description"><b>Reaktion:</b> ${entry.reaction}</div>` : ''}
            ${entry.result ? `<div class="entry-description"><b>Ergebnis:</b> ${entry.result}</div>` : ''}
            ${entry.severity ? `<div class="entry-description"><b>Schweregrad:</b> ${entry.severity}</div>` : ''}
            ${entry.substance ? `<div class="entry-description"><b>Wirkstoff:</b> ${entry.substance}</div>` : ''}
            ${entry.route ? `<div class="entry-description"><b>Verabreichungsweg:</b> ${entry.route}</div>` : ''}
            ${entry.duration ? `<div class="entry-description"><b>Behandlungsdauer:</b> ${entry.duration}</div>` : ''}
            ${entry.reason ? `<div class="entry-description"><b>Grund:</b> ${entry.reason}</div>` : ''}
            ${entry.surgeon ? `<div class="entry-description"><b>Chirurg:</b> ${entry.surgeon}</div>` : ''}
            ${entry.hospital ? `<div class="entry-description"><b>Krankenhaus:</b> ${entry.hospital}</div>` : ''}
            ${entry.method ? `<div class="entry-description"><b>Messmethode:</b> ${entry.method}</div>` : ''}
            <div class="entry-description">${entry.description || ''}</div>
        </div>
    `).join('');
}