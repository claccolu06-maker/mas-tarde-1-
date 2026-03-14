import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 🚨 RECUERDA: Si cambiaste de llaves de Firebase, pégalas aquí.
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

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getDatabase(appFirebase);
const provider = new GoogleAuthProvider();

let currentUser = null;

const App = (() => {
    let tasks = [];
    let focusInterval;
    let myChart = null;

    // --- SISTEMA DE TOASTS SARCÁSTICOS ---
    const showToast = (message) => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    // --- CONEXIÓN CON LA NUBE FIREBASE ---
    const Storage = {
        save: () => {
            if(!currentUser) return;
            set(ref(db, 'users/' + currentUser.uid + '/tasks'), tasks);
        },
        listen: () => {
            if(!currentUser) return;
            onValue(ref(db, 'users/' + currentUser.uid + '/tasks'), (snapshot) => {
                const data = snapshot.val();
                tasks = data ? data : []; 
                UI.render(); 
            });
        }
    };

    // --- LÓGICA DE TAREAS ---
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
        document.getElementById('taskForm').reset();
        showToast("Tarea guardada. A ver si es verdad que la haces... 👀");
    };

    const toggleComplete = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) { 
            task.completed = !task.completed; 
            Storage.save(); 
            if(task.completed) showToast("¡Milagro! ¡Completaste algo! 🎉");
        }
    };

    const deleteTask = (id) => {
        if(confirm('¿Borrar tarea para siempre?')) {
            tasks = tasks.filter(t => t.id !== id);
            Storage.save();
        }
    };

    const moveTask = (id, newStatus) => {
        const task = tasks.find(t => t.id === id);
        if (task) { 
            task.status = newStatus; 
            Storage.save(); 
            if(newStatus === 'later') showToast("Ah, 'Algún día'... el cementerio de las intenciones. 🤡");
            else if (newStatus === 'today') showToast("Más te vale cumplir con esto HOY. ⏱️");
        }
    };

    // --- NAVEGACIÓN Y TEMA ---
    const switchTab = (tabName, btnElement) => {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        
        if(tabName === 'historial') UI.renderChart(); // Actualiza el gráfico al entrar
    };

    const toggleTheme = () => {
        const html = document.documentElement;
        const btn = document.getElementById('themeToggle');
        if (html.getAttribute('data-theme') === 'dark') {
            html.removeAttribute('data-theme');
            btn.textContent = '🌙 Modo Oscuro';
        } else {
            html.setAttribute('data-theme', 'dark');
            btn.textContent = '☀️ Modo Claro';
        }
    };

    // --- MODO FOCUS ---
    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id);
        if(!task) return;
        document.getElementById('focusTitle').textContent = task.title;
        document.getElementById('focusOverlay').classList.remove('hidden');
        let timeLeft = task.time * 60;
        
        focusInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            document.getElementById('focusTimer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            if (timeLeft <= 0) { 
                clearInterval(focusInterval); 
                document.getElementById('focusTimer').textContent = "00:00"; 
                alert('¡Tiempo terminado! Buen trabajo.'); 
                stopFocus();
            }
            timeLeft--;
        }, 1000);
    };

    const stopFocus = () => { 
        clearInterval(focusInterval); 
        document.getElementById('focusOverlay').classList.add('hidden'); 
    };

    // --- AJUSTES ---
    const clearAllData = () => {
        if(confirm("⚠️ ¿Estás seguro? Esto borrará TODA tu base de datos en la nube de Google.")) {
            tasks = [];
            Storage.save();
            showToast("Sistema formateado. Empiezas desde cero. 🗑️");
        }
    };

    // --- RENDERIZADO VISUAL ---
    const UI = {
        updateStats: () => {
            if(tasks.length === 0) return;
            const completed = tasks.filter(t => t.completed).length;
            const percentage = (completed / tasks.length) * 100;
            document.getElementById('progressFill').style.width = `${percentage}%`;
            document.getElementById('statsNumbers').textContent = `${completed}/${tasks.length} completadas`;
            document.getElementById('statsMessage').textContent = percentage === 100 ? '¡Todo limpio! 🏆' : '¡Sigue así! 💪';
        },
        render: (filteredTasks = tasks) => {
            const grids = {
                bandeja: document.getElementById('tasksGrid'),
                later: document.getElementById('column-later'),
                week: document.getElementById('column-week'),
                today: document.getElementById('column-today'),
                history: document.getElementById('historyList')
            };

            Object.values(grids).forEach(el => { if(el) el.innerHTML = ''; });
            let enBandeja = 0;

            filteredTasks.forEach(task => {
                if (task.completed) {
                    grids.history.innerHTML += `
                        <div class="kanban-card" style="border-left-color: var(--cta-green); padding: 10px;">
                            <span style="text-decoration: line-through; color: var(--text-muted);">${task.title}</span>
                            <button onclick="App.toggleComplete('${task.id}')" style="float: right; background: none; border: none; cursor:pointer;" title="Deshacer">↩️</button>
                        </div>`;
                    return;
                }

                if (!task.status) task.status = 'bandeja';

                const card = document.createElement('div');
                card.className = `kanban-card`;

                const selectHTML = `<select style="margin: 10px 0; background: var(--input-bg); color: var(--text-main); border: 1px solid var(--border-color); padding: 5px; border-radius: 5px;" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${task.status === 'bandeja' ? 'selected' : ''}>📥 Bandeja</option>
                        <option value="later" ${task.status === 'later' ? 'selected' : ''}>⏳ Algún día</option>
                        <option value="week" ${task.status === 'week' ? 'selected' : ''}>📅 Esta Semana</option>
                        <option value="today" ${task.status === 'today' ? 'selected' : ''}>🔥 Hacer HOY</option>
                    </select>`;

                card.innerHTML = `
                    <div style="font-size:0.8rem; margin-bottom: 5px; font-weight: bold;" class="pill ${task.category}">${task.category.toUpperCase()} | ⏱ ${task.time}m</div>
                    <h4 style="margin: 0; font-size: 1rem;">${task.title}</h4>${selectHTML}
                    <div style="display:flex; justify-content:space-between; margin-top: 10px;">
                        <button class="btn-icon" style="color:var(--accent-blue);" onclick="App.startFocus('${task.id}')" title="Modo Focus">▶️</button>
                        ${task.url ? `<a href="${task.url}" target="_blank" class="btn-icon" style="text-decoration: none;" title="Abrir Enlace">🔗</a>` : ''}
                        <button class="btn-icon" style="color:var(--cta-green);" onclick="App.toggleComplete('${task.id}')" title="Completar">✔️</button>
                        <button class="btn-icon" style="color:var(--danger-red);" onclick="App.deleteTask('${task.id}')" title="Borrar">🗑</button>
                    </div>`;

                if (task.status === 'bandeja') { grids.bandeja.appendChild(card); enBandeja++; }
                else if (task.status === 'later') grids.later.appendChild(card);
                else if (task.status === 'week') grids.week.appendChild(card);
                else if (task.status === 'today') grids.today.appendChild(card);
            });

            document.getElementById('emptyState').classList.toggle('hidden', enBandeja > 0);
            UI.updateStats();
        },
        renderChart: () => {
            const ctx = document.getElementById('statsChart');
            if(!ctx) return;
            const comp = tasks.filter(t => t.completed);
            if(myChart) myChart.destroy();
            if(comp.length === 0) return;

            const counts = ['video', 'articulo', 'curso', 'proyecto'].map(cat => comp.filter(t => t.category === cat).length);
            const fontColor = document.documentElement.getAttribute('data-theme') === 'dark' ? 'white' : 'black';

            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['Videos', 'Artículos', 'Cursos', 'Proyectos'], datasets: [{ data: counts, backgroundColor: ['#a855f7', '#38bdf8', '#10b981', '#f59e0b'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: fontColor } } } }
            });
        }
    };

    // --- FILTRO MÁGICO DE TIEMPO ---
    const handleFilter = (e) => {
        const maxTime = parseInt(e.target.value);
        const clearBtn = document.getElementById('clearFilter');
        if (maxTime > 0) {
            clearBtn.classList.remove('hidden');
            UI.render(tasks.filter(task => task.time <= maxTime));
        } else {
            clearBtn.classList.add('hidden');
            UI.render(tasks);
        }
    };

    // --- GEMINI IA ---
    const askGemini = async () => {
        const API_KEY = 'AQUI_VA_TU_CLAVE_DE_GEMINI'; // 🚨 RECUERDA PONER TU CLAVE
        const aiCard = document.getElementById('aiResponseCard');
        const aiText = document.getElementById('aiResponseText');
        const active = tasks.filter(t => (t.status === 'today' || t.status === 'week') && !t.completed);
        
        if(active.length === 0) { showToast("Tu pizarra está vacía. No molestes a la IA. 🤖"); return; }
        aiCard.classList.remove('hidden');
        aiText.innerHTML = '<i>Pensando... 🧠💭</i>';

        const tasksList = active.map(t => `- ${t.title} (${t.time} min)`).join('\n');
        const prompt = `Eres un coach de productividad sarcástico. Analiza esta lista de tareas:\n${tasksList}\n\nDile por qué tarea empezar hoy y regáñalo sutilmente por procrastinar.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            aiText.innerHTML = data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--accent-blue)">$1</b>');
        } catch (error) { aiText.innerHTML = '❌ La IA también está procrastinando (Fallo de conexión).'; } 
    };

    // --- AUTH ---
    const login = () => signInWithPopup(auth, provider).catch(console.error);
    const logout = () => signOut(auth).then(() => {
        tasks = []; 
        document.getElementById('mainDashboard').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
    });

    // --- INICIALIZADOR ---
    const init = () => {
        document.getElementById('taskForm').addEventListener('submit', addTask);
        document.getElementById('exitFocus').addEventListener('click', stopFocus);
        document.getElementById('googleLoginBtn').addEventListener('click', login);
        
        const timeFilter = document.getElementById('timeFilter');
        const clearFilter = document.getElementById('clearFilter');
        timeFilter.addEventListener('input', handleFilter);
        clearFilter.addEventListener('click', () => { timeFilter.value = ''; clearFilter.classList.add('hidden'); UI.render(tasks); });

        // Vigía de Google
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                document.getElementById('loginScreen').classList.add('hidden');
                document.getElementById('mainDashboard').classList.remove('hidden');
                Storage.listen(); // Descarga los datos mágicamente
            } else {
                currentUser = null;
                document.getElementById('loginScreen').classList.remove('hidden');
                document.getElementById('mainDashboard').classList.add('hidden');
            }
        });
    };

    return { init, toggleComplete, deleteTask, startFocus, moveTask, switchTab, toggleTheme, clearAllData, login, logout, askGemini };
})();

// HACERLO GLOBAL PARA EL HTML
window.App = App;
document.addEventListener('DOMContentLoaded', App.init);
