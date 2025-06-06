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
    if (!currentProfile || typeof currentProfile !== "object" || !Array.isArray(currentProfile.medicalRecord)) {
        medicalRecordSection.style.display = "none";
        return;
    }
    medicalRecordSection.style.display = "block";
    const entries = currentProfile.medicalRecord;
    if (entries.length === 0) {
        medicalRecordList.innerHTML = "<div style='color:#b2dfdb;text-align:center;'>Noch keine Einträge.</div>";
        return;
    }

    // Diagnose-Gruppen und andere Einträge trennen
    let html = '';
    entries.forEach((entry, idx) => {
        if (entry.type === "Diagnose") {
            // Diagnose als Gruppe mit expand/collapse
            const groupId = `diagnose-group-${idx}`;
            const expanded = entry._expanded !== false; // default: expanded
            html += `
                <div class="medical-entry diagnosis-group">
                    <div class="entry-header diagnosis-header" data-group="${groupId}">
                        <span class="expand-toggle" data-group="${groupId}" style="cursor:pointer;font-size:1.2em;">
                            ${expanded ? "▼" : "►"}
                        </span>
                        <span class="entry-type">${medicalTypeIcons[entry.type] || ''} ${entry.type || ''}</span>
                        <span class="entry-date">${entry.date || ''}${entry.time ? ' ' + entry.time : ''}</span>
                        <span style="flex:1"></span>
                        <button class="edit-entry-btn" title="Bearbeiten" data-idx="${idx}" style="margin-right:0.5em;">✏️</button>
                        <button class="note-entry-btn" title="Notiz hinzufügen" data-idx="${idx}">📝</button>
                    </div>
                    <div class="diagnosis-group-content" id="${groupId}" style="display:${expanded ? 'block' : 'none'};">
                        <div class="entry-title">${entry.title || ''}</div>
                        ${entry.icd ? `<div class="entry-description"><b>ICD-10:</b> ${entry.icd}</div>` : ''}
                        <div class="entry-description">${entry.description || ''}</div>
                        ${entry.notes ? `<div class="entry-notes"><b>Notizen:</b> ${entry.notes}</div>` : ''}
                        ${entry.image ? `<div class="entry-image"><img src="${entry.image}" alt="Bild" style="max-width:180px;max-height:180px;border-radius:8px;margin-top:0.5em;"></div>` : ''}
                        <div class="diagnosis-subentries">
                            ${renderDiagnosisSubentries(entry, idx)}
                            <button class="add-subentry-btn" data-idx="${idx}" style="margin-top:0.7em;">➕ Untereintrag hinzufügen</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (!entry.parentDiagnosis) {
            // Normale Einträge (ohne parentDiagnosis)
            html += `
                <div class="medical-entry">
                    <div class="entry-header">
                        <span class="entry-type">${medicalTypeIcons[entry.type] || ''} ${entry.type || ''}</span>
                        <span class="entry-date">${entry.date || ''}${entry.time ? ' ' + entry.time : ''}</span>
                        <span style="flex:1"></span>
                        <button class="edit-entry-btn" title="Bearbeiten" data-idx="${idx}" style="margin-right:0.5em;">✏️</button>
                        <button class="note-entry-btn" title="Notiz hinzufügen" data-idx="${idx}">📝</button>
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
                    ${entry.notes ? `<div class="entry-notes"><b>Notizen:</b> ${entry.notes}</div>` : ''}
                    ${entry.image ? `<div class="entry-image"><img src="${entry.image}" alt="Bild" style="max-width:180px;max-height:180px;border-radius:8px;margin-top:0.5em;"></div>` : ''}
                </div>
            `;
        }
    });
    medicalRecordList.innerHTML = html;
    setMedicalEntryActionHandlers();

    // Expand/Collapse für Diagnose-Gruppen
    document.querySelectorAll('.expand-toggle').forEach(toggle => {
        toggle.onclick = (e) => {
            const groupId = toggle.getAttribute('data-group');
            const groupDiv = document.getElementById(groupId);
            const entryIdx = Array.from(document.querySelectorAll('.expand-toggle')).indexOf(toggle);
            const entry = currentProfile.medicalRecord.filter(e => e.type === "Diagnose")[entryIdx];
            if (groupDiv && entry) {
                if (groupDiv.style.display === 'none') {
                    groupDiv.style.display = 'block';
                    toggle.textContent = "▼";
                    entry._expanded = true;
                } else {
                    groupDiv.style.display = 'none';
                    toggle.textContent = "►";
                    entry._expanded = false;
                }
            }
        };
    });

    // Editieren- und Notiz-Buttons wie gehabt
    document.querySelectorAll('.edit-entry-btn').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const entry = currentProfile.medicalRecord[idx];
            medicalEntryForm.reset();
            medicalEntryType.value = entry.type;
            renderMedicalEntryFields(entry.type, entry);
            medicalEntryModal.style.display = 'flex';

            // Temporärer Submit-Handler für Bearbeiten
            const origSubmit = medicalEntryForm.onsubmit;
            medicalEntryForm.onsubmit = async (ev) => {
                ev.preventDefault();
                const formData = new FormData(medicalEntryForm);
                const updated = {};
                for (const [key, value] of formData.entries()) {
                    updated[key] = value;
                }
                updated.type = medicalEntryType.value;
                const fileInput = document.getElementById('medicalEntryImageInput');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    updated.image = await resizeAndReadImage(fileInput.files[0]);
                } else if (entry.image) {
                    updated.image = entry.image;
                }
                updated.notes = entry.notes || '';
                updated.parentDiagnosis = entry.parentDiagnosis || undefined;
                updated._expanded = entry._expanded;
                currentProfile.medicalRecord[idx] = updated;
                showMedicalRecord();
                medicalEntryModal.style.display = 'none';
                saveBtn.disabled = false;
                medicalEntryForm.onsubmit = origSubmit;
            };
        };
    });

    document.querySelectorAll('.note-entry-btn').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const entry = currentProfile.medicalRecord[idx];
            const note = prompt("Notiz zu diesem Eintrag hinzufügen oder bearbeiten:", entry.notes || "");
            if (note !== null) {
                entry.notes = note;
                showMedicalRecord();
                saveBtn.disabled = false;
            }
        };
    });

    // Untereintrag hinzufügen
    document.querySelectorAll('.add-subentry-btn').forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            medicalEntryForm.reset();
            renderMedicalEntryFields('', {});
            medicalEntryModal.style.display = 'flex';

            // Temporärer Submit-Handler für Untereintrag
            const origSubmit = medicalEntryForm.onsubmit;
            medicalEntryForm.onsubmit = (ev) => {
                ev.preventDefault();
                const formData = new FormData(medicalEntryForm);
                const subentry = {};
                for (const [key, value] of formData.entries()) {
                    subentry[key] = value;
                }
                subentry.parentDiagnosis = idx;
                if (!currentProfile.medicalRecord) currentProfile.medicalRecord = [];
                currentProfile.medicalRecord.push(subentry);
                showMedicalRecord();
                medicalEntryModal.style.display = 'none';
                saveBtn.disabled = false;
                medicalEntryForm.onsubmit = origSubmit;
            };
        };
    });
}

// Hilfsfunktion: Untereinträge zu einer Diagnose anzeigen
function renderDiagnosisSubentries(diagnoseEntry, diagnoseIdx) {
    const entries = currentProfile.medicalRecord || [];
    const subentries = entries
        .map((e, idx) => ({...e, _idx: idx}))
        .filter(e => e.parentDiagnosis === diagnoseIdx);
    if (subentries.length === 0) {
        return `<div style="color:#b2dfdb; margin-top:0.5em;">Noch keine Untereinträge.</div>`;
    }
    return subentries.map(entry => `
        <div class="medical-entry subentry">
            <div class="entry-header">
                <span class="entry-type">${medicalTypeIcons[entry.type] || ''} ${entry.type || ''}</span>
                <span class="entry-date">${entry.date || ''}${entry.time ? ' ' + entry.time : ''}</span>
                <span style="flex:1"></span>
                <button class="edit-entry-btn" title="Bearbeiten" data-idx="${entry._idx}" style="margin-right:0.5em;">✏️</button>
                <button class="note-entry-btn" title="Notiz hinzufügen" data-idx="${entry._idx}">📝</button>
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
            ${entry.notes ? `<div class="entry-notes"><b>Notizen:</b> ${entry.notes}</div>` : ''}
            ${entry.image ? `<div class="entry-image"><img src="${entry.image}" alt="Bild" style="max-width:180px;max-height:180px;border-radius:8px;margin-top:0.5em;"></div>` : ''}
            </div>
    `).join('');
}

// Nach dem Laden eines Profils (z.B. nach Entschlüsseln)
async function handleProfileLoad(decrypted) {
    if (decrypted && typeof decrypted === "object") {
        currentProfile = decrypted;
        if (!currentProfile.medicalRecord) currentProfile.medicalRecord = [];
        updateProfileUI();
    }
}

// Passe das Laden an:
if (loader) {
    loader.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        // Nur .medrec-Dateien zulassen
        if (!file.name.endsWith('.medrec')) {
            alert("Bitte eine gültige .medrec-Datei auswählen!");
            return;
        }
        const reader = new FileReader();
        reader.onload = async evt => {
            const password = await askPassword("Bitte Passwort zum Entschlüsseln des Profils eingeben:");
            if (!password) return;
            const decrypted = await decryptProfile(evt.target.result, password);
            handleProfileLoad(decrypted);
        };
        reader.readAsText(file);
    };
}

// Nach dem Absenden des Profil-Formulars (Erstellen oder Bearbeiten)
if (profileForm) {
    profileForm.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        if (!currentProfile || !isEditMode) currentProfile = {};
        for (const [key, value] of formData.entries()) {
            currentProfile[key] = value;
        }
        // Sicherstellen, dass medicalRecord existiert
        if (!currentProfile.medicalRecord) currentProfile.medicalRecord = [];
        updateProfileUI();
        closeProfileModalFunc();
    };
}

function updateProfileUI() {
    if (!currentProfile) {
        profileStatus.textContent = "Kein Profil geladen";
        saveBtn.disabled = true;
        profileDataSection.style.display = "none";
        medicalRecordSection.style.display = "none";
        return;
    }
    profileStatus.textContent = `Profil: ${currentProfile.vorname || currentProfile.name || 'Unbenannt'}`;
    saveBtn.disabled = false;
    showProfileData();
    showMedicalRecord();
}
function closeProfileModalFunc() {
    profileModal.style.display = 'none';
    profileForm.reset();
    isEditMode = false;
}

// Profil erstellen Button
if (createBtn) {
    createBtn.onclick = () => {
        isEditMode = false;
        profileForm.reset();
        profileModal.style.display = 'flex';
    };
}

// Profil laden Button
if (loadBtn && loader) {
    loadBtn.onclick = () => {
        loader.value = ""; // Reset file input
        loader.click();
    };
}

// Profil bearbeiten Button
if (editProfileBtn) {
    editProfileBtn.onclick = () => {
        isEditMode = true;
        // Felder mit aktuellen Profildaten füllen
        for (const el of profileForm.elements) {
            if (el.name && currentProfile && currentProfile[el.name] !== undefined) {
                el.value = currentProfile[el.name];
            }
        }
        profileModal.style.display = 'flex';
    };
}

// Modal schließen
if (closeProfileModal) {
    closeProfileModal.onclick = closeProfileModalFunc;
}

async function askPassword(promptText) {
    return new Promise(resolve => {
        passwordModalTitle.textContent = promptText || "Passwort";
        passwordInput.value = "";
        passwordError.style.display = "none";
        passwordModal.style.display = "flex";
        passwordInput.focus();

        function cleanup() {
            passwordModal.style.display = "none";
            passwordForm.onsubmit = null;
            closePasswordModal.onclick = null;
        }

        passwordForm.onsubmit = (e) => {
            e.preventDefault();
            cleanup();
            resolve(passwordInput.value);
        };
        closePasswordModal.onclick = () => {
            cleanup();
            resolve(null);
        };
    });
}

// Profil erstellen Button
if (createBtn) {
    createBtn.onclick = () => {
        isEditMode = false;
        profileForm.reset();
        profileModal.style.display = 'flex';
    };
}

// Profil laden Button
if (loadBtn && loader) {
    loadBtn.onclick = () => {
        loader.value = ""; // Reset file input
        loader.click();
    };
}

// Profil bearbeiten Button
if (editProfileBtn) {
    editProfileBtn.onclick = () => {
        isEditMode = true;
        // Felder mit aktuellen Profildaten füllen
        for (const el of profileForm.elements) {
            if (el.name && currentProfile && currentProfile[el.name] !== undefined) {
                el.value = currentProfile[el.name];
            }
        }
        profileModal.style.display = 'flex';
    };
}

// Modal schließen
if (closeProfileModal) {
    closeProfileModal.onclick = closeProfileModalFunc;
}

async function askPassword(promptText) {
    return new Promise(resolve => {
        passwordModalTitle.textContent = promptText || "Passwort";
        passwordInput.value = "";
        passwordError.style.display = "none";
        passwordModal.style.display = "flex";
        passwordInput.focus();

        function cleanup() {
            passwordModal.style.display = "none";
            passwordForm.onsubmit = null;
            closePasswordModal.onclick = null;
        }

        passwordForm.onsubmit = (e) => {
            e.preventDefault();
            cleanup();
            resolve(passwordInput.value);
        };
        closePasswordModal.onclick = () => {
            cleanup();
            resolve(null);
        };
    });
}

// Handler für "Neuen Eintrag hinzufügen"
if (addMedicalEntryBtn) {
    addMedicalEntryBtn.onclick = () => {
        isEditMode = false;
        medicalEntryForm.reset();
        medicalEntryType.value = ""; // Typ zurücksetzen
        renderMedicalEntryFields('');
        medicalEntryModal.style.display = 'flex';
        setMedicalEntryFormSubmitHandler();
    };
}

// Handler für Modal schließen (medizinischer Eintrag)
if (closeMedicalEntryModal) {
    closeMedicalEntryModal.onclick = () => {
        medicalEntryModal.style.display = 'none';
        setMedicalEntryFormSubmitHandler();
    };
}

// Standard-Submit-Handler für neue medizinische Einträge
function setMedicalEntryFormSubmitHandler(editIdx = null) {
    medicalEntryForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(medicalEntryForm);
        const entry = {};
        for (const [key, value] of formData.entries()) {
            entry[key] = value;
        }
        entry.type = medicalEntryType.value;

        // Bild-Handling
        const fileInput = document.getElementById('medicalEntryImageInput');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            entry.image = await resizeAndReadImage(fileInput.files[0]);
        } else if (editIdx !== null && currentProfile.medicalRecord[editIdx].image) {
            entry.image = currentProfile.medicalRecord[editIdx].image;
        }

        if (editIdx !== null) {
            entry.notes = currentProfile.medicalRecord[editIdx].notes || '';
            entry.parentDiagnosis = currentProfile.medicalRecord[editIdx].parentDiagnosis || undefined;
            entry._expanded = currentProfile.medicalRecord[editIdx]._expanded;
            currentProfile.medicalRecord[editIdx] = entry;
        } else {
            if (!currentProfile.medicalRecord) currentProfile.medicalRecord = [];
            currentProfile.medicalRecord.push(entry);
        }
        showMedicalRecord();
        medicalEntryModal.style.display = 'none';
        saveBtn.disabled = false;
        setMedicalEntryFormSubmitHandler();
    };
}
setMedicalEntryFormSubmitHandler(); // Initial setzen

// Nach jedem Rendern der medizinischen Akte Buttons neu setzen!
function setMedicalEntryActionHandlers() {
    document.querySelectorAll('.edit-entry-btn').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const entry = currentProfile.medicalRecord[idx];
            isEditMode = true;
            medicalEntryForm.reset();
            medicalEntryType.value = entry.type;
            renderMedicalEntryFields(entry.type, entry);
            medicalEntryModal.style.display = 'flex';

            // Temporärer Submit-Handler für Bearbeiten
            const origSubmit = medicalEntryForm.onsubmit;
            medicalEntryForm.onsubmit = async (ev) => {
                ev.preventDefault();
                const formData = new FormData(medicalEntryForm);
                const updated = {};
                for (const [key, value] of formData.entries()) {
                    updated[key] = value;
                }
                updated.type = medicalEntryType.value;
                const fileInput = document.getElementById('medicalEntryImageInput');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    updated.image = await resizeAndReadImage(fileInput.files[0]);
                } else if