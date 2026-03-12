/**
 * Smart-Time Hub | Team A - Master File
 * Sprint 1, 2 y 3: SPA, Kanban, Focus Mode & Analytics
 */

const App = (() => {
    // 1. STATE (Estado de la App)
    let tasks = [];
    let focusInterval;
    let myChart = null; // Variable para guardar el gráfico

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
    const themeBtn = document.getElementById('themeToggle');

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
        if(confirm('¿Seguro que quieres borrar esto de tu sistema?')) {
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
                alert('¡Tiempo terminado! Gran trabajo.');
            }
            timeLeft--;
        }, 1000);
    };

    const stopFocus = () => {
        clearInterval(focusInterval);
        focusOverlay.classList.add('hidden');
    };
        // --- AJUSTES: EXPORTAR DATOS ---
    const exportData = () => {
        if(tasks.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        // Creamos un archivo descargable con todo tu LocalStorage
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "smart_time_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // --- AJUSTES: BORRAR TODO ---
    const clearAllData = () => {
        if(confirm('🚨 ¡ATENCIÓN! Vas a borrar TODAS tus tareas y el historial para siempre. ¿Estás absolutamente seguro?')) {
            tasks = []; // Vaciamos el array
            Storage.save(); // Guardamos el array vacío
            UI.render(); // Actualizamos la pantalla
            alert('Sistema formateado correctamente. ¡Un nuevo comienzo!');
        }
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

    // 5. UI & RENDER MODULE
    const UI = {
        updateStats: () => {
            if(tasks.length === 0) return;
            const completed = tasks.filter(t => t.completed).length;
            const percentage = (completed / tasks.length) * 100;
            if(progressFill) progressFill.style.width = `${percentage}%`;
            if(statsNumbers) statsNumbers.textContent = `${completed}/${tasks.length} completadas`;
            if(statsMessage) statsMessage.textContent = percentage === 100 ? '¡Todo limpio! 🏆' : '¡Sigue así! 💪';
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
                // MAGIA: Si la tarea está completada, NO la dibujamos aquí.
                if (task.completed) return;

                if (!task.status) task.status = 'bandeja';

                const card = document.createElement('div');
                card.className = `task-card`;
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
                        <button class="btn-icon btn-done" onclick="App.toggleComplete('${task.id}')" title="Completar">✓</button>
                        <button class="btn-icon btn-delete" onclick="App.deleteTask('${task.id}')" title="Borrar">🗑</button>
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
            
            // Actualizar las otras pantallas
            UI.updateStats();
            UI.renderHistory();
            UI.renderChart();
        },

        renderHistory: () => {
            const historyList = document.getElementById('historyList');
            if(!historyList) return;
            
            historyList.innerHTML = '';
            const completedTasks = tasks.filter(t => t.completed);
            
            if(completedTasks.length === 0) {
                historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">Aún no has completado ninguna tarea. ¡A trabajar!</p>';
                return;
            }

            completedTasks.forEach(task => {
                historyList.innerHTML += `
                    <div class="history-item">
                        <span class="history-item-title">${task.title}</span>
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span class="pill ${task.category}" style="font-size: 0.65rem;">${task.category}</span>
                            <button class="btn-icon btn-link" style="padding: 2px 8px; font-size:0.8rem;" onclick="App.toggleComplete('${task.id}')" title="Deshacer">↩️</button>
                        </div>
                    </div>
                `;
            });
        },

        renderChart: () => {
            const ctx = document.getElementById('statsChart');
            if(!ctx) return;

            const completedTasks = tasks.filter(t => t.completed);
            
            if(myChart) myChart.destroy();

            if(completedTasks.length === 0) {
                ctx.style.display = 'none';
                return;
            } else {
                ctx.style.display = 'block';
            }

            const dataCounts = [
                completedTasks.filter(t => t.category === 'video').length,
                completedTasks.filter(t => t.category === 'articulo').length,
                completedTasks.filter(t => t.category === 'curso').length,
                completedTasks.filter(t => t.category === 'proyecto').length
            ];

            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Videos', 'Artículos', 'Cursos', 'Proyectos'],
                    datasets: [{
                        data: dataCounts,
                        backgroundColor: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Poppins' } } } },
                    cutout: '70%'
                }
            });
        }
    };

    const handleFilter = (e) => {
        const maxTime = parseInt(e.target.value);
        if (maxTime > 0) {
            if(clearFilter) clearFilter.classList.remove('hidden');
            const filtered = tasks.filter(task => task.time <= maxTime);
            UI.render(filtered);
        } else {
            if(clearFilter) clearFilter.classList.add('hidden');
            UI.render(tasks);
        }
    };

    // 6. INIT
    const init = () => {
        Storage.load();
        
        // Listeners
        if(form) form.addEventListener('submit', addTask);
        if(timeFilter) timeFilter.addEventListener('input', handleFilter);
        if(clearFilter) clearFilter.addEventListener('click', () => {
            timeFilter.value = '';
            clearFilter.classList.add('hidden');
            UI.render(tasks);
        });
        if(exitFocusBtn) exitFocusBtn.addEventListener('click', stopFocus);

        // Tema Claro/Oscuro
        if(themeBtn) {
            themeBtn.addEventListener('click', () => {
                const html = document.documentElement;
                const isDark = html.getAttribute('data-theme') === 'dark';
                html.setAttribute('data-theme', isDark ? 'light' : 'dark');
                themeBtn.textContent = isDark ? '🌙 Oscuro' : '☀️ Claro';
            });
        }

        UI.render();
    };

    // EXPORTAR AL HTML
      return { init, toggleComplete, deleteTask, startFocus, switchTab, moveTask, exportData, clearAllData };

})();

document.addEventListener('DOMContentLoaded', App.init);

