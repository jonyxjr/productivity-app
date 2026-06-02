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

    const todoItem = document.createElement('li');
    const checkbox = document.createElement('input');
    const text = document.createElement('span');
    const deleteButton = document.createElement('button');

    checkbox.type = 'checkbox';
    text.className = 'todo-text';
    text.textContent = todoText;
    deleteButton.className = 'delete-btn';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Löschen';

    deleteButton.addEventListener('click', function () {
        const shouldDelete = confirm('Möchtest du dieses To-do wirklich löschen?');

        if (shouldDelete) {
            todoItem.remove();
        }
    });

    todoItem.append(checkbox, text, deleteButton);
    todoList.appendChild(todoItem);
    todoField.value = '';
    todoField.focus();
}

todoField.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        addTodo();
    }
});
