/**
 * Smart-Time Hub | Team A
 * Sprint 1 & 2: Dashboard SPA + Kanban Pizarra
 */

const App = (() => {
    // 1. STATE (Estado de la App)
    let tasks = [];
    let focusInterval;

    // 2. DOM ELEMENTS
    const form = document.getElementById('taskForm');
    const timeFilter = document.getElementById('timeFilter');
    const clearFilter = document.getElementById('clearFilter');
    const focusOverlay = document.getElementById('focusOverlay');
    const focusTitle = document.getElementById('focusTitle');
    const focusTimer = document.getElementById('focusTimer');
    const exitFocusBtn = document.getElementById('exitFocus');
    const progressFill = document.getElementById('progressFill');
    const statsMessage = document.getElementById('statsMessage');
    const statsNumbers = document.getElementById('statsNumbers');

    // 3. STORAGE
    const Storage = {
        save: () => localStorage.setItem('smartTasks', JSON.stringify(tasks)),
        load: () => {
            const saved = localStorage.getItem('smartTasks');
            tasks = saved ? JSON.parse(saved) : [];
        }
    };

    // 4. LOGIC MODULE
    const addTask = (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now().toString(),
            url: document.getElementById('urlInput').value,
            title: document.getElementById('titleInput').value,
            category: document.getElementById('categoryInput').value,
            time: parseInt(document.getElementById('timeInput').value),
            completed: false,
            status: 'bandeja', // Empieza siempre en la bandeja
            createdAt: new Date().toISOString()
        };
        tasks.unshift(newTask);
        Storage.save();
        form.reset();
        UI.render();
    };

    const toggleComplete = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            Storage.save();
            UI.render();
        }
    };

    const deleteTask = (id) => {
        if(confirm('¿Seguro que quieres borrar esto?')) {
            tasks = tasks.filter(t => t.id !== id);
            Storage.save();
            UI.render();
        }
    };

    const moveTask = (id, newStatus) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.status = newStatus;
            Storage.save();
            UI.render();
        }
    };

    // --- MODO FOCUS ---
    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id);
        if(!task) return;

        focusTitle.textContent = task.title;
        focusOverlay.classList.remove('hidden');
        
        let timeLeft = task.time * 60;
        focusInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            focusTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(focusInterval);
                focusTimer.textContent = "00:00";
                alert('¡Tiempo terminado!');
            }
            timeLeft--;
        }, 1000);
    };

    const stopFocus = () => {
        clearInterval(focusInterval);
        focusOverlay.classList.add('hidden');
    };

    // --- NAVEGACIÓN SPA ---
    const switchTab = (tabName, btnElement) => {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
            tab.classList.remove('active');
        });
        
        const selectedTab = document.getElementById(`tab-${tabName}`);
        if(selectedTab) {
            selectedTab.classList.remove('hidden');
            selectedTab.classList.add('active');
        }

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if(btnElement) btnElement.classList.add('active');
    };

    // 5. UI & RENDER
    const UI = {
        updateStats: () => {
            if(tasks.length === 0) return;
            const completed = tasks.filter(t => t.completed).length;
            const percentage = (completed / tasks.length) * 100;
            progressFill.style.width = `${percentage}%`;
            statsNumbers.textContent = `${completed}/${tasks.length} completadas`;
            statsMessage.textContent = percentage === 100 ? '¡Todo limpio! 🏆' : '¡Sigue así! 💪';
        },

        render: (filteredTasks = tasks) => {
            const tasksGrid = document.getElementById('tasksGrid');
            const emptyState = document.getElementById('emptyState');
            const colLater = document.getElementById('column-later');
            const colWeek = document.getElementById('column-week');
            const colToday = document.getElementById('column-today');

            if(tasksGrid) tasksGrid.innerHTML = '';
            if(colLater) colLater.innerHTML = '';
            if(colWeek) colWeek.innerHTML = '';
            if(colToday) colToday.innerHTML = '';

            let tareasEnBandeja = 0;

            filteredTasks.forEach(task => {
                if (!task.status) task.status = 'bandeja';

                const card = document.createElement('div');
                card.className = `task-card ${task.completed ? 'completed' : ''}`;
                if (task.status !== 'bandeja') card.classList.add('kanban-card');

                const selectHTML = `
                    <select class="kanban-select" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${task.status === 'bandeja' ? 'selected' : ''}>📥 Bandeja</option>
                        <option value="later" ${task.status === 'later' ? 'selected' : ''}>⏳ Algún día</option>
                        <option value="week" ${task.status === 'week' ? 'selected' : ''}>📅 Esta Semana</option>
                        <option value="today" ${task.status === 'today' ? 'selected' : ''}>🔥 Hacer HOY</option>
                    </select>
                `;

                card.innerHTML = `
                    <div class="card-header">
                        <span class="pill ${task.category}">${task.category}</span>
                        <span class="time-badge">⏱ ${task.time} min</span>
                    </div>
                    <h4>${task.title}</h4>
                    ${selectHTML}
                    <div class="card-actions" style="margin-top: 10px;">
                        <button class="btn-icon btn-play" onclick="App.startFocus('${task.id}')" title="Modo Zen">▶</button>
                        <button class="btn-icon btn-link" onclick="window.open('${task.url}', '_blank')">🔗</button>
                        <button class="btn-icon btn-done" onclick="App.toggleComplete('${task.id}')">✓</button>
                        <button class="btn-icon btn-delete" onclick="App.deleteTask('${task.id}')">🗑</button>
                    </div>
                `;

                if (task.status === 'bandeja' && tasksGrid) {
                    tasksGrid.appendChild(card);
                    tareasEnBandeja++;
                } else if (task.status === 'later' && colLater) {
                    colLater.appendChild(card);
                } else if (task.status === 'week' && colWeek) {
                    colWeek.appendChild(card);
                } else if (task.status === 'today' && colToday) {
                    colToday.appendChild(card);
                }
            });

            if(emptyState && tasksGrid) {
                if (tareasEnBandeja === 0) {
                    emptyState.classList.remove('hidden');
                    tasksGrid.classList.add('hidden');
                } else {
                    emptyState.classList.add('hidden');
                    tasksGrid.classList.remove('hidden');
                }
            }
            UI.updateStats();
        }
    };

    const handleFilter = (e) => {
        const maxTime = parseInt(e.target.value);
        if (maxTime > 0) {
            clearFilter.classList.remove('hidden');
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
        
        if(form) form.addEventListener('submit', addTask);
        if(timeFilter) timeFilter.addEventListener('input', handleFilter);
        if(clearFilter) clearFilter.addEventListener('click', () => {
            timeFilter.value = '';
            clearFilter.classList.add('hidden');
            UI.render(tasks);
        });
        if(exitFocusBtn) exitFocusBtn.addEventListener('click', stopFocus);

        UI.render();
    };

    // EXPORTAR FUNCIONES AL HTML
    return { init, toggleComplete, deleteTask, startFocus, switchTab, moveTask };

})();

document.addEventListener('DOMContentLoaded', App.init);
