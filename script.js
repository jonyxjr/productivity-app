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
const LOCAL_DELETED_TODOS_KEY = "deletedTodos";
const LOCAL_LISTS_KEY = "todoAppLists";
const ACTIVE_LIST_KEY = "todoAppActiveList";
const APP_SETTINGS_KEY = "todoAppSettings";
const PROFILE_ACTIVE_KEY = "todoAppProfileCategory";
const PROFILE_FEEDBACK_KEY = "todoAppFeedback";
const LAST_SYNC_KEY = "todoAppLastSync";
const SEARCH_HISTORY_KEY = "todoAppSearchHistory";
const DELETED_TODO_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

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
const search = document.getElementById("search");
const searchField = document.getElementById("searchField");
const searchPanel = document.getElementById("searchPanel");
const searchToggle = document.getElementById("searchToggle");
const closeMobileSearchButton = document.getElementById("closeMobileSearch");
const todoList = document.getElementById("todoList");
const completedList = document.getElementById("completedList");
const editTodoBackdrop = document.getElementById("editTodoBackdrop");
const editTodoDialog = document.getElementById("editTodoDialog");
const editTodoField = document.getElementById("editTodoField");
const cancelEditTodo = document.getElementById("cancelEditTodo");
const saveEditTodo = document.getElementById("saveEditTodo");
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
const profileOverviewCloseButton = document.getElementById("profileOverviewCloseButton");
const activeListName = document.getElementById("activeListName");
const activeListSubtitle = document.getElementById("activeListSubtitle");
const activeListPickerName = document.getElementById("activeListPickerName");
const listSwitcher = document.getElementById("listSwitcher");
const previousList = document.getElementById("previousList");
const nextList = document.getElementById("nextList");
const openListPicker = document.getElementById("openListPicker");
const listIndicators = document.getElementById("listIndicators");
const addListButton = document.getElementById("addList");
const editActiveListButton = document.getElementById("editActiveList");
const listDialogBackdrop = document.getElementById("listDialogBackdrop");
const listDialog = document.getElementById("listDialog");
const listDialogTitle = document.getElementById("listDialogTitle");
const listNameField = document.getElementById("listNameField");
const listSubtitleField = document.getElementById("listSubtitleField");
const cancelListDialog = document.getElementById("cancelListDialog");
const saveListDialog = document.getElementById("saveListDialog");
const listPickerBackdrop = document.getElementById("listPickerBackdrop");
const listPickerDialog = document.getElementById("listPickerDialog");
const listPicker = document.getElementById("listPicker");
const closeListPickerButton = document.getElementById("closeListPicker");

let todos = [];
let lists = [];
let activeListId = null;
let deletedTodos = [];
let editingTodoIndex = null;
let editingListId = null;
let appMode = "locked";
let currentUserName = "J";
let currentUserEmail = "";
let profileState = loadProfileSettings();
let currentProfileCategory = localStorage.getItem(PROFILE_ACTIVE_KEY) || "konto";
let isMobileProfileDetailOpen = false;
let searchHistory = loadSearchHistory();

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
            { label: "Offline-Modus", type: "toggle", key: "offlineMode" },
            { label: "Gelöschte To-dos", type: "deletedTodos" }
        ]
    },
    ueber: {
        title: "Über",
        description: "Version, Changelog, Feedback und Hilfe.",
        items: [
            { label: "App-Version", type: "meta", value: "Version 2.4.0" },
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
    searchField.addEventListener("input", () => {
        const query = searchField.value.trim();
        if (query) addSearchHistory(query);
        renderSearchPanel();
    });
    searchField.addEventListener("focus", renderSearchPanel);
    searchToggle.addEventListener("click", openMobileSearch);
    closeMobileSearchButton.addEventListener("click", closeMobileSearch);
    editTodoBackdrop.addEventListener("click", closeEditTodoDialog);
    cancelEditTodo.addEventListener("click", closeEditTodoDialog);
    saveEditTodo.addEventListener("click", saveEditedTodo);
    previousList.addEventListener("click", () => switchList(-1));
    nextList.addEventListener("click", () => switchList(1));
    openListPicker.addEventListener("click", openListPickerDialog);
    addListButton.addEventListener("click", () => openListDialog());
    editActiveListButton.addEventListener("click", () => openListDialog(getActiveList()));
    listDialogBackdrop.addEventListener("click", closeListDialog);
    cancelListDialog.addEventListener("click", closeListDialog);
    saveListDialog.addEventListener("click", saveListDialogData);
    listPickerBackdrop.addEventListener("click", closeListPickerDialog);
    closeListPickerButton.addEventListener("click", closeListPickerDialog);

    let touchStartX = null;
    listSwitcher.addEventListener("touchstart", (event) => {
        touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });
    listSwitcher.addEventListener("touchend", (event) => {
        const endX = event.changedTouches[0]?.clientX;
        if (touchStartX === null || typeof endX !== "number") return;
        const distance = endX - touchStartX;
        touchStartX = null;
        if (Math.abs(distance) >= 48) switchList(distance < 0 ? 1 : -1);
    }, { passive: true });

    btnLogout.addEventListener("click", async () => {
        if (appMode === "online") {
            await signOut(auth);
        }

        todos = [];
        lists = [];
        activeListId = null;
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

    editTodoField.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            saveEditedTodo();
        }
    });

    profileLauncher.addEventListener("click", openProfilePanel);
    profileBackdrop.addEventListener("click", closeProfilePanel);
    profileCloseButton.addEventListener("click", closeProfilePanel);
    profileOverviewCloseButton.addEventListener("click", closeProfilePanel);
    profileBackButton.addEventListener("click", () => {
        if (isMobileProfileDetailOpen) {
            isMobileProfileDetailOpen = false;
        } else {
            currentProfileCategory = "konto";
            localStorage.setItem(PROFILE_ACTIVE_KEY, currentProfileCategory);
        }
        renderProfilePanel();
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".todo-actions")) {
            closeTodoActionMenus();
        }
        if (!event.target.closest(".search, .search-toggle")) {
            closeSearchPanel();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && profilePanel.classList.contains("is-open")) {
            closeProfilePanel();
        }

        if (event.key === "Escape" && editTodoDialog.classList.contains("is-open")) {
            closeEditTodoDialog();
        }
        if (event.key === "Escape") {
            closeListDialog();
            closeListPickerDialog();
            closeSearchPanel();
            closeMobileSearch();
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

        lists = [createList("Meine To-do Liste", "Organisiert. Klar. Erledigt.")];
        activeListId = lists[0].id;
        todos = lists[0].todos;
        currentUserName = username;
        currentUserEmail = email;
        updateProfileAvatar();
        await setDoc(doc(db, "users", user.uid), {
            username,
            email,
            lists
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
            const storedDeletedTodos = Array.isArray(data.deletedTodos) ? data.deletedTodos : [];
            const didMigrate = initializeLists(data.lists, data.todos);
            deletedTodos = cleanDeletedTodos(storedDeletedTodos);
            currentUserName = data.username || user.email || "J";
            userStatus.textContent = data.username ? `Cloud-Modus: ${data.username}` : "Cloud-Modus";
            if (didMigrate || deletedTodos.length !== storedDeletedTodos.length) {
                await setDoc(userRef, { lists, deletedTodos }, { merge: true });
            }
        } else {
            lists = [createList("Meine To-do Liste", "Organisiert. Klar. Erledigt.")];
            activeListId = lists[0].id;
            todos = lists[0].todos;
            deletedTodos = [];
            currentUserName = user.email || "J";
            await setDoc(userRef, {
                username: user.email,
                email: user.email,
                lists,
                deletedTodos: []
            }, { merge: true });
        }
    } catch (error) {
        showLogin("Firebase-Daten konnten nicht geladen werden.");
        return;
    }

    updateProfileAvatar();
    updateListUI();
    renderTodos();
    showApp();
}

function startGuestMode() {
    appMode = "guest";
    const didMigrate = initializeLists(loadLocalLists(), loadLocalTodos());
    const storedDeletedTodos = loadLocalDeletedTodos();
    deletedTodos = cleanDeletedTodos(storedDeletedTodos);
    if (didMigrate || deletedTodos.length !== storedDeletedTodos.length) {
        localStorage.setItem(LOCAL_LISTS_KEY, JSON.stringify(lists));
        localStorage.setItem(LOCAL_DELETED_TODOS_KEY, JSON.stringify(deletedTodos));
    }
    currentUserName = "Gast";
    currentUserEmail = "";
    localStorage.setItem(MODE_KEY, "guest");
    localStorage.removeItem(LOGIN_FLAG_KEY);
    userStatus.textContent = "Lokaler Modus";
    updateProfileAvatar();
    updateListUI();
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

function loadLocalLists() {
    try {
        const data = localStorage.getItem(LOCAL_LISTS_KEY);
        const parsed = data ? JSON.parse(data) : null;
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function createList(name, subtitle = "", listTodos = []) {
    return {
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `list-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: name.trim(),
        subtitle: subtitle.trim(),
        todos: Array.isArray(listTodos) ? listTodos : []
    };
}

function initializeLists(storedLists, legacyTodos = []) {
    const hasLists = Array.isArray(storedLists) && storedLists.length > 0;
    lists = hasLists
        ? storedLists.map((list) => ({
            id: typeof list?.id === "string" && list.id ? list.id : createList("", "").id,
            name: typeof list?.name === "string" && list.name.trim() ? list.name.trim() : "Meine To-do Liste",
            subtitle: typeof list?.subtitle === "string" ? list.subtitle.trim() : "",
            todos: Array.isArray(list?.todos) ? list.todos : []
        }))
        : [createList("Meine To-do Liste", "Organisiert. Klar. Erledigt.", legacyTodos)];

    const storedActiveId = localStorage.getItem(ACTIVE_LIST_KEY);
    activeListId = lists.some((list) => list.id === storedActiveId) ? storedActiveId : lists[0].id;
    todos = getActiveList().todos;
    localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
    return !hasLists;
}

function getActiveList() {
    return lists.find((list) => list.id === activeListId) || lists[0] || null;
}

function setActiveTodos(nextTodos) {
    const activeList = getActiveList();
    if (!activeList) return;
    activeList.todos = nextTodos;
    todos = activeList.todos;
}

function selectList(id, shouldRender = true) {
    const nextList = lists.find((list) => list.id === id);
    if (!nextList) return;
    activeListId = nextList.id;
    todos = nextList.todos;
    localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
    updateListUI();
    if (shouldRender) renderTodos();
}

function switchList(direction) {
    if (lists.length < 2) return;
    const currentIndex = Math.max(0, lists.findIndex((list) => list.id === activeListId));
    selectList(lists[(currentIndex + direction + lists.length) % lists.length].id);
}

function updateListUI() {
    const activeList = getActiveList();
    if (!activeList) return;
    activeListName.textContent = activeList.name;
    activeListPickerName.textContent = activeList.name;
    activeListSubtitle.textContent = activeList.subtitle;
    activeListSubtitle.hidden = !activeList.subtitle;
    listIndicators.innerHTML = lists.map((list) => `<span class="${list.id === activeList.id ? "is-active" : ""}"></span>`).join("");
    previousList.disabled = lists.length < 2;
    nextList.disabled = lists.length < 2;
}

function openListDialog(list = null) {
    editingListId = list?.id || null;
    listDialogTitle.textContent = list ? "To-do-Liste bearbeiten" : "Neue To-do-Liste";
    saveListDialog.textContent = list ? "Speichern" : "Fertig";
    listNameField.value = list?.name || "";
    listSubtitleField.value = list?.subtitle || "";
    listDialogBackdrop.hidden = false;
    listDialog.classList.add("is-open");
    listDialog.setAttribute("aria-hidden", "false");
    listNameField.focus();
}

function closeListDialog() {
    if (!listDialog.classList.contains("is-open")) return;
    editingListId = null;
    listDialogBackdrop.hidden = true;
    listDialog.classList.remove("is-open");
    listDialog.setAttribute("aria-hidden", "true");
}

async function saveListDialogData() {
    const name = listNameField.value.trim();
    if (!name) {
        listNameField.focus();
        return;
    }
    const subtitle = listSubtitleField.value.trim();
    if (editingListId) {
        const list = lists.find((item) => item.id === editingListId);
        if (list) {
            list.name = name;
            list.subtitle = subtitle;
        }
    } else {
        const list = createList(name, subtitle);
        lists.push(list);
        selectList(list.id, false);
    }
    await saveTodos();
    updateListUI();
    closeListDialog();
    renderTodos();
    if (listPickerDialog.classList.contains("is-open")) renderListPicker();
}

function openListPickerDialog() {
    renderListPicker();
    listPickerBackdrop.hidden = false;
    listPickerDialog.classList.add("is-open");
    listPickerDialog.setAttribute("aria-hidden", "false");
}

function closeListPickerDialog() {
    if (!listPickerDialog.classList.contains("is-open")) return;
    listPickerBackdrop.hidden = true;
    listPickerDialog.classList.remove("is-open");
    listPickerDialog.setAttribute("aria-hidden", "true");
}

function renderListPicker() {
    listPicker.innerHTML = "";
    lists.forEach((list) => {
        const row = document.createElement("div");
        row.className = `list-picker__row${list.id === activeListId ? " is-active" : ""}`;
        const selectButton = document.createElement("button");
        selectButton.type = "button";
        selectButton.className = "list-picker__select";
        selectButton.innerHTML = `<strong>${escapeHtml(list.name)}</strong>${list.subtitle ? `<span>${escapeHtml(list.subtitle)}</span>` : ""}`;
        selectButton.addEventListener("click", () => {
            selectList(list.id);
            closeListPickerDialog();
        });
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "list-picker__icon";
        editButton.textContent = "✎";
        editButton.setAttribute("aria-label", `${list.name} bearbeiten`);
        editButton.addEventListener("click", () => {
            closeListPickerDialog();
            openListDialog(list);
        });
        row.append(selectButton, editButton);
        if (lists.length > 1) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "list-picker__icon list-picker__delete";
            deleteButton.textContent = "⌫";
            deleteButton.setAttribute("aria-label", `${list.name} löschen`);
            deleteButton.addEventListener("click", () => deleteList(list));
            row.appendChild(deleteButton);
        }
        listPicker.appendChild(row);
    });
}

async function deleteList(list) {
    if (lists.length <= 1 || !confirm(`Liste löschen?\n\nMöchtest du „${list.name}“ wirklich löschen?\nDie Liste und alle darin enthaltenen To-dos werden ebenfalls gelöscht.`)) return;
    const index = lists.findIndex((item) => item.id === list.id);
    lists.splice(index, 1);
    deletedTodos = deletedTodos.filter((todo) => todo.listId !== list.id);
    if (activeListId === list.id) selectList(lists[Math.max(0, index - 1)].id, false);
    await saveTodos();
    updateListUI();
    renderTodos();
    renderListPicker();
}

function loadLocalDeletedTodos() {
    try {
        const data = localStorage.getItem(LOCAL_DELETED_TODOS_KEY);
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
    isMobileProfileDetailOpen = !isPhoneLayout();
    profileBackdrop.hidden = false;
    profilePanel.classList.add("is-open");
    profilePanel.setAttribute("aria-hidden", "false");
    renderProfilePanel();
}

function closeProfilePanel() {
    isMobileProfileDetailOpen = false;
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
    profilePanel.classList.toggle("is-detail-active", !isPhoneLayout() || isMobileProfileDetailOpen);
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
            isMobileProfileDetailOpen = true;
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

    if (item.type === "deletedTodos") {
        const cleanedDeletedTodos = cleanDeletedTodos(deletedTodos);
        const deletedList = cleanedDeletedTodos.length
            ? cleanedDeletedTodos.map((todo, index) => `
                <li>
                    <span>${escapeHtml(todo.text)}${todo.listId ? ` <small>(${escapeHtml(lists.find((list) => list.id === todo.listId)?.name || "Entfernte Liste")})</small>` : ""}</span>
                    <button type="button" data-action="restore-todo" data-deleted-index="${index}">Wiederherstellen</button>
                </li>
            `).join("")
            : "<li>Keine gelöschten To-dos aus den letzten 30 Tagen.</li>";

        return `
            <div class="profile-item profile-item--deleted-todos">
                <span>${item.label}</span>
                <ul class="deleted-todo-list">${deletedList}</ul>
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
        case "restore-todo":
            await restoreDeletedTodo(Number(trigger?.dataset.deletedIndex));
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
            setActiveTodos(imported);
            await saveTodos();
            renderTodos();
        }
        return;
    }

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.lists)) {
            initializeLists(parsed.lists, []);
            await saveTodos();
            updateListUI();
            renderTodos();
        } else if (Array.isArray(parsed.todos)) {
            setActiveTodos(parsed.todos);
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
        lists,
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
    const completedTodos = todos.filter((todo) => todo.done);
    setActiveTodos(todos.filter((todo) => !todo.done));
    completedTodos.forEach((todo) => moveTodoToTrash(todo));
    await saveTodos();
    renderTodos();
}

async function resetAllData() {
    if (!confirm("Möchtest du wirklich alle lokalen Daten zurücksetzen?")) {
        return;
    }

    lists = [createList("Meine To-do Liste", "Organisiert. Klar. Erledigt.")];
    activeListId = lists[0].id;
    todos = lists[0].todos;
    deletedTodos = [];
    profileState = loadProfileSettings();
    localStorage.removeItem(LOCAL_TODOS_KEY);
    localStorage.removeItem(LOCAL_LISTS_KEY);
    localStorage.removeItem(ACTIVE_LIST_KEY);
    localStorage.removeItem(LOCAL_DELETED_TODOS_KEY);
    localStorage.removeItem(APP_SETTINGS_KEY);
    localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
    saveProfileSettings();
    await saveTodos();
    updateListUI();
    renderTodos();
    renderProfilePanel();
}

function isPhoneLayout() {
    return window.matchMedia("(max-width: 560px)").matches;
}

function closeTodoActionMenus() {
    document.querySelectorAll(".todo-actions.is-open").forEach((actions) => {
        actions.classList.remove("is-open");
        actions.querySelector(".todo-menu-button")?.setAttribute("aria-expanded", "false");
    });
}
function updateProfileAvatar() {
    const source = currentUserName || currentUserEmail || "Gast";
    profileAvatar.textContent = source.trim().charAt(0).toUpperCase() || "J";
}

async function saveTodos() {
    deletedTodos = cleanDeletedTodos(deletedTodos);
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
            lists,
            deletedTodos
        }, { merge: true });
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        return;
    }

    localStorage.setItem(LOCAL_LISTS_KEY, JSON.stringify(lists));
    localStorage.setItem(LOCAL_DELETED_TODOS_KEY, JSON.stringify(deletedTodos));
}

function cleanDeletedTodos(items) {
    const now = Date.now();
    return items.filter((todo) => {
        const deletedAt = new Date(todo.deletedAt).getTime();
        return todo.text && Number.isFinite(deletedAt) && now - deletedAt < DELETED_TODO_MAX_AGE;
    });
}

function moveTodoToTrash(todo) {
    deletedTodos.unshift({
        text: todo.text,
        done: Boolean(todo.done),
        listId: activeListId,
        deletedAt: new Date().toISOString()
    });
    deletedTodos = cleanDeletedTodos(deletedTodos);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function restoreDeletedTodo(index) {
    deletedTodos = cleanDeletedTodos(deletedTodos);
    const todo = deletedTodos[index];

    if (!todo) {
        renderProfilePanel();
        return;
    }

    const restoreList = lists.find((list) => list.id === todo.listId) || getActiveList();
    restoreList.todos.push({
        text: todo.text,
        done: Boolean(todo.done)
    });
    deletedTodos.splice(index, 1);
    await saveTodos();
    renderTodos();
    renderProfilePanel();
}

function renderTodos() {
    todoList.innerHTML = "";
    completedList.innerHTML = "";

    todos.forEach((todo, index) => {
        const todoItem = document.createElement("li");
        todoItem.dataset.todoIndex = String(index);
        const checkbox = document.createElement("input");
        const text = document.createElement("span");
        const actions = document.createElement("div");
        const menuButton = document.createElement("button");
        const actionMenu = document.createElement("div");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        checkbox.type = "checkbox";
        checkbox.checked = Boolean(todo.done);

        text.className = "todo-text";
        text.textContent = todo.text;

        actions.className = "todo-actions";

        menuButton.className = "todo-menu-button";
        menuButton.type = "button";
        menuButton.textContent = "⋮";
        menuButton.setAttribute("aria-label", "To-do Aktionen öffnen");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const isOpen = actions.classList.contains("is-open");
            closeTodoActionMenus();
            actions.classList.toggle("is-open", !isOpen);
            menuButton.setAttribute("aria-expanded", String(!isOpen));
        });

        actionMenu.className = "todo-action-menu";

        checkbox.addEventListener("change", async () => {
            todos[index].done = checkbox.checked;
            await saveTodos();
            renderTodos();
        });

        editButton.className = "edit-btn";
        editButton.type = "button";
        editButton.textContent = "Bearbeiten";
        editButton.addEventListener("click", () => {
            closeTodoActionMenus();
            openEditTodoDialog(index);
        });

        deleteButton.className = "delete-btn";
        deleteButton.type = "button";
        deleteButton.textContent = "Löschen";

        deleteButton.addEventListener("click", async () => {
            closeTodoActionMenus();
            if (!confirm("Möchtest du dieses To-do wirklich löschen?")) {
                return;
            }

            const [deletedTodo] = todos.splice(index, 1);
            moveTodoToTrash(deletedTodo);
            await saveTodos();
            renderTodos();
            renderProfilePanel();
        });

        actionMenu.append(editButton, deleteButton);
        actions.append(menuButton, actionMenu);
        todoItem.append(checkbox, text, actions);

        if (todo.done) {
            completedList.appendChild(todoItem);
        } else {
            todoList.appendChild(todoItem);
        }
    });
}

function loadSearchHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
        return Array.isArray(saved)
            ? saved.filter((entry) => typeof entry === "string" && entry.trim()).slice(0, 5)
            : [];
    } catch {
        return [];
    }
}

function addSearchHistory(query) {
    const term = query.trim();
    if (!term) return;
    const normalizedTerm = normalizeSearchTerm(term);
    searchHistory = [term, ...searchHistory.filter((entry) => normalizeSearchTerm(entry) !== normalizedTerm)].slice(0, 5);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
}

function removeSearchHistory(query) {
    const normalizedTerm = normalizeSearchTerm(query);
    searchHistory = searchHistory.filter((entry) => normalizeSearchTerm(entry) !== normalizedTerm);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    renderSearchPanel();
}

function normalizeSearchTerm(value) {
    return String(value).trim().toLocaleLowerCase("de-DE").replace(/\s+/g, "");
}

function closeSearchPanel() {
    searchPanel.hidden = true;
    searchField.setAttribute("aria-expanded", "false");
}

function openMobileSearch() {
    if (!isPhoneLayout()) {
        searchField.focus();
        return;
    }

    app.classList.add("is-mobile-search-open");
    search.classList.add("is-mobile-open");
    searchToggle.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
        searchField.focus();
        renderSearchPanel();
    });
}

function closeMobileSearch() {
    if (!search.classList.contains("is-mobile-open")) return;
    app.classList.remove("is-mobile-search-open");
    search.classList.remove("is-mobile-open");
    searchToggle.setAttribute("aria-expanded", "false");
    closeSearchPanel();
}

function renderSearchPanel() {
    const query = searchField.value.trim();
    searchPanel.innerHTML = "";
    searchPanel.hidden = false;
    searchField.setAttribute("aria-expanded", "true");

    if (!query) {
        renderSearchHistory();
        return;
    }

    const normalizedQuery = normalizeSearchTerm(query);
    const results = [];

    lists.forEach((list) => {
        if (normalizeSearchTerm(list.name).includes(normalizedQuery) || normalizeSearchTerm(list.subtitle).includes(normalizedQuery)) {
            results.push({ type: "list", list });
        }
    });

    lists.forEach((list) => {
        list.todos.forEach((todo, todoIndex) => {
            if (normalizeSearchTerm(todo.text).includes(normalizedQuery)) {
                results.push({ type: "todo", list, todo, todoIndex });
            }
        });
    });

    if (!results.length) {
        const empty = document.createElement("p");
        empty.className = "search__empty";
        empty.textContent = "Keine passenden To-dos oder Listen gefunden.";
        searchPanel.appendChild(empty);
        return;
    }

    results.forEach((result) => renderSearchResult(result));
}

function renderSearchHistory() {
    const heading = document.createElement("p");
    heading.className = "search__heading";
    heading.textContent = "Letzte Suchen";
    searchPanel.appendChild(heading);

    if (!searchHistory.length) {
        const empty = document.createElement("p");
        empty.className = "search__empty";
        empty.textContent = "Noch keine Suchanfragen.";
        searchPanel.appendChild(empty);
        return;
    }

    searchHistory.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "search__history-item";
        const icon = document.createElement("span");
        icon.className = "search__result-icon";
        icon.textContent = "⌕";
        const selectButton = document.createElement("button");
        selectButton.type = "button";
        selectButton.className = "search__history-select";
        selectButton.textContent = entry;
        selectButton.addEventListener("click", () => {
            searchField.value = entry;
            addSearchHistory(entry);
            renderSearchPanel();
            searchField.focus();
        });
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "search__remove-history";
        removeButton.textContent = "×";
        removeButton.setAttribute("aria-label", `Suchanfrage ${entry} entfernen`);
        removeButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            removeSearchHistory(entry);
            searchField.focus({ preventScroll: true });
        });
        row.append(icon, selectButton, removeButton);
        searchPanel.appendChild(row);
    });
}

function renderSearchResult(result) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search__result";
    const icon = document.createElement("span");
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    const subtitle = document.createElement("span");
    copy.className = "search__result-copy";

    if (result.type === "list") {
        icon.className = "search__result-icon search__result-icon--list";
        icon.textContent = "▤";
        title.textContent = result.list.name;
        subtitle.textContent = result.list.subtitle || "To-do-Liste";
        button.addEventListener("click", () => {
            selectList(result.list.id);
            clearSearch();
        });
    } else {
        icon.className = `search__result-icon${result.todo.done ? " search__result-icon--done" : ""}`;
        icon.textContent = result.todo.done ? "✓" : "";
        title.textContent = result.todo.text;
        subtitle.textContent = result.list.name;
        button.addEventListener("click", () => openSearchTodo(result.list.id, result.todoIndex));
    }

    copy.append(title, subtitle);
    button.append(icon, copy);
    searchPanel.appendChild(button);
}

function clearSearch() {
    searchField.value = "";
    closeSearchPanel();
}

function openSearchTodo(listId, todoIndex) {
    selectList(listId);
    clearSearch();
    requestAnimationFrame(() => {
        const todoItem = document.querySelector(`[data-todo-index="${todoIndex}"]`);
        if (!todoItem) return;
        todoItem.classList.remove("todo-highlight");
        void todoItem.offsetWidth;
        todoItem.classList.add("todo-highlight");
        todoItem.scrollIntoView({ behavior: "smooth", block: "center" });
    });
}

function openEditTodoDialog(index) {
    editingTodoIndex = index;
    editTodoField.value = todos[index]?.text || "";
    editTodoBackdrop.hidden = false;
    editTodoDialog.classList.add("is-open");
    editTodoDialog.setAttribute("aria-hidden", "false");
    editTodoField.focus();
    editTodoField.select();
}

function closeEditTodoDialog() {
    editingTodoIndex = null;
    editTodoBackdrop.hidden = true;
    editTodoDialog.classList.remove("is-open");
    editTodoDialog.setAttribute("aria-hidden", "true");
    editTodoField.value = "";
}

async function saveEditedTodo() {
    const nextText = editTodoField.value.trim();

    if (editingTodoIndex === null || !todos[editingTodoIndex]) {
        closeEditTodoDialog();
        return;
    }

    if (!nextText) {
        editTodoField.focus();
        return;
    }

    todos[editingTodoIndex].text = nextText;
    await saveTodos();
    closeEditTodoDialog();
    renderTodos();
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
