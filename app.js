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
    let folders = ['General', 'Finance', 'Health']; 
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
        c.appendChild(t); setTimeout(() => t.remove(), 3000);
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
        const name = prompt("Enter project name:");
        if(name && name.trim() !== "") {
            if(!folders.includes(name.trim())) { folders.push(name.trim()); Storage.saveFolders(); showToast("Project created."); } 
            else alert("Project already exists.");
        }
    };

    const deleteFolder = (folderName) => {
        if(folderName === 'General') return; 
        if(confirm(`Delete project "${folderName}"?\nTasks will be moved to General.`)) {
            let needsTaskSave = false;
            tasks.forEach(t => { if(t.folder === folderName) { t.folder = 'General'; needsTaskSave = true; } });
            if(needsTaskSave) Storage.saveTasks();
            folders = folders.filter(f => f !== folderName); Storage.saveFolders();
            if(currentActiveFolder === folderName) {
                currentActiveFolder = 'General'; document.getElementById('currentFolderName').textContent = `General`;
                switchTab('bandeja', document.querySelector('.nav-btn'));
            }
            showToast("Project deleted."); UI.renderFolders(); UI.render();
        }
    };

    const openFolder = (name, btn) => { currentActiveFolder = name; document.getElementById('currentFolderName').textContent = name; switchTab('carpetas', btn); UI.render(); };
    const setEnergyFilter = (level, btn) => { currentEnergyFilter = level; document.querySelectorAll('.btn-energy').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); UI.render(); };

    const checkSharedLinks = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedTitle = urlParams.get('title') || urlParams.get('text'); const sharedUrl = urlParams.get('url');
        if (sharedTitle || sharedUrl) {
            if (document.getElementById('titleInput')) document.getElementById('titleInput').value = sharedTitle || '';
            if (document.getElementById('urlInput')) document.getElementById('urlInput').value = sharedUrl || '';
            window.history.replaceState({}, document.title, window.location.pathname);
            showToast("Link captured.");
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
        showToast("Task saved.");
    };

    const editTask = (id) => {
        const task = tasks.find(t => t.id === id); if (!task) return;
        const newTitle = prompt("Update description:", task.title); if (!newTitle || newTitle.trim() === "") return;
        const newTime = prompt("Update allocated time (min):", task.time); if (!newTime || isNaN(newTime) || newTime <= 0) return;
        task.title = newTitle.trim(); task.time = parseInt(newTime); Storage.saveTasks(); showToast("Task updated.");
    };

    const toggleComplete = (id) => { 
        const t = tasks.find(x => x.id === id); 
        if(t) { 
            t.completed = !t.completed; 
            if(t.completed) {
                if(t.isHabit) { const today = getLocalDate(0); if(t.lastCompletedDate !== today) { t.streak = (t.streak || 0) + 1; t.lastCompletedDate = today; } }
                showToast("Task completed.");
            } else { if(t.isHabit) { t.streak = Math.max(0, (t.streak || 0) - 1); t.lastCompletedDate = null; } }
            Storage.saveTasks(); 
        } 
    };

    const deleteTask = (id) => { if(confirm('Delete task permanently?')) { tasks = tasks.filter(t => t.id !== id); Storage.saveTasks(); } };
    const moveTask = (id, newStatus) => { const t = tasks.find(x => x.id === id); if(t) { t.status = newStatus; Storage.saveTasks(); } };

    const playDing = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
        } catch(e) { console.log("Audio not supported"); }
    };

    const startFocus = (id) => {
        const task = tasks.find(t => t.id === id); if(!task) return;
        if ("Notification" in window && Notification.permission === "default") { Notification.requestPermission(); }
        document.getElementById('focusTitle').textContent = task.title || "Focus Session"; 
        document.getElementById('focusOverlay').classList.remove('hidden');
        
        const urlBtn = document.getElementById('focusUrlBtn');
        if (urlBtn) {
            if (task.url && task.url.trim() !== "") {
                let finalUrl = task.url.trim();
                if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl;
                urlBtn.href = finalUrl; urlBtn.style.display = 'inline-block';
            } else { urlBtn.style.display = 'none'; }
        }

        const endTime = Date.now() + ((task.time || 25) * 60 * 1000);
        const updateTimer = () => {
            const remaining = Math.round((endTime - Date.now()) / 1000);
            if (remaining <= 0) { 
                clearInterval(focusInterval); document.getElementById('focusTimer').textContent = "00:00"; 
                playDing(); 
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Session Complete", { body: `Time allocation finished for: "${task.title}".` });
                }
                alert('Session complete. Return to dashboard.'); stopFocus(); return; 
            }
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
                    const btn = document.createElement('button'); btn.className = 'nav-btn'; btn.innerHTML = f; btn.onclick = function() { App.openFolder(f, this); }; folderItem.appendChild(btn);
                    if(f !== 'General') {
                        const delBtn = document.createElement('button'); delBtn.className = 'delete-folder-btn'; delBtn.innerHTML = '✕'; delBtn.onclick = (e) => { e.stopPropagation(); App.deleteFolder(f); }; folderItem.appendChild(delBtn);
                    }
                    list.appendChild(folderItem);
                });
            }
            if(select) { select.innerHTML = ''; folders.forEach(f => { select.innerHTML += `<option value="${f}">${f}</option>`; }); }
        },
      updateStats:
        render: () => {
            const g = { bandeja: document.getElementById('tasksGrid'), later: document.getElementById('column-later'), week: document.getElementById('column-week'), today: document.getElementById('column-today'), history: document.getElementById('historyList'), folder: document.getElementById('folderTasksGrid') };
            Object.values(g).forEach(el => { if(el) el.innerHTML = ''; }); 
            let enBandeja = 0;

            const createCardDOM = (task) => {
                const s_title = task.title || "Task"; const s_time = task.time || 15; const s_cat = task.category || "Project"; const s_status = task.status || "bandeja"; const s_energy = task.energy || "media"; const s_folder = task.folder || "General";
                const s_habit = task.isHabit ? `<span class="streak-badge">Streak: ${task.streak || 0}</span>` : '';
                let energyLabel = s_energy === "alta" ? "High" : (s_energy === "baja" ? "Low" : "Normal");

                const card = document.createElement('div'); card.className = `kanban-card`; card.draggable = true; 
                card.ondragstart = (e) => App.dragStart(e, task.id); card.ondragend = (e) => e.target.classList.remove('dragging');

                card.innerHTML = `
                    <div style="font-size:0.75rem; margin-bottom: 5px; font-weight:600; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span class="pill ${s_cat}">${s_cat.toUpperCase()}</span>
                        <span style="color:var(--text-muted);">${s_time}m</span>
                        <span style="color:var(--text-muted);">${energyLabel}</span>
                        <span style="color:var(--accent-blue);">${s_folder}</span>
                        ${s_habit}
                    </div>
                    <h4 style="margin: 0; font-size: 1rem;">${s_title}</h4>
                    <select aria-label="Status" style="margin:10px 0; width:100%;" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${s_status === 'bandeja'?'selected':''}>Inbox</option><option value="later" ${s_status === 'later'?'selected':''}>Backlog</option><option value="week" ${s_status === 'week'?'selected':''}>This Week</option><option value="today" ${s_status === 'today'?'selected':''}>Today</option>
                    </select>
                    <div class="card-actions">
                        <button class="btn-play" onclick="App.startFocus('${task.id}')">Execute</button>
                        <button onclick="App.editTask('${task.id}')">Edit</button>
                        <button class="btn-complete" onclick="App.toggleComplete('${task.id}')">Complete</button>
                        <button class="btn-delete" onclick="App.deleteTask('${task.id}')">Delete</button>
                    </div>`;
                return card;
            };

            tasks.forEach(task => {
                if (currentEnergyFilter !== 'all' && task.energy !== currentEnergyFilter && !task.completed) return;

                if (task.completed) {
                    if(g.history) g.history.innerHTML += `
                        <div class="history-item">
                            <div style="display:flex; flex-direction:column;">
                                <span style="text-decoration:line-through; color:var(--text-muted); font-weight:500;">${task.title}</span>
                                <span style="font-size:0.75rem; color:var(--cta-green);">+${task.time} min</span>
                            </div>
                            <button onclick="App.toggleComplete('${task.id}')" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">Undo</button>
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
        },
        renderChart: () => {
            const ctx = document.getElementById('statsChart'); if(!ctx) return;
            const comp = tasks.filter(t => t.completed); if(myChart) myChart.destroy();
            const counts = ['video', 'articulo', 'curso', 'proyecto'].map(c => comp.filter(t => (t.category || 'proyecto') === c).length);
            const fontColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#fafaef' : '#09090b';
            myChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Video', 'Article', 'Course', 'Project'], datasets: [{ data: counts, backgroundColor: ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: fontColor } } } }});
        }
    };

    const saveApiKey = () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if(key) { localStorage.setItem('aiApiKey', key); showToast("Configuration saved."); } 
        else { localStorage.removeItem('aiApiKey'); showToast("Configuration removed."); }
    };

    // --- EXECUTIVE AI ASSISTANT ---
    const askGemini = async () => {
        const apiKey = localStorage.getItem('aiApiKey');
        if (!apiKey) { alert("API Key required. Please configure settings."); switchTab('ajustes', document.querySelectorAll('.nav-btn')[3]); return; }
        const aiCard = document.getElementById('aiResponseCard'); const aiText = document.getElementById('aiResponseText');
        const pendingTasks = tasks.filter(t => !t.completed);
        if(pendingTasks.length === 0) { showToast("No tasks available for analysis."); return; }
        
        aiCard.classList.remove('hidden'); aiText.innerHTML = '<i>Processing workload data...</i>';
        const tasksString = pendingTasks.map(t => `- [${t.status.toUpperCase()}] ${t.title} (${t.time}m, Energy: ${t.energy})`).join('\n');
        
        const promptSystem = `You are an Executive Productivity Assistant. Your goal is to maximize the user's efficiency. Analyze the pending tasks and the user's current energy level. Recommend EXACTLY ONE task to execute immediately. Be concise, professional, and logical. Do not use emojis. Provide a brief rationale.`;
        const promptUser = `Current energy capacity: ${currentEnergyFilter === 'all' ? 'Mixed' : currentEnergyFilter}. Pending tasks:\n${tasksString}`;
        
        try {
            const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: promptSystem }, { role: "user", content: promptUser }] }) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error?.message || "Server Error."); }
            const data = await response.json(); const aiResponse = data.choices[0].message.content;
            
            aiText.innerHTML = ''; let i = 0; const typeWriter = setInterval(() => { if(i < aiResponse.length) { aiText.innerHTML += aiResponse.charAt(i); i++; } else { clearInterval(typeWriter); } }, 15); 
        } catch (error) { console.error(error); aiText.innerHTML = `<span style="color:var(--danger-red)">System Error: ${error.message}</span>`; }
    };

    const toggleTheme = () => { const html = document.documentElement; const btn = document.getElementById('themeToggle'); if (html.getAttribute('data-theme') === 'dark') { html.removeAttribute('data-theme'); btn.textContent = 'Dark Mode'; } else { html.setAttribute('data-theme', 'dark'); btn.textContent = 'Light Mode'; } UI.renderChart(); };
    const clearAllData = () => { if(confirm("Format database? This action is irreversible.")) { tasks = []; folders = ['General']; Storage.saveTasks(); Storage.saveFolders(); showToast("Database formatted."); } };
    const exportData = () => { if(tasks.length===0) return; const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks)); a.download = "backup.json"; document.body.appendChild(a); a.click(); a.remove(); };
    
    let isLoggingIn = false;
    const login = async () => { if(isLoggingIn) return; isLoggingIn = true; try { await signInWithPopup(auth, provider); } catch (error) { if(error.code !== 'auth/cancelled-popup-request') alert("Authentication Error: " + error.message); } finally { isLoggingIn = false; } };
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
                if(document.getElementById('userName')) { document.getElementById('userName').textContent = user.displayName || "User"; document.getElementById('userEmail').textContent = user.email; }
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
