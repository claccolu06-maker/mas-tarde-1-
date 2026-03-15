import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 🚨 TUS CLAVES DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCz45FGoqkYt9BS4J1_UjkBu6gSTHp0QOU",
  authDomain: "smart-time-hub.firebaseapp.com",
  databaseURL: "https://smart-time-hub-default-rtdb.firebaseio.com",
  projectId: "smart-time-hub",
  storageBucket: "smart-time-hub.firebasestorage.app",
  messagingSenderId: "462409089",
  appId: "1:462409089:web:672735cbfc6d891eb92c80"
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
    let draggedTaskId = null; 

    // --- TOASTS ---
    const showToast = (msg) => {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        c.appendChild(t); setTimeout(() => t.remove(), 4000);
    };

    // --- CONEXIÓN NUBE FIREBASE (CON ESCUDO ANTI-BUGS) ---
    const Storage = {
        save: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/tasks'), tasks); },
        listen: () => {
            if(currentUser) {
                onValue(ref(db, 'users/' + currentUser.uid + '/tasks'), (snapshot) => {
                    const data = snapshot.val();
                    // Escudo: Firebase a veces rompe los Arrays. Esto lo repara automáticamente.
                    if (!data) tasks = [];
                    else if (Array.isArray(data)) tasks = data;
                    else tasks = Object.values(data);
                    
                    UI.render(); 
                });
            }
        }
    };

    // --- NAVEGACIÓN A PRUEBA DE BALAS ---
    const switchTab = (tab, btn) => {
        // 1. Limpiamos TODA la basura de las clases (hidden y active)
        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(t => {
            t.classList.remove('active');
            t.classList.remove('hidden'); // Eliminamos el veneno
            t.style.display = 'none'; // Las forzamos a desaparecer
        });
        
        // 2. Encendemos a la fuerza la que elegiste
        const targetTab = document.getElementById(`tab-${tab}`);
        if(targetTab) {
            targetTab.classList.add('active');
            targetTab.style.display = 'block'; // La forzamos a aparecer
        }

        // 3. Colores de los botones
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        
        if(tab === 'historial') UI.renderChart();
    };

    // --- DRAG & DROP ---
    const dragStart = (e, id) => { draggedTaskId = id; e.target.classList.add('dragging'); e.dataTransfer.setData('text/plain', id); };
    const allowDrop = (e) => { e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.add('drag-over'); };
    const dragLeave = (e) => { const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); };
    const drop = (e, status) => {
        e.preventDefault();
        const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over');
        if(draggedTaskId) { moveTask(draggedTaskId, status); draggedTaskId = null; }
    };

    // --- LÓGICA DE TAREAS ---
    const addTask = (e) => {
        e.preventDefault();
        tasks.unshift({
            id: Date.now().toString(), url: document.getElementById('urlInput').value,
            title: document.getElementById('titleInput').value, category: document.getElementById('categoryInput').value,
            time: parseInt(document.getElementById('timeInput').value), completed: false, status: 'bandeja'
        });
        Storage.save(); document.getElementById('taskForm').reset(); showToast("Añadida. ¡A trabajar! 👀");
    };

    const editTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const newTitle = prompt("Corrige el nombre de la tarea:", task.title);
        if (newTitle === null || newTitle.trim() === "") return;
        const newTime = prompt("Cambia el tiempo estimado (minutos):", task.time);
        if (newTime === null || isNaN(newTime) || newTime <= 0) return;
        task.title = newTitle.trim(); task.time = parseInt(newTime);
        Storage.save(); showToast("Tarea actualizada. ✏️");
    };

    const toggleComplete = (id) => { 
        const t = tasks.find(x => x.id === id); 
        if(t) { 
            t.completed = !t.completed; Storage.save(); 
            if(t.completed) {
                showToast("¡Completada! 🎉");
                if (typeof confetti === "function") confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#38bdf8', '#a855f7', '#10b981', '#f59e0b'] });
            } 
        } 
    };
    const deleteTask = (id) => { if(confirm('¿Destruir tarea?')) { tasks = tasks.filter(t => t.id !== id); Storage.save(); } };
    const moveTask = (id, newStatus) => { const t = tasks.find(x => x.id === id); if(t) { t.status = newStatus; Storage.save(); } };

    // --- RELOJ ---
    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id);
        if(!task) return;
        document.getElementById('focusTitle').textContent = task.title;
        document.getElementById('focusOverlay').classList.remove('hidden');
        const endTime = Date.now() + (task.time * 60 * 1000);
        
        const updateTimer = () => {
            const remaining = Math.round((endTime - Date.now()) / 1000);
            if (remaining <= 0) { 
                clearInterval(focusInterval); document.getElementById('focusTimer').textContent = "00:00"; 
                alert('¡Tiempo terminado!'); stopFocus(); return;
            }
            document.getElementById('focusTimer').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
        };
        updateTimer(); focusInterval = setInterval(updateTimer, 1000);
    };
    const stopFocus = () => { clearInterval(focusInterval); document.getElementById('focusOverlay').classList.add('hidden'); };

    // --- RENDERIZADO VISUAL ---
    const UI = {
        updateStats: () => {
            if(tasks.length === 0) return;
            const completed = tasks.filter(t => t.completed); const c = completed.length;
            if(document.getElementById('progressFill')) document.getElementById('progressFill').style.width = `${(c / tasks.length) * 100}%`;
            if(document.getElementById('statsNumbers')) document.getElementById('statsNumbers').textContent = `${c}/${tasks.length} listas`;

            const totalMins = completed.reduce((sum, task) => sum + (task.time || 0), 0);
            if(document.getElementById('totalMinutes')) {
                document.getElementById('totalMinutes').textContent = `${totalMins} min`;
                document.getElementById('totalCompleted').textContent = `${c}`;
                let level = "Novato 🌱"; let color = "#94a3b8"; 
                if(totalMins >= 30)  { level = "Aprendiz 📘"; color = "#38bdf8"; } 
                if(totalMins >= 120) { level = "Guerrero ⚔️"; color = "#a855f7"; } 
                if(totalMins >= 500) { level = "Maestro 👑"; color = "#f59e0b"; } 
                const levelEl = document.getElementById('userLevel'); levelEl.innerHTML = level; levelEl.style.color = color;
            }
        },
        render: () => {
            const g = { bandeja: document.getElementById('tasksGrid'), later: document.getElementById('column-later'), week: document.getElementById('column-week'), today: document.getElementById('column-today'), history: document.getElementById('historyList') };
            Object.values(g).forEach(el => { if(el) el.innerHTML = ''; });
            let enBandeja = 0;

            tasks.forEach(task => {
                if (task.completed) {
                    if(g.history) g.history.innerHTML += `
                        <div class="history-item">
                            <div style="display:flex; flex-direction:column;">
                                <span style="text-decoration:line-through; color:var(--text-muted); font-weight:bold;">${task.title}</span>
                                <span style="font-size:0.75rem; color:var(--cta-green);">+${task.time} min de XP</span>
                            </div>
                            <button onclick="App.toggleComplete('${task.id}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">↩️</button>
                        </div>`;
                    return;
                }
                if (!task.status) task.status = 'bandeja';

                const card = document.createElement('div'); card.className = `kanban-card`;
                card.draggable = true; card.ondragstart = (e) => App.dragStart(e, task.id); card.ondragend = (e) => e.target.classList.remove('dragging');

                card.innerHTML = `
                    <div style="font-size:0.8rem; margin-bottom: 5px; font-weight:bold;" class="pill ${task.category}">${task.category.toUpperCase()} | ⏱ ${task.time}m</div>
                    <h4 style="margin: 0; font-size: 1rem;">${task.title}</h4>
                    <select style="margin:10px 0; width:100%; padding:5px; border-radius:5px; background:var(--input-bg); color:var(--text-main)" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${task.status === 'bandeja'?'selected':''}>📥 Bandeja</option><option value="later" ${task.status === 'later'?'selected':''}>⏳ Algún día</option><option value="week" ${task.status === 'week'?'selected':''}>📅 Esta Semana</option><option value="today" ${task.status === 'today'?'selected':''}>🔥 Hacer HOY</option>
                    </select>
                    <div style="display:flex; justify-content:space-between; margin-top: 10px;">
                        <button style="background:none;border:none;cursor:pointer;color:var(--accent-blue);" onclick="App.startFocus('${task.id}')">▶️ Focus</button>
                        <button style="background:none;border:none;cursor:pointer;color:#f59e0b;" onclick="App.editTask('${task.id}')">✏️</button>
                        <button style="background:none;border:none;cursor:pointer;color:var(--cta-green);" onclick="App.toggleComplete('${task.id}')">✔️</button>
                        <button style="background:none;border:none;cursor:pointer;color:var(--danger-red);" onclick="App.deleteTask('${task.id}')">🗑</button>
                    </div>`;

                if (task.status === 'bandeja') { if(g.bandeja) g.bandeja.appendChild(card); enBandeja++; }
                else if (task.status === 'later') { if(g.later) g.later.appendChild(card); }
                else if (task.status === 'week') { if(g.week) g.week.appendChild(card); }
                else if (task.status === 'today') { if(g.today) g.today.appendChild(card); }
            });
            if(document.getElementById('emptyState')) document.getElementById('emptyState').classList.toggle('hidden', enBandeja > 0);
            UI.updateStats();
        },
        renderChart: () => {
            const ctx = document.getElementById('statsChart'); if(!ctx) return;
            const comp = tasks.filter(t => t.completed); if(myChart) myChart.destroy();
            const counts = ['video', 'articulo', 'curso', 'proyecto'].map(c => comp.filter(t => t.category === c).length);
            const fontColor = document.documentElement.getAttribute('data-theme') === 'dark' ? 'white' : 'black';
            myChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Videos', 'Artículos', 'Cursos', 'Proyectos'], datasets: [{ data: counts, backgroundColor: ['#a855f7', '#38bdf8', '#10b981', '#f59e0b'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: fontColor } } } }});
        }
    };

    // --- EXTRAS ---
    const askGemini = async () => {
        const aiCard = document.getElementById('aiResponseCard'); const aiText = document.getElementById('aiResponseText');
        const active = tasks.filter(t => (t.status === 'today' || t.status === 'week') && !t.completed);
        if(active.length === 0) { showToast("Tu pizarra está vacía. 🤖"); return; }
        aiCard.classList.remove('hidden'); aiText.innerHTML = '<i>Analizando... 🧠</i>';
        const msg = ["Deja de procrastinar y ataca 'Hacer HOY'. 🔥", "Enciende el Modo Focus. ⏱️", "Trabaja ahora o llora el fin de semana. 🤡"];
        setTimeout(() => { aiText.innerHTML = msg[Math.floor(Math.random() * msg.length)]; }, 2000); 
    };

    const toggleTheme = () => {
        const html = document.documentElement; const btn = document.getElementById('themeToggle');
        if (html.getAttribute('data-theme') === 'dark') { html.removeAttribute('data-theme'); btn.textContent = '🌙 Modo Oscuro'; } 
        else { html.setAttribute('data-theme', 'dark'); btn.textContent = '☀️ Modo Claro'; }
    };

    const clearAllData = () => { if(confirm("⚠️ ¿Borrar TODA la base de datos?")) { tasks = []; Storage.save(); showToast("Formateado. 🗑️"); } };
    const exportData = () => {
        if(tasks.length===0) return;
        const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
        a.download = "backup.json"; document.body.appendChild(a); a.click(); a.remove();
    };

    const login = () => signInWithPopup(auth, provider).catch(console.error);
    const logout = () => signOut(auth).then(() => { tasks = []; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); });

    const init = () => {
        if(document.getElementById('taskForm')) document.getElementById('taskForm').addEventListener('submit', addTask);
        if(document.getElementById('exitFocus')) document.getElementById('exitFocus').addEventListener('click', stopFocus);
        if(document.getElementById('googleLoginBtn')) document.getElementById('googleLoginBtn').addEventListener('click', login);
        
        onAuthStateChanged(auth, (user) => {
            if (user) { 
                currentUser = user; 
                if(document.getElementById('userName')) {
                    document.getElementById('userName').textContent = user.displayName || "Agente";
                    document.getElementById('userEmail').textContent = user.email;
                    document.getElementById('userPhoto').src = user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                }
                document.getElementById('loginScreen').classList.add('hidden'); 
                document.getElementById('mainDashboard').classList.remove('hidden'); 
                
                // Forzamos que la Bandeja se muestre al entrar
                switchTab('bandeja', document.querySelector('.nav-btn.active'));

                Storage.listen(); 
            } else { 
                currentUser = null; 
                document.getElementById('loginScreen').classList.remove('hidden'); 
                document.getElementById('mainDashboard').classList.add('hidden'); 
            }
        });
    };

    return { init, toggleComplete, deleteTask, editTask, startFocus, moveTask, switchTab, toggleTheme, clearAllData, exportData, login, logout, askGemini, dragStart, allowDrop, dragLeave, drop };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', App.init);

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(e=>e); }); }
