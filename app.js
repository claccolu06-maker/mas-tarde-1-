import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 🚨 PON TUS LLAVES DE FIREBASE AQUÍ
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
    let draggedTaskId = null; // Memoria del Modo Dios

    const showToast = (msg) => {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        c.appendChild(t); setTimeout(() => t.remove(), 4000);
    };

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

    // --- SISTEMA DE EDICIÓN MÁGICA ---
    const editTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const newTitle = prompt("Corrige el nombre de la tarea:", task.title);
        if (newTitle === null || newTitle.trim() === "") return;

        const newTime = prompt("Cambia el tiempo estimado (minutos):", task.time);
        if (newTime === null || isNaN(newTime) || newTime <= 0) return;

        task.title = newTitle.trim();
        task.time = parseInt(newTime);
        Storage.save();
        showToast("Tarea actualizada a la perfección. ✏️");
    };

    // --- RELOJ INMORTAL (Focus Mode) ---
    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id);
        if(!task) return;
        document.getElementById('focusTitle').textContent = task.title;
        document.getElementById('focusOverlay').classList.remove('hidden');
        
        // Calculamos el Final Basado en el Reloj Global del Sistema
        const endTime = Date.now() + (task.time * 60 * 1000);
        
        const updateTimer = () => {
            const remaining = Math.round((endTime - Date.now()) / 1000);
            
            if (remaining <= 0) { 
                clearInterval(focusInterval); 
                document.getElementById('focusTimer').textContent = "00:00"; 
                alert('¡Tiempo terminado! El sistema te saluda.'); 
                stopFocus(); return;
            }
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            document.getElementById('focusTimer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        updateTimer(); // Ejecutar al instante
        focusInterval = setInterval(updateTimer, 1000); // Ejecutar cada segundo
    };
    const stopFocus = () => { clearInterval(focusInterval); document.getElementById('focusOverlay').classList.add('hidden'); };

    // --- CRUD Y DEMÁS LOGICA ---
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
            
            // Si la tarea se marcó como completada... ¡BOOM!
            if(t.completed) { 
                showToast("¡Completada! 🎉"); 
                
                // Disparo de Confeti
                confetti({
                    particleCount: 150, // Cantidad de papelitos
                    spread: 80,         // Ángulo de apertura
                    origin: { y: 0.6 }, // Desde dónde sale (un poco más abajo del centro)
                    colors: ['#38bdf8', '#a855f7', '#10b981', '#f59e0b'] // Azul, Morado, Verde, Naranja
                });
            } 
        } 
    };
    const deleteTask = (id) => { if(confirm('¿Destruir tarea?')) { tasks = tasks.filter(t => t.id !== id); Storage.save(); } };
    const moveTask = (id, newStatus) => { const t = tasks.find(x => x.id === id); if(t) { t.status = newStatus; Storage.save(); } };
    const clearAllData = () => { if(confirm("⚠️ ¿Borrar TODA la base de datos?")) { tasks = []; Storage.save(); } };

    const switchTab = (tab, btn) => {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.getElementById(`tab-${tab}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        if(tab === 'historial') UI.renderChart();
    };

    const toggleTheme = () => {
        const html = document.documentElement; const btn = document.getElementById('themeToggle');
        if (html.getAttribute('data-theme') === 'dark') { html.removeAttribute('data-theme'); btn.textContent = '🌙 Modo Oscuro'; } 
        else { html.setAttribute('data-theme', 'dark'); btn.textContent = '☀️ Modo Claro'; }
    };

    const UI = {
        updateStats: () => {
            if(tasks.length === 0) return;
            const c = tasks.filter(t => t.completed).length;
            document.getElementById('progressFill').style.width = `${(c / tasks.length) * 100}%`;
            document.getElementById('statsNumbers').textContent = `${c}/${tasks.length} listas`;
        },
        render: () => {
            const g = { bandeja: document.getElementById('tasksGrid'), later: document.getElementById('column-later'), week: document.getElementById('column-week'), today: document.getElementById('column-today'), history: document.getElementById('historyList') };
            Object.values(g).forEach(el => { if(el) el.innerHTML = ''; });

            tasks.forEach(task => {
                if (task.completed) {
                    g.history.innerHTML += `<div class="kanban-card" style="border-left-color: var(--cta-green);"><span style="text-decoration:line-through; color:gray">${task.title}</span><button onclick="App.toggleComplete('${task.id}')" style="float:right; background:none; border:none; cursor:pointer;">↩️</button></div>`;
                    return;
                }
                if (!task.status) task.status = 'bandeja';

                const card = document.createElement('div'); card.className = `kanban-card`;
                card.draggable = true; card.ondragstart = (e) => App.dragStart(e, task.id); card.ondragend = (e) => e.target.classList.remove('dragging');

                card.innerHTML = `
                    <div style="font-size:0.8rem; margin-bottom: 5px;" class="pill ${task.category}">${task.category.toUpperCase()} | ⏱ ${task.time}m</div>
                    <h4 style="margin: 0; font-size: 1rem;">${task.title}</h4>
                    <select style="margin:10px 0; width:100%; padding:5px; border-radius:5px; background:var(--input-bg); color:var(--text-main)" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${task.status === 'bandeja'?'selected':''}>📥 Bandeja</option><option value="later" ${task.status === 'later'?'selected':''}>⏳ Algún día</option><option value="week" ${task.status === 'week'?'selected':''}>📅 Esta Semana</option><option value="today" ${task.status === 'today'?'selected':''}>🔥 Hacer HOY</option>
                    </select>
                    <div style="display:flex; justify-content:space-between; margin-top: 10px;">
                        <button class="btn-icon" style="color:var(--accent-blue);" onclick="App.startFocus('${task.id}')">▶️</button>
                        <button class="btn-icon" style="color:#f59e0b;" onclick="App.editTask('${task.id}')">✏️</button>
                        <button class="btn-icon" style="color:var(--cta-green);" onclick="App.toggleComplete('${task.id}')">✔️</button>
                        <button class="btn-icon" style="color:var(--danger-red);" onclick="App.deleteTask('${task.id}')">🗑</button>
                    </div>`;

                if (task.status === 'bandeja') g.bandeja.appendChild(card);
                else if (task.status === 'later') g.later.appendChild(card);
                else if (task.status === 'week') g.week.appendChild(card);
                else if (task.status === 'today') g.today.appendChild(card);
            });
            UI.updateStats();
        },
        renderChart: () => {
            const ctx = document.getElementById('statsChart'); if(!ctx) return;
            const comp = tasks.filter(t => t.completed); if(myChart) myChart.destroy();
            const counts = ['video', 'articulo', 'curso', 'proyecto'].map(c => comp.filter(t => t.category === c).length);
            myChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Videos', 'Artículos', 'Cursos', 'Proyectos'], datasets: [{ data: counts, backgroundColor: ['#a855f7', '#38bdf8', '#10b981', '#f59e0b'], borderWidth: 0 }] }});
        }
    };

    // Simulador IA
    const askGemini = async () => {
        const aiCard = document.getElementById('aiResponseCard'); const aiText = document.getElementById('aiResponseText');
        const active = tasks.filter(t => (t.status === 'today' || t.status === 'week') && !t.completed);
        if(active.length === 0) { showToast("Tu pizarra está vacía. 🤖"); return; }
        aiCard.classList.remove('hidden'); aiText.innerHTML = '<i>Analizando tu flojera... 🧠</i>';
        setTimeout(() => { aiText.innerHTML = "Tu yo del futuro está llorando. Deja el celular y ataca la primera tarea de Hacer HOY. 🔥"; }, 2000); 
    };

    const login = () => signInWithPopup(auth, provider).catch(console.error);
    const logout = () => signOut(auth).then(() => { tasks = []; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); });

    const init = () => {
        document.getElementById('taskForm').addEventListener('submit', addTask);
        document.getElementById('exitFocus').addEventListener('click', stopFocus);
        document.getElementById('googleLoginBtn').addEventListener('click', login);
        
        onAuthStateChanged(auth, (user) => {
            if (user) { currentUser = user; document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('mainDashboard').classList.remove('hidden'); Storage.listen(); } 
            else { currentUser = null; document.getElementById('loginScreen').classList.remove('hidden'); document.getElementById('mainDashboard').classList.add('hidden'); }
        });
    };

    return { init, toggleComplete, deleteTask, editTask, startFocus, moveTask, switchTab, toggleTheme, clearAllData, login, logout, askGemini, dragStart, allowDrop, dragLeave, drop };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', App.init);

// 🚀 REGISTRO DEL SERVICE WORKER (PARA LA APP INSTALABLE)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => console.log('App lista para instalarse.')).catch(err => console.error('Error PWA:', err));
    });
}
