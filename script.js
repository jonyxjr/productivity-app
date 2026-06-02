const todoField = document.getElementById('todoField');
const todoList = document.getElementById('todoList');

// Beim Start: Todos aus dem Local Storage laden
let todos = loadTodos();

// Liest die gespeicherten Todos aus dem Local Storage 
function loadTodos() {
    const data = localStorage.getItem('todos');
    // Gibt es gespeicherte Daten ? -> Text zurück in Array umwandeln
    // Gibt es keine? -> leeres Array zurückgeben
    return data ? JSON.parse(data) : [];
}

// Speichert die aktuelle todos-Arry im Local Storage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function addTodo() {
    const todoText = todoField.value.trim();

    if (todoText === '') {
        todoField.focus();
        return;
    }

    // Neues Objekt ins Arry einfügen
    todos.push({ text: todoText, done: false });

    saveTodos(); // <- immer nach jeder Änderung speichern
    renderTodos(); // <- HTML-Liste neu aufbauen 

    todoField.value = '';
    todoField.focus();
}

// Löscht die HTML-Liste und baut sie komplett neu aus dem todos-Array auf
function renderTodos() {
    todoList.innerHTML = ''; // Alle bestehenden Listenelemente entfernen

    todos.forEach(function (todo, index) {
        const todoItem = document.createElement('li');
        const checkbox = document.createElement('input');
        const text = document.createElement('span');
        const deleteButton = document.createElement('button');

        checkbox.type = 'checkbox';
        checkbox.checked = todo.done; // gespeicherten Haken-Status wiederherstellen

        text.className = 'todo-text';
        text.textContent = todo.text;

        //Checkbox: Status im Array sperichern wenn geklickt 
        checkbox.addEventListener('change', function () {
            todos[index].done = checkbox.checked;
            saveTodos(); // <- Status sofort speichern
        });

        deleteButton.className = 'delete-btn';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Löschen';

        deleteButton.addEventListener('click', function() {
            if (confirm('Möchtest du dieses To-do wirklich löschen?')) {
                todos.splice(index, 1); // 1 Element an Position index entfernen
                saveTodos();
                renderTodos();
            }
        });

        todoItem.append(checkbox, text, deleteButton);
        todoList.appendChild(todoItem);
    });
}

// Seite lädt  -> gespeicherte Todos sofort anzeigen
renderTodos();

todoField.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        addTodo();
    }
});

function openChangelog() {
    document.querySelector('.changelog-content').classList.add('is-open');
}

function closeChangelog() {
    document.querySelector('.changelog-content').classList.remove('is-open');
}
