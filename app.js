/**
 * Smart-Time Hub | Core Application Logic
 * Arquitectura modular en Vanilla JS.
 */

const App = (() => {
    // 1. STATE MANAGEMENT (Estado de la App)
    let tasks = [];

    // 2. DOM ELEMENTS
    const form = document.getElementById('taskForm');
    const tasksGrid = document.getElementById('tasksGrid');
    const emptyState = document.getElementById('emptyState');
    const themeToggle = document.getElementById('themeToggle');
    const progressFill = document.getElementById('progressFill');
    const statsMessage = document.getElementById('statsMessage');
    const statsNumbers = document.getElementById('statsNumbers');
    const nudgeMessage = document.getElementById('nudgeMessage');

    // 3. STORAGE MODULE
    const Storage = {
        save: () => localStorage.setItem('smartTasks', JSON.stringify(tasks)),
        load: () => {
            const saved = localStorage.getItem('smartTasks');
            tasks = saved ? JSON.parse(saved) : [];
        }
    };

    // 4. LOGIC MODULE (CRUD)
    const addTask = (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now().toString(),
            url: document.getElementById('urlInput').value,
            title: document.getElementById('titleInput').value,
            category: document.getElementById('categoryInput').value,
            time: document.getElementById('timeInput').value,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.unshift(newTask); // Añadir al principio
        Storage.save();
        form.reset();
        UI.render();
    };

    const toggleComplete = (id) => {
        const task = tasks.find(t => t.id === id);
        task.completed = !task.completed;
        Storage.save();
        UI.render();
    };

    const deleteTask = (id) => {
        // Confirmación elegante (nativo pero funcional para MVP)
        if(confirm('¿Estás seguro de eliminar esto de tu backlog?')) {
            tasks = tasks.filter(t => t.id !== id);
            Storage.save();
            UI.render();
        }
    };

    // 5. UI & RENDER MODULE
    const UI = {
        updateStats: () => {
            if(tasks.length === 0) {
                progressFill.style.width = '0%';
                statsMessage.textContent = '¡Añade tu primera tarea!';
                statsNumbers.textContent = '0/0';
                return;
            }

            const completedTasks = tasks.filter(t => t.completed).length;
            const percentage = (completedTasks / tasks.length) * 100;
            
            progressFill.style.width = `${percentage}%`;
            statsNumbers.textContent = `${completedTasks}/${tasks.length} completadas`;

            // Micro-copy dinámico (Gamificación)
            if (percentage === 0) statsMessage.textContent = '¡Vamos a por el día!';
            else if (percentage < 50) statsMessage.textContent = 'Buen comienzo. ¡Sigue así! 💪';
            else if (percentage < 100) statsMessage.textContent = '¡Ya casi lo tienes! 🔥';
            else statsMessage.textContent = '¡Increíble! Has limpiado tu backlog 🏆';
        },

        checkOldTasks: () => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const hasOldTasks = tasks.some(t => new Date(t.createdAt) < thirtyDaysAgo && !t.completed);
            
            if(hasOldTasks) nudgeMessage.classList.remove('hidden');
            else nudgeMessage.classList.add('hidden');
        },

        render: () => {
            tasksGrid.innerHTML = '';
            
            if (tasks.length === 0) {
                emptyState.classList.remove('hidden');
                tasksGrid.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                tasksGrid.classList.remove('hidden');

                tasks.forEach(task => {
                    const card = document.createElement('div');
                    card.className = `task-card ${task.completed ? 'completed' : ''}`;
                    card.innerHTML = `
                        <div class="card-header">
                            <span class="pill ${task.category}">${task.category}</span>
                            <span class="time-badge">⏱ ${task.time} min</span>
                        </div>
                        <h4>${task.title}</h4>
                        <div class="card-actions">
                            <button class="btn-icon btn-link" onclick="window.open('${task.url}', '_blank')">Abrir 🔗</button>
                            <button class="btn-icon btn-done" onclick="App.toggleComplete('${task.id}')">
                                ${task.completed ? 'Deshacer' : '¡Hecho! ✓'}
                            </button>
                            <button class="btn-icon btn-delete" onclick="App.deleteTask('${task.id}')">🗑</button>
                        </div>
                    `;
                    tasksGrid.appendChild(card);
                });
            }
            UI.updateStats();
            UI.checkOldTasks();
        }
    };

    // 6. THEME SWITCHER
    const toggleTheme = () => {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        themeToggle.textContent = isDark ? '🌙 Oscuro' : '☀️ Claro';
        localStorage.setItem('smartTheme', newTheme);
    };

    // 7. INITIALIZATION
    const init = () => {
        Storage.load();
        
        // Cargar tema guardado
        const savedTheme = localStorage.getItem('smartTheme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.textContent = savedTheme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';

        // Event Listeners
        form.addEventListener('submit', addTask);
        themeToggle.addEventListener('click', toggleTheme);
        
        UI.render();
    };

    // Exponer métodos necesarios para el HTML (onclick events)
    return { init, toggleComplete, deleteTask };
})();

// Iniciar la aplicación cuando cargue el DOM
document.addEventListener('DOMContentLoaded', App.init);