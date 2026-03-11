/**
 * Smart-Time Hub | Core Application Logic
 * Sprint 1: Filtro Mágico + Focus Mode Integrado
 */

const App = (() => {
    // 1. STATE (Estado)
    let tasks = [];
    let focusInterval; // Guarda el temporizador

    // 2. DOM ELEMENTS
    const form = document.getElementById('taskForm');
    const tasksGrid = document.getElementById('tasksGrid');
    const emptyState = document.getElementById('emptyState');
    const themeToggle = document.getElementById('themeToggle');
    const progressFill = document.getElementById('progressFill');
    const statsMessage = document.getElementById('statsMessage');
    const statsNumbers = document.getElementById('statsNumbers');
    
    // Elementos del Sprint 1
    const timeFilter = document.getElementById('timeFilter');
    const clearFilter = document.getElementById('clearFilter');
    const focusOverlay = document.getElementById('focusOverlay');
    const focusTitle = document.getElementById('focusTitle');
    const focusTimer = document.getElementById('focusTimer');
    const exitFocusBtn = document.getElementById('exitFocus');

    // 3. STORAGE
    const Storage = {
        save: () => localStorage.setItem('smartTasks', JSON.stringify(tasks)),
        load: () => {
            const saved = localStorage.getItem('smartTasks');
            tasks = saved ? JSON.parse(saved) : [];
        }
    };

    // 4. LOGIC (CRUD & SPRINT 1)
    const addTask = (e) => {
        e.preventDefault();
                const newTask = {
            id: Date.now().toString(),
            url: document.getElementById('urlInput').value,
            title: document.getElementById('titleInput').value,
            category: document.getElementById('categoryInput').value,
            time: parseInt(document.getElementById('timeInput').value),
            completed: false,
            status: 'bandeja', // <--- ¡LA MAGIA NUEVA!
            createdAt: new Date().toISOString()
        };
        tasks.unshift(newTask);
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
        if(confirm('¿Seguro que quieres borrar esto?')) {
            tasks = tasks.filter(t => t.id !== id);
            Storage.save();
            UI.render();
        }
    };

    // --- MAGIA DEL SPRINT 1: MODO FOCUS ---
    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id);
        if(!task) return;

        // Preparamos la pantalla
        focusTitle.textContent = task.title;
        focusOverlay.classList.remove('hidden');
        
        let timeLeft = task.time * 60; // Convertimos minutos a segundos

        // Función que se repite cada 1 segundo (1000 ms)
        focusInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            // Formateamos para que siempre tenga 2 dígitos (ej: 09:05)
            focusTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(focusInterval);
                focusTimer.textContent = "00:00";
                alert('¡Tiempo terminado! Gran trabajo.');
            }
            timeLeft--;
        }, 1000);
    };

    const stopFocus = () => {
        clearInterval(focusInterval); // Detenemos el reloj
        focusOverlay.classList.add('hidden'); // Ocultamos la pantalla
    };

    // 5. UI & RENDER
          // --- SISTEMA DE NAVEGACIÓN SPA (CORREGIDO) ---
    const switchTab = (tabName, btnElement) => {
        // 1. Ocultar todas las pestañas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
            tab.classList.remove('active');
        });
        
        // 2. Mostrar solo la pestaña seleccionada
        const selectedTab = document.getElementById(`tab-${tabName}`);
        selectedTab.classList.remove('hidden');
        selectedTab.classList.add('active');

        // 3. Quitar el color azul de todos los botones
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 4. Poner el color azul solo al botón clickeado
        if(btnElement) {
            btnElement.classList.add('active');
        }
    };
    const UI = {
        updateStats: () => {
            if(tasks.length === 0) return;
            const completed = tasks.filter(t => t.completed).length;
            const percentage = (completed / tasks.length) * 100;
            progressFill.style.width = `${percentage}%`;
            statsNumbers.textContent = `${completed}/${tasks.length} completadas`;
            statsMessage.textContent = percentage === 100 ? '¡Backlog limpio! 🏆' : '¡Sigue así! 💪';
        },

        // Modificamos el render para aceptar un array filtrado (Sprint 1)
        render: (filteredTasks = tasks) => {
            tasksGrid.innerHTML = '';
            
            if (filteredTasks.length === 0) {
                emptyState.classList.remove('hidden');
                tasksGrid.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                tasksGrid.classList.remove('hidden');

                filteredTasks.forEach(task => {
                    const card = document.createElement('div');
                    card.className = `task-card ${task.completed ? 'completed' : ''}`;
                    // Hemos añadido el botón "▶ Focus" al HTML de la tarjeta
                    card.innerHTML = `
                        <div class="card-header">
                            <span class="pill ${task.category}">${task.category}</span>
                            <span class="time-badge">⏱ ${task.time} min</span>
                        </div>
                        <h4>${task.title}</h4>
                        <div class="card-actions">
                            <button class="btn-icon btn-play" onclick="App.startFocus('${task.id}')" title="Modo Zen">▶ Focus</button>
                            <button class="btn-icon btn-link" onclick="window.open('${task.url}', '_blank')">🔗</button>
                            <button class="btn-icon btn-done" onclick="App.toggleComplete('${task.id}')">✓</button>
                            <button class="btn-icon btn-delete" onclick="App.deleteTask('${task.id}')">🗑</button>
                        </div>
                    `;
                    tasksGrid.appendChild(card);
                });
            }
            UI.updateStats();
        }
    };

    // --- MAGIA DEL SPRINT 1: EVENTOS DEL FILTRO ---
    const handleFilter = (e) => {
        const maxTime = parseInt(e.target.value);
        if (maxTime > 0) {
            clearFilter.classList.remove('hidden');
            // Aquí está el filtro mágico:
            const filtered = tasks.filter(task => task.time <= maxTime && !task.completed);
            UI.render(filtered);
        } else {
            clearFilter.classList.add('hidden');
            UI.render(tasks);
        }
    };

     // 6. INIT
    const init = () => {
        Storage.load();
        
        // Listeners del Formulario
        form.addEventListener('submit', addTask);
        
        // Listeners del Sprint 1 (Filtro Mágico)
        timeFilter.addEventListener('input', handleFilter);
        clearFilter.addEventListener('click', () => {
            timeFilter.value = '';
            clearFilter.classList.add('hidden');
            UI.render(tasks);
        });
        exitFocusBtn.addEventListener('click', stopFocus);

        UI.render();
    };

    // ¡ESTE ES EL RETURN! Debe estar justo antes de los símbolos })();
    return { init, toggleComplete, deleteTask, startFocus, switchTab };

})(); // <-- ESTA LÍNEA CIERRA EL MÓDULO APP.

// Iniciar la aplicación cuando cargue el DOM (Esto va afuera)
document.addEventListener('DOMContentLoaded', App.init);

