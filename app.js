import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
    let folders = ['General', 'Economía 📈', 'Deporte 💪']; 
    let currentActiveFolder = 'General';
    let focusInterval;
    let myChart = null;
    let draggedTaskId = null; 
    let currentEnergyFilter = 'all';

    const showToast = (msg) => {
        const c = document.getElementById('toast-container');
        if(!c) return;
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        c.appendChild(t); setTimeout(() => t.remove(), 4000);
    };

    const getLocalDate = (offsetDays = 0) => {
        const d = new Date(); d.setDate(d.getDate() + offsetDays);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };

    const checkDailyHabits = () => {
        const today = getLocalDate(0); const yesterday = getLocalDate(-1); let needsSave = false;
        tasks.forEach(t => {
            if (t.isHabit && t.completed && t.lastCompletedDate !== today) {
                t.completed = false; t.status = 'today'; needsSave = true;
                if (t.lastCompletedDate !== yesterday && t.lastCompletedDate) t.streak = 0;
            }
        });
        if (needsSave) Storage.saveTasks();
    };

    const Storage = {
        saveTasks: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/tasks'), tasks); },
        saveFolders: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/folders'), folders); },
        listen: () => {
            if(currentUser) {
                onValue(ref(db, 'users/' + currentUser.uid + '/tasks'), (snapshot) => {
                    const data = snapshot.val();
                    if (!data) tasks = [];
                    else if (Array.isArray(data)) tasks = data.filter(t => t !== null);
                    else tasks = Object.values(data).filter(t => t !== null);
                    checkDailyHabits(); UI.render(); 
                });
                onValue(ref(db, 'users/' + currentUser.uid + '/folders'), (snapshot) => {
                    const data = snapshot.val();
                    if (data) folders = Array.isArray(data) ? data : Object.values(data);
                    UI.renderFolders();
                });
            }
        }
    };

    const switchTab = (tab, btn) => {
        document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active', 'hidden'); t.style.display = 'none'; });
        const targetTab = document.getElementById(`tab-${tab}`);
        if(targetTab) { targetTab.classList.add('active'); targetTab.style.display = 'block'; }
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        if(tab === 'historial') setTimeout(UI.renderChart, 100); 
    };

    const addFolder = () => {
        const name = prompt("Nombre de la nueva carpeta (ej: Universidad 🎓):");
        if(name && name.trim() !== "") {
            if(!folders.includes(name.trim())) { folders.push(name.trim()); Storage.saveFolders(); showToast("Carpeta creada 📁"); } 
            else alert("Esa carpeta ya existe.");
        }
    };

    const deleteFolder = (folderName) => {
        if(folderName === 'General') return; 
        if(confirm(`⚠️ ¿Seguro que quieres borrar la carpeta "${folderName}"?\n(Las tareas se moverán a 'General').`)) {
            let needsTaskSave = false;
            tasks.forEach(t => { if(t.folder === folderName) { t.folder = 'General'; needsTaskSave = true; } });
            if(needsTaskSave) Storage.saveTasks();
            folders = folders.filter(f => f !== folderName); Storage.saveFolders();
            if(currentActiveFolder === folderName) {
                currentActiveFolder = 'General'; document.getElementById('currentFolderName').textContent = `📁 General`;
                switchTab('bandeja', document.querySelector('.nav-btn'));
            }
            showToast("Carpeta eliminada 🗑️"); UI.renderFolders(); UI.render();
        }
    };

    const openFolder = (name, btn) => { currentActiveFolder = name; document.getElementById('currentFolderName').textContent = `📁 ${name}`; switchTab('carpetas', btn); UI.render(); };

    const setEnergyFilter = (level, btn) => { currentEnergyFilter = level; document.querySelectorAll('.btn-energy').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); UI.render(); };

    const checkSharedLinks = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedTitle = urlParams.get('title') || urlParams.get('text'); const sharedUrl = urlParams.get('url');
        if (sharedTitle || sharedUrl) {
            if (document.getElementById('titleInput')) document.getElementById('titleInput').value = sharedTitle || '';
            if (document.getElementById('urlInput')) document.getElementById('urlInput').value = sharedUrl || '';
            window.history.replaceState({}, document.title, window.location.pathname);
            showToast("🔗 ¡Enlace recibido desde el móvil!");
        }
    };

    const dragStart = (e, id) => { draggedTaskId = id; e.target.classList.add('dragging'); e.dataTransfer.setData('text/plain', id); };
    const allowDrop = (e) => { e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.add('drag-over'); };
    const dragLeave = (e) => { const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); };
    const drop = (e, status) => {
        e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over');
        if(draggedTaskId) { moveTask(draggedTaskId, status); draggedTaskId = null; }
    };

    const addTask = (e) => {
        e.preventDefault();
        const energyVal = document.getElementById('energyInput') ? document.getElementById('energyInput').value : 'media';
        const isHabitChecked = document.getElementById('habitInput') ? document.getElementById('habitInput').checked : false;
        const folderVal = document.getElementById('folderInput') ? document.getElementById('folderInput').value : 'General';
        
        tasks.unshift({
            id: Date.now().toString(), url: document.getElementById('urlInput').value, title: document.getElementById('titleInput').value, 
            category: document.getElementById('categoryInput').value, energy: energyVal, folder: folderVal, time: parseInt(document.getElementById('timeInput').value), 
            isHabit: isHabitChecked, streak: 0, lastCompletedDate: null, completed: false, status: 'bandeja'
        });
        Storage.saveTasks(); document.getElementById('taskForm').reset(); document.getElementById('folderInput').value = folderVal; 
        showToast(isHabitChecked ? "Hábito creado. 🔁" : "Guardado en " + folderVal + " 📁");
    };

    const editTask = (id) => {
        const task = tasks.find(t => t.id === id); if (!task) return;
        const newTitle = prompt("Corrige el nombre:", task.title); if (!newTitle || newTitle.trim() === "") return;
        const newTime = prompt("Cambia el tiempo (minutos):", task.time); if (!newTime || isNaN(newTime) || newTime <= 0) return;
        task.title = newTitle.trim(); task.time = parseInt(newTime); Storage.saveTasks(); showToast("Actualizada. ✏️");
    };

    const toggleComplete = (id) => { 
        const t = tasks.find(x => x.id === id); 
        if(t) { 
            t.completed = !t.completed; 
            if(t.completed) {
                if(t.isHabit) { const today = getLocalDate(0); if(t.lastCompletedDate !== today) { t.streak = (t.streak || 0) + 1; t.lastCompletedDate = today; } }
                showToast("¡Completada! 🎉");
                if (typeof confetti === "function") confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#38bdf8', '#a855f7', '#10b981', '#f59e0b'] });
            } else { if(t.isHabit) { t.streak = Math.max(0, (t.streak || 0) - 1); t.lastCompletedDate = null; } }
            Storage.saveTasks(); 
        } 
    };

    const deleteTask = (id) => { if(confirm('¿Destruir tarea?')) { tasks = tasks.filter(t => t.id !== id); Storage.saveTasks(); } };
    const moveTask = (id, newStatus) => { const t = tasks.find(x => x.id === id); if(t) { t.status = newStatus; Storage.saveTasks(); } };

    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id); if(!task) return;
        document.getElementById('focusTitle').textContent = task.title || "Enfoque"; document.getElementById('focusOverlay').classList.remove('hidden');
        const endTime = Date.now() + ((task.time || 25) * 60 * 1000);
        const updateTimer = () => {
            const remaining = Math.round((endTime - Date.now()) / 1000);
            if (remaining <= 0) { clearInterval(focusInterval); document.getElementById('focusTimer').textContent = "00:00"; alert('¡Tiempo terminado!'); stopFocus(); return; }
            document.getElementById('focusTimer').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
        };
        updateTimer(); focusInterval = setInterval(updateTimer, 1000);
    };
    const stopFocus = () => { clearInterval(focusInterval); document.getElementById('focusOverlay').classList.add('hidden'); };

    const UI = {
        renderFolders: () => {
            const list = document.getElementById('folderList'); const select = document.getElementById('folderInput');
            if(list) {
                list.innerHTML = '';
                folders.forEach(f => {
                    const folderItem = document.createElement('div'); folderItem.className = 'folder-item';
                    const btn = document.createElement('button'); btn.className = 'nav-btn'; btn.innerHTML = `📁 ${f}`; btn.onclick = function() { App.openFolder(f, this); }; folderItem.appendChild(btn);
                    if(f !== 'General') {
                        const delBtn = document.createElement('button'); delBtn.className = 'delete-folder-btn'; delBtn.innerHTML = '✖'; delBtn.onclick = (e) => { e.stopPropagation(); App.deleteFolder(f); }; folderItem.appendChild(delBtn);
                    }
                    list.appendChild(folderItem);
                });
            }
            if(select) { select.innerHTML = ''; folders.forEach(f => { select.innerHTML += `<option value="${f}">${f}</option>`; }); }
        },
        updateStats: () => {
            if(tasks.length === 0) return;
            const completed = tasks.filter(t => t.completed); const c = completed.length;
            if(document.getElementById('progressFill')) document.getElementById('progressFill').style.width = `${(c / tasks.length) * 100}%`;
            if(document.getElementById('statsNumbers')) document.getElementById('statsNumbers').textContent = `${c}/${tasks.length} listas`;

            const totalMins = completed.reduce((sum, task) => sum + (task.time || 0), 0);
            if(document.getElementById('totalMinutes')) {
                document.getElementById('totalMinutes').textContent = `${totalMins} min`; document.getElementById('totalCompleted').textContent = `${c}`;
                let level = "Novato 🌱"; let color = "#94a3b8"; 
                if(totalMins >= 30)  { level = "Aprendiz 📘"; color = "#38bdf8"; } 
                if(totalMins >= 120) { level = "Guerrero ⚔️"; color = "#a855f7"; } 
                if(totalMins >= 500) { level = "Maestro 👑"; color = "#f59e0b"; } 
                if(document.getElementById('userLevel')) { document.getElementById('userLevel').innerHTML = level; document.getElementById('userLevel').style.color = color; }
            }
        },
        render: () => {
            const g = { bandeja: document.getElementById('tasksGrid'), later: document.getElementById('column-later'), week: document.getElementById('column-week'), today: document.getElementById('column-today'), history: document.getElementById('historyList'), folder: document.getElementById('folderTasksGrid') };
            Object.values(g).forEach(el => { if(el) el.innerHTML = ''; }); 
            let enBandeja = 0;

            const createCardDOM = (task) => {
                const s_title = task.title || "Tarea"; const s_time = task.time || 15; const s_cat = task.category || "proyecto"; const s_status = task.status || "bandeja"; const s_energy = task.energy || "media"; const s_folder = task.folder || "General";
                const s_habit = task.isHabit ? `<span class="streak-badge">🔥 ${task.streak || 0}</span>` : '';
                let energyIcon = s_energy === "alta" ? "⚡" : (s_energy === "baja" ? "🪫" : "🔋");

                const card = document.createElement('div'); card.className = `kanban-card`; card.draggable = true; 
                card.ondragstart = (e) => App.dragStart(e, task.id); card.ondragend = (e) => e.target.classList.remove('dragging');

                card.innerHTML = `
                    <div style="font-size:0.75rem; margin-bottom: 5px; font-weight:bold; display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
                        <span class="pill ${s_cat}">${s_cat.toUpperCase()}</span>
                        <span>⏱ ${s_time}m</span>
                        <span>${energyIcon}</span>
                        <span style="color:var(--accent-blue);">📁 ${s_folder}</span>
                        ${s_habit}
                    </div>
                    <h4 style="margin: 0; font-size: 1rem;">${s_title}</h4>
                    <select aria-label="Cambiar estado" style="margin:10px 0; width:100%; padding:5px; border-radius:5px; background:var(--input-bg); color:var(--text-main)" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${s_status === 'bandeja'?'selected':''}>📥 Bandeja</option><option value="later" ${s_status === 'later'?'selected':''}>⏳ Algún día</option><option value="week" ${s_status === 'week'?'selected':''}>📅 Esta Semana</option><option value="today" ${s_status === 'today'?'selected':''}>🔥 Hacer HOY</option>
                    </select>
                    <div style="display:flex; justify-content:space-between; margin-top: 10px;">
                        <button style="background:none;border:none;cursor:pointer;color:var(--accent-blue);" onclick="App.startFocus('${task.id}')" title="Enfoque">▶️</button>
                        <button style="background:none;border:none;cursor:pointer;color:#f59e0b;" onclick="App.editTask('${task.id}')" title="Editar">✏️</button>
                        <button style="background:none;border:none;cursor:pointer;color:var(--cta-green);" onclick="App.toggleComplete('${task.id}')" title="Completar">✔️</button>
                        <button style="background:none;border:none;cursor:pointer;color:var(--danger-red);" onclick="App.deleteTask('${task.id}')" title="Borrar">🗑</button>
                    </div>`;
                return card;
            };

            tasks.forEach(task => {
                if (currentEnergyFilter !== 'all' && task.energy !== currentEnergyFilter && !task.completed) return;

                if (task.completed) {
                    if(g.history) g.history.innerHTML += `
                        <div class="history-item">
                            <div style="display:flex; flex-direction:column;">
                                <span style="text-decoration:line-through; color:var(--text-muted); font-weight:bold;">${task.isHabit ? `<span class="streak-badge">🔥 ${task.streak||0}</span>`:''} ${task.title}</span>
                                <span style="font-size:0.75rem; color:var(--cta-green);">+${task.time} min de XP</span>
                            </div>
                            <button onclick="App.toggleComplete('${task.id}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">↩️</button>
                        </div>`;
                    return;
                }

                const card = createCardDOM(task);
                if (task.status === 'bandeja') { if(g.bandeja) g.bandeja.appendChild(card); enBandeja++; }
                else if (task.status === 'later') { if(g.later) g.later.appendChild(card); }
                else if (task.status === 'week') { if(g.week) g.week.appendChild(card); }
                else if (task.status === 'today') { if(g.today) g.today.appendChild(card); }

                if (task.folder === currentActiveFolder || (!task.folder && currentActiveFolder === 'General')) {
                    const folderCard = createCardDOM(task); if(g.folder) g.folder.appendChild(folderCard);
                }
            });
            if(document.getElementById('emptyState')) document.getElementById('emptyState').classList.toggle('hidden', enBandeja > 0);
            UI.updateStats();
        }
    };

    // --- GUARDAR LLAVE API ---
    const saveApiKey = () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if(key) {
            localStorage.setItem('aiApiKey', key);
            showToast("Llave IA Guardada Correctamente 🧠");
        } else {
            localStorage.removeItem('aiApiKey');
            showToast("Llave IA Eliminada.");
        }
    };

    // --- NUEVO: IA REAL (API DE GROQ / LLAMA 3) ---
    const askGemini = async () => {
        const apiKey = localStorage.getItem('aiApiKey');
        if (!apiKey) {
            alert("⚠️ IA DESCONECTADA: Necesitas poner tu Llave API gratuita en la pestaña de 'Ajustes' primero.");
            switchTab('ajustes', document.querySelectorAll('.nav-btn')[3]); 
            return;
        }

        const aiCard = document.getElementById('aiResponseCard'); 
        const aiText = document.getElementById('aiResponseText');
        const pendingTasks = tasks.filter(t => !t.completed);
        
        if(pendingTasks.length === 0) { showToast("Tu pizarra está vacía. No hay nada que analizar. 🤖"); return; }
        
        aiCard.classList.remove('hidden'); 
        aiText.innerHTML = '<i>Analizando tu nivel de procrastinación a la velocidad de la luz... ⚡</i>';

        const tasksString = pendingTasks.map(t => `- [${t.status.toUpperCase()}] ${t.title} (${t.time}m, Energía: ${t.energy})`).join('\n');
        
        const promptSystem = `Eres un coach de productividad sarcástico, crudo y divertido. Tu misión es evitar que el usuario procrastine. Reglas: 1. Elige SOLO 1 tarea que deba hacer AHORA MISMO y dile por qué (basándote en su tiempo o energía). 2. Ríete un poco de él por dejar cosas para "algún día". 3. Sé súper breve (máximo 3 frases cortas). Empieza a dar caña directamente, sin decir Hola.`;
        const promptUser = `Mi energía actual es: ${currentEnergyFilter === 'all' ? 'Variada' : currentEnergyFilter}. Estas son mis tareas pendientes:\n${tasksString}`;

        try {
            const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ 
                    model: "llama3-8b-8192", // Modelo de Llama 3 súper rápido y gratis
                    messages: [
                        { role: "system", content: promptSystem },
                        { role: "user", content: promptUser }
                    ]
                })
            });

            if (!response.ok) throw new Error("Llave inválida o API caída.");

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            // Efecto máquina de escribir
            aiText.innerHTML = '';
            let i = 0;
            const typeWriter = setInterval(() => {
                if(i < aiResponse.length) { aiText.innerHTML += aiResponse.charAt(i); i++; } 
                else { clearInterval(typeWriter); }
            }, 25); 

        } catch (error) {
            console.error(error);
            aiText.innerHTML = `<span style="color:var(--danger-red)">Error de IA: Comprueba que tu Llave API sea correcta.</span>`;
        }
    };

    const toggleTheme = () => { const html = document.documentElement; const btn = document.getElementById('themeToggle'); if (html.getAttribute('data-theme') === 'dark') { html.removeAttribute('data-theme'); btn.textContent = '🌙 Modo Oscuro'; } else { html.setAttribute('data-theme', 'dark'); btn.textContent = '☀️ Modo Claro'; } };
    const clearAllData = () => { if(confirm("⚠️ ¿Borrar TODA la base de datos?")) { tasks = []; folders = ['General']; Storage.saveTasks(); Storage.saveFolders(); showToast("Formateado. 🗑️"); } };
    const exportData = () => { if(tasks.length===0) return; const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks)); a.download = "backup.json"; document.body.appendChild(a); a.click(); a.remove(); };
    
    let isLoggingIn = false;
    const login = async () => { if(isLoggingIn) return; isLoggingIn = true; try { await signInWithPopup(auth, provider); } catch (error) { if(error.code !== 'auth/cancelled-popup-request') alert("Error: " + error.message); } finally { isLoggingIn = false; } };
    const logout = () => signOut(auth).then(() => { tasks = []; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); });

    const init = () => {
        if(document.getElementById('taskForm')) document.getElementById('taskForm').addEventListener('submit', addTask);
        if(document.getElementById('exitFocus')) document.getElementById('exitFocus').addEventListener('click', stopFocus);
        if(document.getElementById('googleLoginBtn')) document.getElementById('googleLoginBtn').addEventListener('click', login);
        checkSharedLinks(); 

        const storedKey = localStorage.getItem('aiApiKey');
        if(storedKey && document.getElementById('apiKeyInput')) { document.getElementById('apiKeyInput').value = storedKey; }

        onAuthStateChanged(auth, (user) => {
            if (user) { 
                currentUser = user; 
                if(document.getElementById('userName')) { document.getElementById('userName').textContent = user.displayName || "Agente"; document.getElementById('userEmail').textContent = user.email; }
                document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('mainDashboard').classList.remove('hidden'); 
                switchTab('bandeja', document.querySelector('.nav-btn.active'));
                Storage.listen(); 
            } else { 
                currentUser = null; document.getElementById('loginScreen').classList.remove('hidden'); document.getElementById('mainDashboard').classList.add('hidden'); 
            }
        });
    };

    return { init, toggleComplete, deleteTask, editTask, startFocus, moveTask, switchTab, setEnergyFilter, toggleTheme, clearAllData, exportData, login, logout, askGemini, dragStart, allowDrop, dragLeave, drop, addFolder, openFolder, deleteFolder, saveApiKey };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', App.init);
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(e=>e); }); }
