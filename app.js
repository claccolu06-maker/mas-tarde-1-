/**
 * Smart-Time Hub | Team A - CLOUD VERSION
 * Firebase Auth & Realtime Database Integrados
 */

// 1. IMPORTAR LIBRERÍAS DE FIREBASE DESDE INTERNET
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 2. TU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCz45FGoqkYt9BS4J1_UjkBu6gSTHp0QOU",
  authDomain: "smart-time-hub.firebaseapp.com",
  databaseURL: "https://smart-time-hub-default-rtdb.firebaseio.com",
  projectId: "smart-time-hub",
  storageBucket: "smart-time-hub.firebasestorage.app",
  messagingSenderId: "462409089",
  appId: "1:462409089:web:672735cbfc6d891eb92c80",
  measurementId: "G-1V8B1VTTBH"
};

// 3. INICIALIZAR LA NUBE
const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getDatabase(appFirebase);
const provider = new GoogleAuthProvider();

let currentUser = null; // Guardará quién está conectado

// ==========================================
// EL MOTOR DE LA APLICACIÓN (CÓDIGO ANTERIOR REESCRITO PARA LA NUBE)
// ==========================================

const App = (() => {
    let tasks = [];
    let focusInterval;
    let myChart = null;

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

    // --- NUEVO: SISTEMA DE GUARDADO EN FIREBASE ---
    const Storage = {
        save: () => {
            if(!currentUser) return;
            // Sube el array de tareas directamente a la ruta del usuario
            set(ref(db, 'users/' + currentUser.uid + '/tasks'), tasks);
        },
        listen: () => {
            if(!currentUser) return;
            // Escucha cambios en tiempo real desde la nube
            const tasksRef = ref(db, 'users/' + currentUser.uid + '/tasks');
            onValue(tasksRef, (snapshot) => {
                const data = snapshot.val();
                tasks = data ? data : []; // Si hay datos los carga, si no, array vacío
                UI.render(); // Redibuja la pantalla mágicamente
            });
        }
    };

    // LÓGICA DE TAREAS (CRUD)
    const addTask = (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now().toString(),
            url: document.getElementById('urlInput').value,
            title: document.getElementById('titleInput').value,
            category: document.getElementById('categoryInput').value,
            time: parseInt(document.getElementById('timeInput').value),
            completed: false,
            status: 'bandeja',
            createdAt: new Date().toISOString()
        };
        tasks.unshift(newTask);
        Storage.save();
        form.reset();
    };

    const toggleComplete = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) { task.completed = !task.completed; Storage.save(); }
    };

    const deleteTask = (id) => {
        if(confirm('¿Borrar tarea para siempre?')) {
            tasks = tasks.filter(t => t.id !== id);
            Storage.save();
        }
    };

    const moveTask = (id, newStatus) => {
        const task = tasks.find(t => t.id === id);
        if (task) { task.status = newStatus; Storage.save(); }
    };

    // --- SISTEMA DE LOGIN Y NAVEGACIÓN ---
    const login = () => {
        signInWithPopup(auth, provider).catch((error) => {
            console.error("Error al iniciar sesión", error);
            alert("Hubo un error al iniciar sesión con Google.");
        });
    };

    const logout = () => {
        signOut(auth).then(() => {
            tasks = []; // Vaciamos la memoria
            document.getElementById('mainDashboard').classList.add('hidden');
            document.getElementById('loginScreen').classList.remove('hidden');
        });
    };

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
            if (timeLeft <= 0) { clearInterval(focusInterval); focusTimer.textContent = "00:00"; alert('¡Tiempo terminado!'); }
            timeLeft--;
        }, 1000);
    };

    const stopFocus = () => { clearInterval(focusInterval); focusOverlay.classList.add('hidden'); };

    const switchTab = (tabName, btnElement) => {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden'); tab.classList.remove('active');
        });
        const selectedTab = document.getElementById(`tab-${tabName}`);
        if(selectedTab) { selectedTab.classList.remove('hidden'); selectedTab.classList.add('active'); }
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
    };

    // UI RENDER (Acortado para ahorrar espacio, incluye tu código previo)
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
                if (task.completed) return;
                if (!task.status) task.status = 'bandeja';

                const card = document.createElement('div');
                card.className = `task-card`;
                if (task.status !== 'bandeja') card.classList.add('kanban-card');

                const selectHTML = `<select class="kanban-select" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${task.status === 'bandeja' ? 'selected' : ''}>📥 Bandeja</option>
                        <option value="later" ${task.status === 'later' ? 'selected' : ''}>⏳ Algún día</option>
                        <option value="week" ${task.status === 'week' ? 'selected' : ''}>📅 Esta Semana</option>
                        <option value="today" ${task.status === 'today' ? 'selected' : ''}>🔥 Hacer HOY</option>
                    </select>`;

                card.innerHTML = `<div class="card-header"><span class="pill ${task.category}">${task.category}</span><span class="time-badge">⏱ ${task.time} min</span></div>
                    <h4>${task.title}</h4>${selectHTML}
                    <div class="card-actions" style="margin-top: 10px;">
                        <button class="btn-icon btn-play" onclick="App.startFocus('${task.id}')">▶</button>
                        <button class="btn-icon btn-link" onclick="window.open('${task.url}', '_blank')">🔗</button>
                        <button class="btn-icon btn-done" onclick="App.toggleComplete('${task.id}')">✓</button>
                        <button class="btn-icon btn-delete" onclick="App.deleteTask('${task.id}')">🗑</button>
                    </div>`;

                if (task.status === 'bandeja' && tasksGrid) { tasksGrid.appendChild(card); tareasEnBandeja++; }
                else if (task.status === 'later' && colLater) colLater.appendChild(card);
                else if (task.status === 'week' && colWeek) colWeek.appendChild(card);
                else if (task.status === 'today' && colToday) colToday.appendChild(card);
            });

            if(emptyState && tasksGrid) {
                if (tareasEnBandeja === 0) { emptyState.classList.remove('hidden'); tasksGrid.classList.add('hidden'); }
                else { emptyState.classList.add('hidden'); tasksGrid.classList.remove('hidden'); }
            }
            UI.updateStats();
            UI.renderHistory();
            UI.renderChart();
        },
        renderHistory: () => {
            const historyList = document.getElementById('historyList');
            if(!historyList) return;
            historyList.innerHTML = '';
            const completedTasks = tasks.filter(t => t.completed);
            if(completedTasks.length === 0) { historyList.innerHTML = '<p style="text-align: center;">Aún no hay tareas completadas.</p>'; return; }
            completedTasks.forEach(task => {
                historyList.innerHTML += `<div class="history-item"><span class="history-item-title">${task.title}</span><div style="display:flex; align-items:center; gap: 10px;"><span class="pill ${task.category}" style="font-size: 0.65rem;">${task.category}</span><button class="btn-icon btn-link" style="padding: 2px 8px; font-size:0.8rem;" onclick="App.toggleComplete('${task.id}')">↩️</button></div></div>`;
            });
        },
        renderChart: () => {
            const ctx = document.getElementById('statsChart');
            if(!ctx) return;
            const completedTasks = tasks.filter(t => t.completed);
            if(myChart) myChart.destroy();
            if(completedTasks.length === 0) { ctx.style.display = 'none'; return; }
            else { ctx.style.display = 'block'; }

            const dataCounts = [
                completedTasks.filter(t => t.category === 'video').length,
                completedTasks.filter(t => t.category === 'articulo').length,
                completedTasks.filter(t => t.category === 'curso').length,
                completedTasks.filter(t => t.category === 'proyecto').length
            ];

            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['Videos', 'Artículos', 'Cursos', 'Proyectos'], datasets: [{ data: dataCounts, backgroundColor: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }, cutout: '70%' }
            });
        }
    };

    const handleFilter = (e) => {
        const maxTime = parseInt(e.target.value);
        if (maxTime > 0) {
            if(clearFilter) clearFilter.classList.remove('hidden');
            UI.render(tasks.filter(task => task.time <= maxTime));
        } else {
            if(clearFilter) clearFilter.classList.add('hidden');
            UI.render(tasks);
        }
    };

    // INIT
    const init = () => {
        if(form) form.addEventListener('submit', addTask);
        if(timeFilter) timeFilter.addEventListener('input', handleFilter);
        if(clearFilter) clearFilter.addEventListener('click', () => { timeFilter.value = ''; clearFilter.classList.add('hidden'); UI.render(tasks); });
        if(exitFocusBtn) exitFocusBtn.addEventListener('click', stopFocus);
        if(themeBtn) {
            themeBtn.addEventListener('click', () => {
                const html = document.documentElement;
                const isDark = html.getAttribute('data-theme') === 'dark';
                html.setAttribute('data-theme', isDark ? 'light' : 'dark');
                themeBtn.textContent = isDark ? '🌙 Oscuro' : '☀️ Claro';
            });
        }
        
        // Listener del Botón de Login
        document.getElementById('googleLoginBtn').addEventListener('click', login);

        // VIGILANTE DE AUTENTICACIÓN FIREBASE
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // USUARIO LOGUEADO
                currentUser = user;
                document.getElementById('loginScreen').classList.add('hidden');
                document.getElementById('mainDashboard').classList.remove('hidden');
                Storage.listen(); // Descarga los datos de su cuenta
            } else {
                // USUARIO DESLOGUEADO
                currentUser = null;
                document.getElementById('loginScreen').classList.remove('hidden');
                document.getElementById('mainDashboard').classList.add('hidden');
            }
        });
    };

    // Función de Gemini IA (Mantengo la que pusimos antes)
    const askGemini = async () => {
        const API_KEY = 'AQUI_VA_TU_CLAVE_SECRETA_QUE_COPIASTE'; 
        const aiCard = document.getElementById('aiResponseCard');
        const aiText = document.getElementById('aiResponseText');
        const aiBtn = document.getElementById('askAIBtn');
        const activeTasks = tasks.filter(t => (t.status === 'today' || t.status === 'week') && !t.completed);
        
        if(activeTasks.length === 0) { alert("Tu pizarra está vacía."); return; }
        aiCard.classList.remove('hidden');
        aiText.innerHTML = '<i>Pensando... 🧠💭</i>';
        aiBtn.disabled = true;

        const tasksList = activeTasks.map(t => `- ${t.title} (${t.time} min)`).join('\n');
        const prompt = `Eres un experto coach de productividad. Analiza esta lista de tareas pendientes del usuario:\n${tasksList}\n\nEscribe un consejo motivador y directo diciéndole por qué tarea empezar.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) throw new Error('Fallo en la conexión');
            const data = await response.json();
            aiText.innerHTML = data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        } catch (error) {
            aiText.innerHTML = '❌ Hubo un error de conexión con la IA.';
        } finally { aiBtn.disabled = false; }
    };

    return { init, toggleComplete, deleteTask, startFocus, switchTab, moveTask, login, logout, askGemini };
})();

// HACER GLOBAL PARA QUE EL HTML LO PUEDA LLAMAR (Requisito de módulos)
window.App = App;

document.addEventListener('DOMContentLoaded', App.init);
