import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// =======================================================
// 🚨 TUS CLAVES DE FIREBASE (No las borres)
// =======================================================
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
    let draggedTaskId = null; // Para el Drag & Drop

    // --- TOASTS SARCÁSTICOS ---
    const showToast = (msg) => {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        c.appendChild(t); setTimeout(() => t.remove(), 4000);
    };

    // --- CONEXIÓN NUBE FIREBASE ---
    const Storage = {
        save: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/tasks'), tasks); },
        listen: () => {
            if(currentUser) onValue(ref(db, 'users/' + currentUser.uid + '/tasks'), (snapshot) => {
                tasks = snapshot.val() || []; UI.render(); 
            });
        }
    };

    // --- MODO DIOS: DRAG & DROP ---
    const dragStart = (e, id) => { draggedTaskId = id; e.target.classList.add('dragging'); e.dataTransfer.setData('text/plain', id); };
    const allowDrop = (e) => { e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.add('drag-over'); };
    const dragLeave = (e) => { const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); };
    const drop = (e, status) => {
        e.preventDefault();
        const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over');
        if(draggedTaskId) { moveTask(draggedTaskId, status); draggedTaskId = null; }
    };

    // --- LÁPIZ MÁGICO (EDICIÓN) ---
    const editTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const newTitle = prompt("Corrige el nombre de la tarea:", task.title);
        if (newTitle === null || newTitle.trim() === "") return;
        const newTime = prompt("Cambia el tiempo estimado (minutos):", task.time);
        if (newTime === null || isNaN(newTime) || newTime <= 0) return;
        
        task.title = newTitle.trim(); task.time = parseInt(newTime);
        Storage.save(); showToast("Tarea actualizada a la perfección. ✏️");
    };

    // --- RELOJ INMORTAL (Sincronizado con el Sistema) ---
    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id);
        if(!task) return;
        document.getElementById('focusTitle').textContent = task.title;
        document.getElementById('focusOverlay').classList.remove('hidden');
        
        const endTime = Date.now() + (task.time * 60 * 1000);
        
        const updateTimer = () => {
            const remaining = Math.round((endTime - Date.now()) / 1000);
            if (remaining <= 0) { 
                clearInterval(focusInterval); 
                document.getElementById('focusTimer').textContent = "00:00"; 
                alert('¡Tiempo terminado! Buen trabajo.'); 
                stopFocus(); return;
            }
            const m = Math.floor(remaining / 60); const s = remaining % 60;
            document.getElementById('focusTimer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };
        updateTimer();
        focusInterval = setInterval(updateTimer, 1000);
    };
    const stopFocus = () => { clearInterval(focusInterval); document.getElementById('focusOverlay').classList.add('hidden'); };

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

    const toggleComplete = (id) => { 
        const t = tasks.find(x => x.id === id); 
        if(t) { 
            t.completed = !t.completed; 
            Storage.save(); 
            if(t.completed) {
                showToast("¡Completada! 🎉");
                // 🎊 EXPLOSIÓN DE CONFETI
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#38bdf8', '#a855f7', '#10b981', '#f59e0b'] });
            } 
        } 
    };
    const deleteTask = (id) => { if(confirm('¿Destruir tarea?')) { tasks = tasks.filter(t => t.id !== id); Storage.save(); } };
    const moveTask = (id, newStatus) => { const t = tasks.find(x => x.id === id); if(t) { t.status = newStatus; Storage.save(); } };

        // --- NAVEGACIÓN Y EXPORTACIÓN ---
    const switchTab = (tab, btn) => {
        // 1. Apagamos y ocultamos TODAS a la fuerza
        document.querySelectorAll('.tab-content').forEach(t => {
            t.style.display = 'none'; 
            t.classList.add('hidden');
            t.classList.remove('active');
        });
        
        // 2. Encendemos y mostramos SOLO la elegida a la fuerza
        const pestanaActual = document.getElementById(`tab-${tab}`);
        if(pestanaActual) {
            pestanaActual.style.display = 'block'; // Esto anula cualquier error visual
            pestanaActual.classList.remove('hidden');
            pestanaActual.classList.add('active');
        }

        // 3. Iluminamos el botón del menú
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        
        // 4. Cargamos gráfico si es historial
        if(tab === 'historial') UI.renderChart();
    };
    const toggleTheme = () => {
        const html = document.documentElement; const btn = document.getElementById('themeToggle');
        if (html.getAttribute('data-theme') === 'dark') { html.removeAttribute('data-theme'); btn.textContent = '🌙 Modo Oscuro'; } 
        else { html.setAttribute('data-theme', 'dark'); btn.textContent = '☀️ Modo Claro'; }
    };

    const clearAllData = () => { if(confirm("⚠️ ¿Borrar TODA la base de datos de Google?")) { tasks = []; Storage.save(); showToast("Sistema formateado. 🗑️"); } };
    
    const exportData = () => {
        if(tasks.length === 0) { showToast("No hay datos para exportar. 📭"); return; }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
        const download = document.createElement('a'); download.setAttribute("href", dataStr); download.setAttribute("download", "smart_time_backup.json");
        document.body.appendChild(download); download.click(); download.remove();
        showToast("Datos descargados con éxito. 💾");
    };

    // --- RENDERIZADO VISUAL ---
    const UI = {
        updateStats: () => {
            if(tasks.length === 0) return;
            const completed = tasks.filter(t => t.completed); const c = completed.length;
            document.getElementById('progressFill').style.width = `${(c / tasks.length) * 100}%`;
            document.getElementById('statsNumbers').textContent = `${c}/${tasks.length} listas`;

            // GAMIFICACIÓN (Niveles)
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
                // Lista de Historial
                if (task.completed) {
                    g.history.innerHTML += `
                        <div class="history-item">
                            <div style="display:flex; flex-direction:column;">
                                <span style="text-decoration:line-through; color:var(--text-muted); font-weight:bold;">${task.title}</span>
                                <span style="font-size:0.75rem; color:var(--cta-green);">+${task.time} min de XP</span>
                            </div>
                            <button onclick="App.toggleComplete('${task.id}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;" title="Deshacer victoria">↩️</button>
                        </div>`;
                    return;
                }
                if (!task.status) task.status = 'bandeja';

                // Tarjeta Activa
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

                if (task.status === 'bandeja') { g.bandeja.appendChild(card); enBandeja++; }
                else if (task.status === 'later') g.later.appendChild(card);
                else if (task.status === 'week') g.week.appendChild(card);
                else if (task.status === 'today') g.today.appendChild(card);
            });
            document.getElementById('emptyState').classList.toggle('hidden', enBandeja > 0);
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

    // --- SIMULADOR IA HOLOGRÁFICO ---
    const askGemini = async () => {
        const aiCard = document.getElementById('aiResponseCard'); const aiText = document.getElementById('aiResponseText');
        const active = tasks.filter(t => (t.status === 'today' || t.status === 'week') && !t.completed);
        if(active.length === 0) { showToast("Tu pizarra está vacía. No me hagas perder el tiempo. 🤖"); return; }
        aiCard.classList.remove('hidden'); aiText.innerHTML = '<i>Analizando tu nivel de procrastinación... 🧠💭</i>';
        
        const consejos = [
            "Tu yo del futuro está llorando. Deja de mirar esta pantalla y empieza con la primera tarea de <b style='color:var(--danger-red)'>Hacer HOY</b>. 🔥",
            "Tienes <b>" + active.length + "</b> tareas pendientes. ¿Qué tal si enciendes el <b style='color:var(--accent-blue)'>Modo Focus</b>? ⏱️",
            "Si sigues posponiendo esto, terminarás trabajando el fin de semana. ¡A trabajar! 🤡"
        ];
        setTimeout(() => { aiText.innerHTML = consejos[Math.floor(Math.random() * consejos.length)]; showToast("Mensaje de la IA recibido. 📡"); }, 2500); 
    };

    // --- AUTENTICACIÓN GOOGLE ---
    const login = () => signInWithPopup(auth, provider).catch(console.error);
    const logout = () => signOut(auth).then(() => { tasks = []; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); });

    // --- INICIALIZACIÓN ---
    const init = () => {
        document.getElementById('taskForm').addEventListener('submit', addTask);
        document.getElementById('exitFocus').addEventListener('click', stopFocus);
        document.getElementById('googleLoginBtn').addEventListener('click', login);
         switchTab('bandeja', document.querySelector('.nav-btn.active'));
        // Filtro Mágico
        const tf = document.getElementById('timeFilter'); const cf = document.getElementById('clearFilter');
        tf.addEventListener('input', (e) => { const m = parseInt(e.target.value); if(m > 0) { cf.classList.remove('hidden'); UI.render(tasks.filter(t => t.time <= m)); } else { cf.classList.add('hidden'); UI.render(tasks); } });
        cf.addEventListener('click', () => { tf.value = ''; cf.classList.add('hidden'); UI.render(tasks); });

        // Vigía Google & Carga de Perfil
        onAuthStateChanged(auth, (user) => {
            if (user) { 
                currentUser = user; 
                if(document.getElementById('userName')) {
                    document.getElementById('userName').textContent = user.displayName || "Agente Secreto";
                    document.getElementById('userEmail').textContent = user.email;
                    document.getElementById('userPhoto').src = user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                }
                document.getElementById('loginScreen').classList.add('hidden'); 
                document.getElementById('mainDashboard').classList.remove('hidden'); 
                Storage.listen(); 
            } else { 
                currentUser = null; 
                document.getElementById('loginScreen').classList.remove('hidden'); 
                document.getElementById('mainDashboard').classList.add('hidden'); 
            }
        });
    };

    // Exportar las armas para el HTML
    return { init, toggleComplete, deleteTask, editTask, startFocus, moveTask, switchTab, toggleTheme, clearAllData, exportData, login, logout, askGemini, dragStart, allowDrop, dragLeave, drop };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', App.init);

// 🚀 REGISTRO DEL SERVICE WORKER (PARA PWA MÓVIL)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('Error PWA:', err));
    });
}
