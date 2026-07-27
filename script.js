import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const LOGIN_FLAG_KEY = "todoAppLoggedIn";
const MODE_KEY = "todoAppMode";
const LOCAL_TODOS_KEY = "todos";
const APP_SETTINGS_KEY = "todoAppSettings";
const PROFILE_ACTIVE_KEY = "todoAppProfileCategory";
const PROFILE_FEEDBACK_KEY = "todoAppFeedback";
const LAST_SYNC_KEY = "todoAppLastSync";

const authShell = document.getElementById("authShell");
const app = document.getElementById("app");
const container = document.getElementById("container");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const registerName = document.getElementById("registerName");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const authMessages = document.querySelectorAll(".auth-message");
const showRegisterPanel = document.getElementById("showRegisterPanel");
const showLoginPanel = document.getElementById("showLoginPanel");
const guestButtons = document.querySelectorAll(".guest-button");
const todoField = document.getElementById("todoField");
const addTodoButton = document.getElementById("btn-add-todo");
const todoList = document.getElementById("todoList");
const completedList = document.getElementById("completedList");
const userStatus = document.getElementById("userStatus");
const btnLogout = document.getElementById("btnLogout");
const changelogContent = document.querySelector(".changelog-content");
const profileLauncher = document.getElementById("profileLauncher");
const profileAvatar = document.getElementById("profileAvatar");
const profileBackdrop = document.getElementById("profileBackdrop");
const profilePanel = document.getElementById("profilePanel");
const profileCategoryList = document.getElementById("profileCategoryList");
const profileDetailContent = document.getElementById("profileDetailContent");
const profileBackButton = document.getElementById("profileBackButton");
const profileCloseButton = document.getElementById("profileCloseButton");

let todos = [];
let appMode = "locked";
let currentUserName = "J";
let currentUserEmail = "";
let profileState = loadProfileSettings();
let currentProfileCategory = localStorage.getItem(PROFILE_ACTIVE_KEY) || "konto";

const profileSections = {
    konto: {
        title: "Konto",
        description: "Deine Kontodaten auf einen Blick.",
        items: [
            { label: "Profilname", type: "dynamicMeta", value: "username" },
            { label: "E-Mail-Adresse", type: "dynamicMeta", value: "email" },
            { label: "Benutzername ändern", type: "input", key: "username", placeholder: "Neuer Benutzername" },
            { label: "Abmelden", type: "button", action: "logout" }
        ]
    },
    darstellung: {
        title: "Darstellung",
        description: "Optik und Lesbarkeit steuern.",
        items: [
            { label: "Hell-/Dunkelmodus", type: "toggle", key: "darkMode" },
            { label: "Akzentfarbe ändern", type: "select", key: "accent", options: [
                { label: "Blau", value: "blue" },
                { label: "Grün", value: "green" },
                { label: "Violett", value: "violet" },
                { label: "Orange", value: "orange" }
            ] },
            { label: "Schriftgröße", type: "range", key: "fontScale", min: 90, max: 120, step: 5 },
            { label: "Kompakte Ansicht", type: "toggle", key: "compact" }
        ]
    },
    synchronisierung: {
        title: "Synchronisierung",
        description: "Synchronisieren und offline arbeiten.",
        items: [
            { label: "Cloud-Synchronisierung ein-/ausschalten", type: "toggle", key: "cloudSync" },
            { label: "Letzte Synchronisierung anzeigen", type: "button", action: "lastSync" },
            { label: "Automatische Synchronisierung", type: "toggle", key: "autoSync" },
            { label: "Offline-Modus", type: "toggle", key: "offlineMode" }
        ]
    },
    ueber: {
        title: "Über",
        description: "Version, Changelog, Feedback und Hilfe.",
        items: [
            { label: "App-Version", type: "meta", value: "Version 2.1.0" },
            { label: "Changelog", type: "changelog" },
            { label: "Feedback senden", type: "button", action: "feedback" },
            { label: "Hilfe", type: "button", action: "help" }
        ]
    }
};

const profileCategories = [
    { key: "konto", label: "Konto" },
    { key: "darstellung", label: "Darstellung" },
    { key: "synchronisierung", label: "Synchronisierung" },
    { key: "ueber", label: "Über" }
];

init();

function init() {
    applyStoredTheme();
    wireEvents();

    const savedMode = localStorage.getItem(MODE_KEY);
    const isMarkedLoggedIn = localStorage.getItem(LOGIN_FLAG_KEY) === "true";

    if (savedMode === "guest") {
        startGuestMode();
        return;
    }

    if (!isMarkedLoggedIn) {
        showLogin();
        return;
    }

    authShell.hidden = true;
    app.hidden = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();

        if (!user) {
            localStorage.removeItem(LOGIN_FLAG_KEY);
            localStorage.removeItem(MODE_KEY);
            showLogin("Bitte melde dich erneut an.");
            return;
        }

        await startOnlineMode(user);
    });
}

function wireEvents() {
    showRegisterPanel.addEventListener("click", () => {
        container.classList.add("active");
        clearMessage();
    });

    showLoginPanel.addEventListener("click", () => {
        container.classList.remove("active");
        clearMessage();
    });

    loginForm.addEventListener("submit", handleLogin);
    registerForm.addEventListener("submit", handleRegister);
    guestButtons.forEach((button) => button.addEventListener("click", startGuestMode));
    addTodoButton.addEventListener("click", addTodo);

    btnLogout.addEventListener("click", async () => {
        if (appMode === "online") {
            await signOut(auth);
        }

        todos = [];
        localStorage.removeItem(LOGIN_FLAG_KEY);
        localStorage.removeItem(MODE_KEY);
        closeProfilePanel();
        showLogin();
    });

    todoField.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            addTodo();
        }
    });

    profileLauncher.addEventListener("click", openProfilePanel);
    profileBackdrop.addEventListener("click", closeProfilePanel);
    profileCloseButton.addEventListener("click", closeProfilePanel);
    profileBackButton.addEventListener("click", () => {
        currentProfileCategory = "konto";
        localStorage.setItem(PROFILE_ACTIVE_KEY, currentProfileCategory);
        renderProfilePanel();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && profilePanel.classList.contains("is-open")) {
            closeProfilePanel();
        }
    });

    document.querySelector(".changelog button")?.addEventListener("click", openChangelog);
    document.querySelector(".changelog-content > button")?.addEventListener("click", closeChangelog);
}

async function handleRegister(event) {
    event.preventDefault();
    clearMessage();

    const username = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;

    if (!username || !email || !password) {
        showMessage("Bitte fülle alle Felder aus.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        todos = [];
        currentUserName = username;
        currentUserEmail = email;
        updateProfileAvatar();
        await setDoc(doc(db, "users", user.uid), {
            username,
            email,
            todos: []
        }, { merge: true });

        localStorage.setItem(LOGIN_FLAG_KEY, "true");
        localStorage.setItem(MODE_KEY, "online");
        await startOnlineMode(user);
    } catch (error) {
        showMessage(getAuthErrorMessage(error));
    }
}

async function handleLogin(event) {
    event.preventDefault();
    clearMessage();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        showMessage("Bitte gib E-Mail und Passwort ein.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem(LOGIN_FLAG_KEY, "true");
        localStorage.setItem(MODE_KEY, "online");
        await startOnlineMode(userCredential.user);
    } catch (error) {
        showMessage(getAuthErrorMessage(error));
    }
}

async function startOnlineMode(user) {
    appMode = "online";
    userStatus.textContent = "Cloud-Modus";
    currentUserEmail = user.email || "";
    localStorage.setItem(LOGIN_FLAG_KEY, "true");
    localStorage.setItem(MODE_KEY, "online");

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            todos = Array.isArray(data.todos) ? data.todos : [];
            currentUserName = data.username || user.email || "J";
            userStatus.textContent = data.username ? `Cloud-Modus: ${data.username}` : "Cloud-Modus";
        } else {
            todos = [];
            currentUserName = user.email || "J";
            await setDoc(userRef, {
                username: user.email,
                email: user.email,
                todos: []
            }, { merge: true });
        }
    } catch (error) {
        showLogin("Firebase-Daten konnten nicht geladen werden.");
        return;
    }

    updateProfileAvatar();
    renderTodos();
    showApp();
}

function startGuestMode() {
    appMode = "guest";
    todos = loadLocalTodos();
    currentUserName = "Gast";
    currentUserEmail = "";
    localStorage.setItem(MODE_KEY, "guest");
    localStorage.removeItem(LOGIN_FLAG_KEY);
    userStatus.textContent = "Lokaler Modus";
    updateProfileAvatar();
    renderTodos();
    showApp();
}

function showLogin(message = "") {
    appMode = "locked";
    app.hidden = true;
    authShell.hidden = false;
    todoField.value = "";
    closeProfilePanel();
    renderTodos();
    clearMessage();

    if (message) {
        showMessage(message);
    }
}

function showApp() {
    authShell.hidden = true;
    app.hidden = false;
    todoField.focus();
    renderProfilePanel();
}

function loadLocalTodos() {
    try {
        const data = localStorage.getItem(LOCAL_TODOS_KEY);
        const parsed = data ? JSON.parse(data) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function loadProfileSettings() {
    const defaults = {
        darkMode: false,
        accent: "blue",
        fontScale: 100,
        compact: false,
        cloudSync: true,
        autoSync: true,
        offlineMode: false
    };

    try {
        const saved = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || "{}");
        const settings = { ...defaults, ...saved };
        const legacyAccentMap = {
            Blau: "blue",
            Grün: "green",
            Gruen: "green",
            Violett: "violet",
            Orange: "orange"
        };
        settings.accent = legacyAccentMap[settings.accent] || settings.accent || defaults.accent;
        return settings;
    } catch {
        return defaults;
    }
}

function saveProfileSettings() {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(profileState));
    applyStoredTheme();
}

function applyStoredTheme() {
    const root = document.documentElement;
    const body = document.body;
    const accentMap = {
        blue: "#2563eb",
        green: "#10b981",
        violet: "#7c3aed",
        orange: "#f97316"
    };
    const accentDarkMap = {
        blue: "#1d4ed8",
        green: "#047857",
        violet: "#6d28d9",
        orange: "#ea580c"
    };

    root.style.setProperty("--accent", accentMap[profileState.accent] || accentMap.blue);
    root.style.setProperty("--accent-dark", accentDarkMap[profileState.accent] || accentDarkMap.blue);
    root.style.setProperty("--font-scale", `${profileState.fontScale}%`);
    root.dataset.theme = profileState.darkMode ? "dark" : "light";
    body.dataset.compact = profileState.compact ? "true" : "false";
    body.dataset.animations = "true";
    body.style.fontSize = `${profileState.fontScale}%`;

    if (profileState.darkMode) {
        root.style.colorScheme = "dark";
    } else {
        root.style.colorScheme = "light";
    }
}

function openProfilePanel() {
    profileBackdrop.hidden = false;
    profilePanel.classList.add("is-open");
    profilePanel.setAttribute("aria-hidden", "false");
    renderProfilePanel();
}

function closeProfilePanel() {
    profileBackdrop.hidden = true;
    profilePanel.classList.remove("is-open");
    profilePanel.setAttribute("aria-hidden", "true");
}

function renderProfilePanel() {
    if (!profileCategories.some((category) => category.key === currentProfileCategory)) {
        currentProfileCategory = "konto";
        localStorage.setItem(PROFILE_ACTIVE_KEY, currentProfileCategory);
    }

    renderCategoryList();
    renderCategoryDetail(currentProfileCategory);
}

function renderCategoryList() {
    profileCategoryList.innerHTML = "";

    profileCategories.forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `profile-category ${category.key === currentProfileCategory ? "is-active" : ""}`;
        button.textContent = category.label;
        button.addEventListener("click", () => {
            currentProfileCategory = category.key;
            localStorage.setItem(PROFILE_ACTIVE_KEY, currentProfileCategory);
            renderProfilePanel();
        });
        profileCategoryList.appendChild(button);
    });
}

function renderCategoryDetail(categoryKey) {
    const section = profileSections[categoryKey] || profileSections.konto;
    const controls = section.items.map((item) => buildProfileItem(item)).join("");

    profileDetailContent.innerHTML = `
        <div class="profile-detail__header">
            <p class="profile-panel__eyebrow">${section.title}</p>
            <h3>${section.title}</h3>
            <p>${section.description}</p>
        </div>
        <div class="profile-detail__items">
            ${controls}
        </div>
    `;

    bindProfileItemEvents();
}

function buildProfileItem(item) {
    if (item.type === "meta") {
        return `
            <div class="profile-item profile-item--meta">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
            </div>
        `;
    }

    if (item.type === "dynamicMeta") {
        const value = item.value === "email"
            ? currentUserEmail || "Nicht angemeldet"
            : currentUserName || "Gast";

        return `
            <div class="profile-item profile-item--meta">
                <span>${item.label}</span>
                <strong>${value}</strong>
            </div>
        `;
    }

    if (item.type === "toggle") {
        return `
            <label class="profile-item profile-item--toggle">
                <span>${item.label}</span>
                <input type="checkbox" data-setting="${item.key}" ${profileState[item.key] ? "checked" : ""}>
            </label>
        `;
    }

    if (item.type === "range") {
        return `
            <label class="profile-item profile-item--range">
                <span>${item.label}</span>
                <input type="range" data-setting="${item.key}" min="${item.min}" max="${item.max}" step="${item.step}" value="${profileState[item.key]}">
                <strong>${profileState[item.key]}%</strong>
            </label>
        `;
    }

    if (item.type === "select") {
        const options = item.options.map((option) => {
            const label = typeof option === "string" ? option : option.label;
            const value = typeof option === "string" ? option : option.value;
            return `<option value="${value}">${label}</option>`;
        }).join("");
        return `
            <label class="profile-item profile-item--select">
                <span>${item.label}</span>
                <select data-setting="${item.key}">
                    ${options}
                </select>
            </label>
        `;
    }

    if (item.type === "input") {
        return `
            <label class="profile-item profile-item--input">
                <span>${item.label}</span>
                <div class="profile-item__row">
                    <input type="${item.inputType || "text"}" data-input="${item.key}" placeholder="${item.placeholder}">
                    <button type="button" data-action="update-${item.key}">Speichern</button>
                </div>
            </label>
        `;
    }

    if (item.type === "import") {
        return `
            <div class="profile-item profile-item--action">
                <span>${item.label}</span>
                <button type="button" data-action="${item.action}">Datei wählen</button>
                <input type="file" data-import-file accept=".json,.csv,application/json,text/csv" hidden>
            </div>
        `;
    }

    if (item.type === "changelog") {
        return `
            <div class="profile-item profile-item--action">
                <span>${item.label}</span>
                <button type="button" data-action="open-changelog">Öffnen</button>
            </div>
        `;
    }

    return `
        <div class="profile-item profile-item--action">
            <span>${item.label}</span>
            <button type="button" data-action="${item.action}" ${item.danger ? "class='is-danger'" : ""}>Ausführen</button>
        </div>
    `;
}

function bindProfileItemEvents() {
    profileDetailContent.querySelectorAll("[data-setting]").forEach((control) => {
        const key = control.dataset.setting;

        if (control.type === "checkbox") {
            control.checked = Boolean(profileState[key]);
            control.addEventListener("change", () => {
                profileState[key] = control.checked;
                saveProfileSettings();
                if (["cloudSync", "autoSync", "offlineMode"].includes(key)) {
                    saveTodos();
                }
                renderProfilePanel();
            });
        } else if (control.tagName === "SELECT") {
            control.value = profileState[key];
            control.addEventListener("change", () => {
                profileState[key] = control.value;
                saveProfileSettings();
                renderProfilePanel();
            });
        } else if (control.type === "range") {
            const valueLabel = control.parentElement.querySelector("strong");
            control.addEventListener("input", () => {
                profileState[key] = Number(control.value);
                valueLabel.textContent = `${control.value}%`;
                saveProfileSettings();
            });
        }
    });

    profileDetailContent.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", () => handleProfileAction(button.dataset.action, button));
    });

    profileDetailContent.querySelectorAll("[data-import-file]").forEach((input) => {
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) return;

            await importProfileData(file);
            input.value = "";
        });
    });
}

async function handleProfileAction(action, trigger) {
    switch (action) {
        case "logout":
            btnLogout.click();
            break;
        case "update-username":
            await updateUsernameFromProfile();
            break;
        case "download":
        case "export":
        case "exportTodos":
            downloadProfileData(action);
            break;
        case "import":
            trigger?.nextElementSibling?.click?.();
            break;
        case "clearCompleted":
            clearCompletedTodos();
            break;
        case "resetAll":
            resetAllData();
            break;
        case "trash":
            openProfileNotice("Papierkorb", "Der Papierkorb wird als nächste Ausbaustufe an den Datenbereich angebunden.");
            break;
        case "help":
            openHelpPanel();
            break;
        case "feedback":
            openFeedbackPanel();
            break;
        case "lastSync":
            openSyncStatus();
            break;
        case "open-changelog":
            openChangelog();
            break;
        default:
            break;
    }
}

async function updateUsernameFromProfile() {
    const input = profileDetailContent.querySelector("[data-input='username']");
    const username = input?.value.trim();

    if (!username) {
        openProfileNotice("Benutzername", "Bitte gib zuerst einen neuen Benutzernamen ein.");
        return;
    }

    currentUserName = username;
    updateProfileAvatar();
    userStatus.textContent = appMode === "online" ? `Cloud-Modus: ${username}` : "Lokaler Modus";

    if (appMode === "online" && auth.currentUser) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { username }, { merge: true });
    }

    renderProfilePanel();
}

function openSyncStatus() {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    const syncText = lastSync
        ? `Letzte Synchronisierung: ${new Date(lastSync).toLocaleString("de-DE")}`
        : "Es wurde noch nicht synchronisiert.";

    openProfileNotice("Synchronisierung", syncText);
}

function openFeedbackPanel() {
    const savedFeedback = loadFeedback();
    const feedbackItems = savedFeedback.length
        ? savedFeedback.map((entry) => `<li><strong>${entry.date}</strong><br>${entry.text}</li>`).join("")
        : "<li>Noch kein Feedback gespeichert.</li>";

    profileDetailContent.innerHTML = `
        <div class="profile-detail__header">
            <p class="profile-panel__eyebrow">Feedback</p>
            <h3>Feedback senden</h3>
            <p>Das Feedback wird lokal in dieser App gespeichert, damit du es hier direkt sehen kannst.</p>
        </div>
        <div class="profile-feedback">
            <textarea id="profileFeedbackText" placeholder="Was soll verbessert werden?"></textarea>
            <button type="button" id="saveProfileFeedback">Feedback speichern</button>
            <ul>${feedbackItems}</ul>
        </div>
    `;

    document.getElementById("saveProfileFeedback").addEventListener("click", () => {
        const textarea = document.getElementById("profileFeedbackText");
        const text = textarea.value.trim();

        if (!text) {
            textarea.focus();
            return;
        }

        savedFeedback.unshift({
            date: new Date().toLocaleString("de-DE"),
            text
        });
        localStorage.setItem(PROFILE_FEEDBACK_KEY, JSON.stringify(savedFeedback.slice(0, 25)));
        openFeedbackPanel();
    });
}

function loadFeedback() {
    try {
        const feedback = JSON.parse(localStorage.getItem(PROFILE_FEEDBACK_KEY) || "[]");
        return Array.isArray(feedback) ? feedback : [];
    } catch {
        return [];
    }
}

function openHelpPanel() {
    const questions = [
        "Wie füge ich ein neues To-do hinzu?",
        "Wie markiere ich ein To-do als erledigt?",
        "Wie lösche ich ein To-do?",
        "Wo sehe ich meine erledigten Aufgaben?",
        "Wie nutze ich die App ohne Konto?",
        "Wann werden meine Aufgaben in der Cloud gespeichert?",
        "Was passiert im Offline-Modus?",
        "Wie ändere ich Schriftgröße und Akzentfarbe?",
        "Wie komme ich zurück zum normalen Design?",
        "Wo finde ich den Changelog?"
    ];

    profileDetailContent.innerHTML = `
        <div class="profile-detail__header">
            <p class="profile-panel__eyebrow">Hilfe</p>
            <h3>10 wichtige Fragen</h3>
            <p>Diese Fragen kannst du später mit kurzen Antworten erweitern.</p>
        </div>
        <ol class="profile-help-list">
            ${questions.map((question) => `<li>${question}</li>`).join("")}
        </ol>
    `;
}

async function importProfileData(file) {
    const text = await file.text();

    if (file.name.toLowerCase().endsWith(".csv")) {
        const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
        const imported = rows.map((row) => {
            const [doneFlag, ...parts] = row.split(";");
            return {
                done: doneFlag === "1",
                text: parts.join(";").trim()
            };
        }).filter((item) => item.text);

        if (imported.length) {
            todos = imported;
            await saveTodos();
            renderTodos();
        }
        return;
    }

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.todos)) {
            todos = parsed.todos;
            await saveTodos();
            renderTodos();
        }
        if (parsed.settings && typeof parsed.settings === "object") {
            profileState = { ...profileState, ...parsed.settings };
            saveProfileSettings();
            renderProfilePanel();
        }
    } catch {
        openProfileNotice("Import fehlgeschlagen", "Die Datei konnte nicht gelesen werden. Bitte verwende JSON oder CSV.");
    }
}

function openProfileNotice(title, message) {
    profileDetailContent.innerHTML = `
        <div class="profile-detail__empty">
            <p class="profile-panel__eyebrow">${title}</p>
            <h3>${message}</h3>
        </div>
    `;
}

function downloadProfileData(action) {
    const exportData = {
        user: {
            name: currentUserName,
            email: currentUserEmail
        },
        settings: profileState,
        todos
    };

    let filename = "todo-app-export.json";
    let payload = JSON.stringify(exportData, null, 2);
    let mimeType = "application/json";

    if (action === "export" && profileSections.datenschutz) {
        filename = "todo-app-export.json";
    }

    if (action === "download") {
        filename = "todo-app-daten.json";
    }

    if (action === "exportTodos") {
        payload = todos.map((todo) => `${todo.done ? "1" : "0"};${todo.text}`).join("\n");
        filename = "todo-list.csv";
        mimeType = "text/csv";
    }

    const blob = new Blob([payload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

async function clearCompletedTodos() {
    todos = todos.filter((todo) => !todo.done);
    await saveTodos();
    renderTodos();
}

async function resetAllData() {
    if (!confirm("Möchtest du wirklich alle lokalen Daten zurücksetzen?")) {
        return;
    }

    todos = [];
    profileState = loadProfileSettings();
    localStorage.removeItem(LOCAL_TODOS_KEY);
    localStorage.removeItem(APP_SETTINGS_KEY);
    saveProfileSettings();
    await saveTodos();
    renderTodos();
    renderProfilePanel();
}

function updateProfileAvatar() {
    const source = currentUserName || currentUserEmail || "Gast";
    profileAvatar.textContent = source.trim().charAt(0).toUpperCase() || "J";
}

async function saveTodos() {
    const shouldSyncToCloud = appMode === "online"
        && profileState.cloudSync
        && profileState.autoSync
        && !profileState.offlineMode;

    if (shouldSyncToCloud) {
        const user = auth.currentUser;

        if (!user) {
            showLogin("Bitte melde dich erneut an.");
            return;
        }

        await setDoc(doc(db, "users", user.uid), {
            todos
        }, { merge: true });
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        return;
    }

    localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(todos));
}

function renderTodos() {
    todoList.innerHTML = "";
    completedList.innerHTML = "";

    todos.forEach((todo, index) => {
        const todoItem = document.createElement("li");
        const checkbox = document.createElement("input");
        const text = document.createElement("span");
        const deleteButton = document.createElement("button");

        checkbox.type = "checkbox";
        checkbox.checked = Boolean(todo.done);

        text.className = "todo-text";
        text.textContent = todo.text;

        checkbox.addEventListener("change", async () => {
            todos[index].done = checkbox.checked;
            await saveTodos();
            renderTodos();
        });

        deleteButton.className = "delete-btn";
        deleteButton.type = "button";
        deleteButton.textContent = "Löschen";

        deleteButton.addEventListener("click", async () => {
            if (!confirm("Möchtest du dieses To-do wirklich löschen?")) {
                return;
            }

            todos.splice(index, 1);
            await saveTodos();
            renderTodos();
        });

        todoItem.append(checkbox, text, deleteButton);

        if (todo.done) {
            completedList.appendChild(todoItem);
        } else {
            todoList.appendChild(todoItem);
        }
    });
}

async function addTodo() {
    const todoText = todoField.value.trim();

    if (todoText === "") {
        todoField.focus();
        return;
    }

    todos.push({ text: todoText, done: false });
    await saveTodos();
    renderTodos();

    todoField.value = "";
    todoField.focus();
}

function clearMessage() {
    authMessages.forEach((message) => {
        message.textContent = "";
    });
}

function showMessage(message) {
    authMessages.forEach((messageElement) => {
        messageElement.textContent = message;
    });
}

function getAuthErrorMessage(error) {
    switch (error.code) {
        case "auth/email-already-in-use":
            return "Diese E-Mail wird bereits verwendet.";
        case "auth/invalid-email":
            return "Bitte gib eine gültige E-Mail-Adresse ein.";
        case "auth/weak-password":
            return "Das Passwort muss mindestens 6 Zeichen lang sein.";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "E-Mail oder Passwort ist falsch.";
        default:
            return "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.";
    }
}

function openChangelog() {
    const changelogMarkup = changelogContent
        ? changelogContent.innerHTML.replace(/<button[\s\S]*?<\/button>\s*$/i, "")
        : "<h2>Änderungen</h2><p>Der Changelog konnte nicht geladen werden.</p>";

    profileDetailContent.innerHTML = `
        <div class="profile-inline-changelog">
            ${changelogMarkup}
        </div>
    `;
}

function closeChangelog() {
    changelogContent?.classList.remove("is-open");
}

window.openChangelog = openChangelog;
window.closeChangelog = closeChangelog;
