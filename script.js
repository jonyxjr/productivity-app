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

let todos = [];
let appMode = "locked";

init();

function init() {
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
        showLogin();
    });

    todoField.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            addTodo();
        }
    });
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
    localStorage.setItem(LOGIN_FLAG_KEY, "true");
    localStorage.setItem(MODE_KEY, "online");

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            todos = Array.isArray(data.todos) ? data.todos : [];
            userStatus.textContent = data.username ? `Cloud-Modus: ${data.username}` : "Cloud-Modus";
        } else {
            todos = [];
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

    renderTodos();
    showApp();
}

function startGuestMode() {
    appMode = "guest";
    todos = loadLocalTodos();
    localStorage.setItem(MODE_KEY, "guest");
    localStorage.removeItem(LOGIN_FLAG_KEY);
    userStatus.textContent = "Lokaler Modus";
    renderTodos();
    showApp();
}

function showLogin(message = "") {
    appMode = "locked";
    app.hidden = true;
    authShell.hidden = false;
    todoField.value = "";
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

async function saveTodos() {
    if (appMode === "online") {
        const user = auth.currentUser;

        if (!user) {
            showLogin("Bitte melde dich erneut an.");
            return;
        }

        await setDoc(doc(db, "users", user.uid), {
            todos
        }, { merge: true });
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

window.openChangelog = function() {
    document.querySelector(".changelog-content").classList.add("is-open");
};

window.closeChangelog = function() {
    document.querySelector(".changelog-content").classList.remove("is-open");
};
