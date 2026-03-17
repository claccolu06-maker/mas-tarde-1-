import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = { apiKey: "AIzaSyCz45FGoqkYt9BS4J1_UjkBu6gSTHp0QOU", authDomain: "smart-time-hub.firebaseapp.com", databaseURL: "https://smart-time-hub-default-rtdb.firebaseio.com", projectId: "smart-time-hub", storageBucket: "smart-time-hub.firebasestorage.app", messagingSenderId: "462409089", appId: "1:462409089:web:672735cbfc6d891eb92c80" };
const appFirebase = initializeApp(firebaseConfig); const auth = getAuth(appFirebase); const db = getDatabase(appFirebase); const provider = new GoogleAuthProvider();
let currentUser = null;

// --- DICCIONARIO BILINGÜE ---
const dict = {
    es: {
        nav_inbox: "Bandeja", nav_board: "Pizarra", nav_analytics: "Analítica", nav_settings: "Ajustes", nav_projects: "PROYECTOS", btn_new_proj: "+ Nuevo Proyecto",
        btn_theme: "Modo Tema", btn_logout: "Cerrar Sesión", inbox_title: "Bandeja de Entrada", inbox_sub: "Captura tareas para procesarlas después.",
        prog_title: "Progreso Diario", habit_label: "Establecer como rutina diaria", btn_save: "Guardar Tarea", filter_energy: "Filtro de Energía",
        filt_all: "Todas", filt_high: "Alta", filt_med: "Normal", filt_low: "Baja", empty_title: "Bandeja Vacía", empty_sub: "Añade una tarea para comenzar.",
        board_title: "Pizarra", board_sub: "Organiza y ejecuta tus tareas.", btn_ai: "Analizar mi carga de trabajo", ai_name: "Asistente Ejecutivo:",
        col_later: "Algún día", col_week: "Esta Semana", col_today: "Hacer Hoy", stat_title: "Analítica", stat_sub: "Métricas de rendimiento.",
        stat_rank: "Rango Actual", stat_time: "Tiempo Invertido", stat_done: "Completadas", stat_dist: "Distribución", stat_log: "Registro de Actividad",
        set_title: "Ajustes", set_sub: "Configura tu entorno.", set_ai: "Integración IA (Groq)", set_ai_sub: "Introduce tu API Key para activar el asistente.",
        btn_save_key: "Guardar Configuración", set_data: "Gestión de Datos", set_data_sub: "Exporta tus datos o formatea el sistema.", btn_format: "Formatear BD",
        proj_sub: "Tareas asignadas a este proyecto.", focus_badge: "SESIÓN DE ENFOQUE", btn_material: "Abrir Material", btn_end_focus: "Finalizar Sesión",
        // Textos JS
        js_exec: "Ejecutar", js_edit: "Editar", js_comp: "Completar", js_del: "Borrar", js_undo: "Deshacer", js_tasks: "tareas",
        js_rank1: "Analista", js_rank2: "Asociado", js_rank3: "Mánager", js_rank4: "Ejecutivo", js_streak: "Racha",
        js_opt1: "Bandeja", js_opt2: "Algún día", js_opt3: "Esta Semana", js_opt4: "Hacer Hoy"
    },
    en: {
        nav_inbox: "Inbox", nav_board: "Board", nav_analytics: "Analytics", nav_settings: "Settings", nav_projects: "PROJECTS", btn_new_proj: "+ New Project",
        btn_theme: "Toggle Theme", btn_logout: "Sign Out", inbox_title: "Inbox", inbox_sub: "Capture tasks and process them later.",
        prog_title: "Daily Progress", habit_label: "Set as daily routine", btn_save: "Save Task", filter_energy: "Energy Filter",
        filt_all: "All", filt_high: "High", filt_med: "Normal", filt_low: "Low", empty_title: "Inbox is Empty", empty_sub: "Add a task to start.",
        board_title: "Board", board_sub: "Organize and execute tasks.", btn_ai: "Analyze my schedule", ai_name: "Executive Assistant:",
        col_later: "Backlog", col_week: "This Week", col_today: "Today", stat_title: "Analytics", stat_sub: "Performance metrics.",
        stat_rank: "Current Rank", stat_time: "Time Invested", stat_done: "Completed", stat_dist: "Distribution", stat_log: "Activity Log",
        set_title: "Settings", set_sub: "Manage your workspace.", set_ai: "AI Integration (Groq)", set_ai_sub: "Provide your API Key to enable assistant.",
        btn_save_key: "Save Configuration", set_data: "Data Management", set_data_sub: "Export or format your database.", btn_format: "Format Database",
        proj_sub: "Tasks assigned to this project.", focus_badge: "FOCUS SESSION", btn_material: "Open Material", btn_end_focus: "End Session",
        js_exec: "Execute", js_edit: "Edit", js_comp: "Complete", js_del: "Delete", js_undo: "Undo", js_tasks: "tasks",
        js_rank1: "Analyst", js_rank2: "Associate", js_rank3: "Manager", js_rank4: "Executive", js_streak: "Streak",
        js_opt1: "Inbox", js_opt2: "Backlog", js_opt3: "This Week", js_opt4: "Today"
    }
};

const App = (() => {
    let tasks = []; let folders = ['General']; let currentActiveFolder = 'General';
    let focusInterval; let myChart = null; let draggedTaskId = null; let currentEnergyFilter = 'all';
    let lang = localStorage.getItem('smartLang') || 'es';

    const t = (key) => dict[lang][key] || key;

    const applyTranslations = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
        document.getElementById('langBtn').textContent = lang === 'es' ? '🇬🇧 English' : '🇪🇸 Español';
        UI.updateStats(); UI.render();
    };

    const toggleLanguage = () => { lang = lang === 'es' ? 'en' : 'es'; localStorage.setItem('smartLang', lang); applyTranslations(); };

    const showToast = (msg) => { const c = document.getElementById('toast-container'); if(!c) return; const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = msg; c.appendChild(toast); setTimeout(() => toast.remove(), 3000); };
    const getLocalDate = (offsetDays = 0) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

    const checkDailyHabits = () => {
        const today = getLocalDate(0); const yesterday = getLocalDate(-1); let needsSave = false;
        tasks.forEach(task => {
            if (task.isHabit && task.completed && task.lastCompletedDate !== today) {
                task.completed = false; task.status = 'today'; needsSave = true;
                if (task.lastCompletedDate !== yesterday && task.lastCompletedDate) task.streak = 0;
            }
        });
        if (needsSave) Storage.saveTasks();
    };

    const Storage = {
        saveTasks: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/tasks'), tasks); },
        saveFolders: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/folders'), folders); },
        listen: () => {
            if(currentUser) {
                onValue(ref(db, 'users/' + currentUser.uid + '/tasks'), (snapshot) => { const data = snapshot.val(); tasks = data ? (Array.isArray(data) ? data.filter(x=>x) : Object.values(data).filter(x=>x)) : []; checkDailyHabits(); UI.render(); });
                onValue(ref(db, 'users/' + currentUser.uid + '/folders'), (snapshot) => { const data = snapshot.val(); if (data) folders = Array.isArray(data) ? data : Object.values(data); UI.renderFolders(); });
            }
        }
    };

    const switchTab = (tab, btn) => { document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active', 'hidden'); t.style.display = 'none'; }); const targetTab = document.getElementById(`tab-${tab}`); if(targetTab) { targetTab.classList.add('active'); targetTab.style.display = 'block'; } document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); if(tab === 'historial') setTimeout(UI.renderChart, 100); };
    const addFolder = () => { const name = prompt(lang === 'es' ? "Nombre del proyecto:" : "Project name:"); if(name && name.trim() !== "") { if(!folders.includes(name.trim())) { folders.push(name.trim()); Storage.saveFolders(); showToast(lang === 'es' ? "Creado" : "Created"); } else alert("Ya existe."); } };
    const deleteFolder = (folderName) => { if(folderName === 'General') return; if(confirm(`Delete project "${folderName}"?`)) { let needsTaskSave = false; tasks.forEach(t => { if(t.folder === folderName) { t.folder = 'General'; needsTaskSave = true; } }); if(needsTaskSave) Storage.saveTasks(); folders = folders.filter(f => f !== folderName); Storage.saveFolders(); if(currentActiveFolder === folderName) { currentActiveFolder = 'General'; document.getElementById('currentFolderName').textContent = `General`; switchTab('bandeja', document.querySelector('.nav-btn')); } UI.renderFolders(); UI.render(); } };
    const openFolder = (name, btn) => { currentActiveFolder = name; document.getElementById('currentFolderName').textContent = name; switchTab('carpetas', btn); UI.render(); };
    const setEnergyFilter = (level, btn) => { currentEnergyFilter = level; document.querySelectorAll('.btn-energy').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); UI.render(); };
    const checkSharedLinks = () => { const urlParams = new URLSearchParams(window.location.search); const t = urlParams.get('title') || urlParams.get('text'); const u = urlParams.get('url'); if (t || u) { if (document.getElementById('titleInput')) document.getElementById('titleInput').value = t || ''; if (document.getElementById('urlInput')) document.getElementById('urlInput').value = u || ''; window.history.replaceState({}, document.title, window.location.pathname); showToast("Link captured."); } };
    const dragStart = (e, id) => { draggedTaskId = id; e.target.classList.add('dragging'); e.dataTransfer.setData('text/plain', id); }; const allowDrop = (e) => { e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.add('drag-over'); }; const dragLeave = (e) => { const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); }; const drop = (e, status) => { e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); if(draggedTaskId) { moveTask(draggedTaskId, status); draggedTaskId = null; } };
    
    const addTask = (e) => {
        e.preventDefault(); const energyVal = document.getElementById('energyInput') ? document.getElementById('energyInput').value : 'media'; const isHabitChecked = document.getElementById('habitInput') ? document.getElementById('habitInput').checked : false; const folderVal = document.getElementById('folderInput') ? document.getElementById('folderInput').value : 'General';
        tasks.unshift({ id: Date.now().toString(), url: document.getElementById('urlInput').value, title: document.getElementById('titleInput').value, category: document.getElementById('categoryInput').value, energy: energyVal, folder: folderVal, time: parseInt(document.getElementById('timeInput').value), isHabit: isHabitChecked, streak: 0, lastCompletedDate: null, completed: false, status: 'bandeja' });
        Storage.saveTasks(); document.getElementById('taskForm').reset(); document.getElementById('folderInput').value = folderVal; showToast(lang === 'es' ? "Guardado" : "Saved");
    };

    const editTask = (id) => { const task = tasks.find(t => t.id === id); if (!task) return; const newTitle = prompt(lang==='es'?"Actualizar descripción:":"Update description:", task.title); if (!newTitle || newTitle.trim() === "") return; const newTime = prompt(lang==='es'?"Tiempo (min):":"Time (min):", task.time); if (!newTime || isNaN(newTime) || newTime <= 0) return; task.title = newTitle.trim(); task.time = parseInt(newTime); Storage.saveTasks(); UI.render(); };
    const toggleComplete = (id) => { const tk = tasks.find(x => x.id === id); if(tk) { tk.completed = !tk.completed; if(tk.completed) { if(tk.isHabit) { const today = getLocalDate(0); if(tk.lastCompletedDate !== today) { tk.streak = (tk.streak || 0) + 1; tk.lastCompletedDate = today; } } } else { if(tk.isHabit) { tk.streak = Math.max(0, (tk.streak || 0) - 1); tk.lastCompletedDate = null; } } Storage.saveTasks(); } };
    const deleteTask = (id) => { if(confirm('Delete?')) { tasks = tasks.filter(t => t.id !== id); Storage.saveTasks(); } };
    const moveTask = (id, newStatus) => { const tk = tasks.find(x => x.id === id); if(tk) { tk.status = newStatus; Storage.saveTasks(); } };
    
    const playDing = () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.setValueAtTime(1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5); } catch(e) {} };
    const startFocus = (id) => { const task = tasks.find(t => t.id === id); if(!task) return; if ("Notification" in window && Notification.permission === "default") { Notification.requestPermission(); } document.getElementById('focusTitle').textContent = task.title; document.getElementById('focusOverlay').classList.remove('hidden'); const urlBtn = document.getElementById('focusUrlBtn'); if (urlBtn) { if (task.url && task.url.trim() !== "") { let finalUrl = task.url.trim(); if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl; urlBtn.href = finalUrl; urlBtn.style.display = 'inline-block'; } else { urlBtn.style.display = 'none'; } } const endTime = Date.now() + ((task.time || 25) * 60 * 1000); const updateTimer = () => { const remaining = Math.round((endTime - Date.now()) / 1000); if (remaining <= 0) { clearInterval(focusInterval); document.getElementById('focusTimer').textContent = "00:00"; playDing(); if ("Notification" in window && Notification.permission === "granted") { new Notification("Session Complete", { body: task.title }); } alert('Complete!'); stopFocus(); return; } document.getElementById('focusTimer').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`; }; updateTimer(); focusInterval = setInterval(updateTimer, 1000); };
    const stopFocus = () => { clearInterval(focusInterval); document.getElementById('focusOverlay').classList.add('hidden'); };

    const UI = {
        renderFolders: () => { const list = document.getElementById('folderList'); const select = document.getElementById('folderInput'); if(list) { list.innerHTML = ''; folders.forEach(f => { const folderItem = document.createElement('div'); folderItem.className = 'folder-item'; const btn = document.createElement('button'); btn.className = 'nav-btn'; btn.innerHTML = f; btn.onclick = function() { App.openFolder(f, this); }; folderItem.appendChild(btn); if(f !== 'General') { const delBtn = document.createElement('button'); delBtn.className = 'delete-folder-btn'; delBtn.innerHTML = '✕'; delBtn.onclick = (e) => { e.stopPropagation(); App.deleteFolder(f); }; folderItem.appendChild(delBtn); } list.appendChild(folderItem); }); } if(select) { select.innerHTML = ''; folders.forEach(f => { select.innerHTML += `<option value="${f}">${f}</option>`; }); } },
        updateStats: () => {
            if(tasks.length === 0) return; const completed = tasks.filter(t => t.completed); const c = completed.length;
            if(document.getElementById('progressFill')) document.getElementById('progressFill').style.width = `${(c / tasks.length) * 100}%`;
            if(document.getElementById('statsNumbers')) document.getElementById('statsNumbers').textContent = `${c}/${tasks.length} ${t('js_tasks')}`;
            const totalMins = completed.reduce((sum, task) => sum + (task.time || 0), 0);
            if(document.getElementById('totalMinutes')) {
                document.getElementById('totalMinutes').textContent = `${totalMins}m`; document.getElementById('totalCompleted').textContent = `${c}`;
                let level = t('js_rank1'); let color = "var(--text-muted)"; 
                if(totalMins >= 60)  { level = t('js_rank2'); color = "var(--accent-blue)"; } 
                if(totalMins >= 300) { level = t('js_rank3'); color = "var(--cat-video)"; } 
                if(totalMins >= 1000) { level = t('js_rank4'); color = "var(--cat-proyecto)"; } 
                if(document.getElementById('userLevel')) { document.getElementById('userLevel').innerHTML = level; document.getElementById('userLevel').style.color = color; }
            }
        },
        render: () => {
            const g = { bandeja: document.getElementById('tasksGrid'), later: document.getElementById('column-later'), week: document.getElementById('column-week'), today: document.getElementById('column-today'), history: document.getElementById('historyList'), folder: document.getElementById('folderTasksGrid') };
            Object.values(g).forEach(el => { if(el) el.innerHTML = ''; }); let enBandeja = 0;

            const createCardDOM = (task) => {
                const isHabitDone = task.isHabit && task.completed; // 🔥 LOGICA DE HÁBITOS
                let energyLabel = task.energy === "alta" ? "High" : (task.energy === "baja" ? "Low" : "Normal");

                const card = document.createElement('div'); card.className = `kanban-card ${isHabitDone ? 'habit-done' : ''}`; card.draggable = true; 
                card.ondragstart = (e) => App.dragStart(e, task.id); card.ondragend = (e) => e.target.classList.remove('dragging');

                card.innerHTML = `
                    <div style="font-size:0.75rem; margin-bottom: 5px; font-weight:600; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span class="pill ${task.category}">${task.category.toUpperCase()}</span>
                        <span style="color:var(--text-muted);">${task.time}m</span>
                        <span style="color:var(--text-muted);">${energyLabel}</span>
                        <span style="color:var(--accent-blue);">${task.folder || 'General'}</span>
                        ${task.isHabit ? `<span class="streak-badge">${t('js_streak')}: ${task.streak || 0}</span>` : ''}
                    </div>
                    <h4>${task.title}</h4>
                    <select style="margin:10px 0; width:100%;" onchange="App.moveTask('${task.id}', this.value)" ${isHabitDone ? 'disabled' : ''}>
                        <option value="bandeja" ${task.status === 'bandeja'?'selected':''}>${t('js_opt1')}</option><option value="later" ${task.status === 'later'?'selected':''}>${t('js_opt2')}</option><option value="week" ${task.status === 'week'?'selected':''}>${t('js_opt3')}</option><option value="today" ${task.status === 'today'?'selected':''}>${t('js_opt4')}</option>
                    </select>
                    <div class="card-actions">
                        <button class="btn-play" onclick="App.startFocus('${task.id}')">${t('js_exec')}</button>
                        <button class="btn-edit" onclick="App.editTask('${task.id}')">${t('js_edit')}</button>
                        <button class="btn-complete" onclick="App.toggleComplete('${task.id}')" style="${isHabitDone ? 'color:var(--text-main); font-weight:bold; display:block;' : ''}">${isHabitDone ? t('js_undo') : t('js_comp')}</button>
                        <button class="btn-delete" onclick="App.deleteTask('${task.id}')">${t('js_del')}</button>
                    </div>`;
                return card;
            };

            tasks.forEach(task => {
                if (currentEnergyFilter !== 'all' && task.energy !== currentEnergyFilter && !task.completed) return;

                // TAREAS NORMALES (No Hábitos) AL HISTORIAL
                if (task.completed && !task.isHabit) {
                    if(g.history) g.history.innerHTML += `
                        <div class="history-item">
                            <div style="display:flex; flex-direction:column;"><span style="text-decoration:line-through; color:var(--text-muted); font-weight:500;">${task.title}</span><span style="font-size:0.75rem; color:var(--cta-green);">+${task.time} min</span></div>
                            <button onclick="App.toggleComplete('${task.id}')" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">${t('js_undo')}</button>
                        </div>`;
                    return;
                }

                // SI ESTAMOS AQUÍ, ES UNA TAREA PENDIENTE O UN HÁBITO COMPLETADO (A LA PIZARRA)
                const card = createCardDOM(task);
                if (task.status === 'bandeja') { if(g.bandeja) g.bandeja.appendChild(card); enBandeja++; }
                else if (task.status === 'later') { if(g.later) g.later.appendChild(card); }
                else if (task.status === 'week') { if(g.week) g.week.appendChild(card); }
                else if (task.status === 'today') { if(g.today) g.today.appendChild(card); }
                if (task.folder === currentActiveFolder || (!task.folder && currentActiveFolder === 'General')) { const folderCard = createCardDOM(task); if(g.folder) g.folder.appendChild(folderCard); }
            });
            if(document.getElementById('emptyState')) document.getElementById('emptyState').classList.toggle('hidden', enBandeja > 0);
            UI.updateStats();
        },
        renderChart: () => { const ctx = document.getElementById('statsChart'); if(!ctx) return; const comp = tasks.filter(t => t.completed); if(myChart) myChart.destroy(); const counts = ['video', 'articulo', 'curso', 'proyecto'].map(c => comp.filter(t => (t.category || 'proyecto') === c).length); const fontColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#fafaef' : '#09090b'; myChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Video', 'Article', 'Course', 'Project'], datasets: [{ data: counts, backgroundColor: ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: fontColor } } } }}); }
    };

    const saveApiKey = () => { const key = document.getElementById('apiKeyInput').value.trim(); if(key) { localStorage.setItem('aiApiKey', key); showToast("Key Saved"); } else { localStorage.removeItem('aiApiKey'); showToast("Key Removed"); } };
    const askGemini = async () => { const apiKey = localStorage.getItem('aiApiKey'); if (!apiKey) { alert("API Key required."); switchTab('ajustes', document.querySelectorAll('.nav-btn')[3]); return; } const aiCard = document.getElementById('aiResponseCard'); const aiText = document.getElementById('aiResponseText'); const pendingTasks = tasks.filter(t => !t.completed); if(pendingTasks.length === 0) { showToast("No tasks available."); return; } aiCard.classList.remove('hidden'); aiText.innerHTML = '<i>Processing workload data...</i>'; const tasksString = pendingTasks.map(t => `- [${t.status.toUpperCase()}] ${t.title} (${t.time}m, Energy: ${t.energy})`).join('\n'); const promptSystem = `You are an Executive Assistant. Your goal is to maximize efficiency. Recommend EXACTLY ONE task from the list. Be concise, professional, no emojis. Provide rationale. Respond in ${lang === 'es' ? 'Spanish' : 'English'}.`; const promptUser = `Energy capacity: ${currentEnergyFilter}. Pending tasks:\n${tasksString}`; try { const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: promptSystem }, { role: "user", content: promptUser }] }) }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error?.message || "Server Error."); } const data = await response.json(); const aiResponse = data.choices[0].message.content; aiText.innerHTML = ''; let i = 0; const typeWriter = setInterval(() => { if(i < aiResponse.length) { aiText.innerHTML += aiResponse.charAt(i); i++; } else { clearInterval(typeWriter); } }, 15); } catch (error) { console.error(error); aiText.innerHTML = `<span style="color:var(--danger-red)">System Error: ${error.message}</span>`; } };
    const toggleTheme = () => { const html = document.documentElement; if (html.getAttribute('data-theme') === 'dark') { html.removeAttribute('data-theme'); } else { html.setAttribute('data-theme', 'dark'); } UI.renderChart(); };
    const clearAllData = () => { if(confirm("Format database?")) { tasks = []; folders = ['General']; Storage.saveTasks(); Storage.saveFolders(); showToast("Formatted."); } };
    const exportData = () => { if(tasks.length===0) return; const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks)); a.download = "backup.json"; document.body.appendChild(a); a.click(); a.remove(); };
    let isLoggingIn = false; const login = async () => { if(isLoggingIn) return; isLoggingIn = true; try { await signInWithPopup(auth, provider); } catch (error) { if(error.code !== 'auth/cancelled-popup-request') alert("Auth Error: " + error.message); } finally { isLoggingIn = false; } };
    const logout = () => signOut(auth).then(() => { tasks = []; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); });

    const init = () => {
        if(document.getElementById('taskForm')) document.getElementById('taskForm').addEventListener('submit', addTask);
        if(document.getElementById('exitFocus')) document.getElementById('exitFocus').addEventListener('click', stopFocus);
        if(document.getElementById('googleLoginBtn')) document.getElementById('googleLoginBtn').addEventListener('click', login);
        checkSharedLinks(); applyTranslations();
        const storedKey = localStorage.getItem('aiApiKey'); if(storedKey && document.getElementById('apiKeyInput')) { document.getElementById('apiKeyInput').value = storedKey; }
        onAuthStateChanged(auth, (user) => {
            if (user) { currentUser = user; if(document.getElementById('userName')) { document.getElementById('userName').textContent = user.displayName || "User"; document.getElementById('userEmail').textContent = user.email; } document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('mainDashboard').classList.remove('hidden'); switchTab('bandeja', document.querySelector('.nav-btn.active')); Storage.listen(); } 
            else { currentUser = null; document.getElementById('loginScreen').classList.remove('hidden'); document.getElementById('mainDashboard').classList.add('hidden'); }
        });
    };

    return { init, toggleComplete, deleteTask, editTask, startFocus, moveTask, switchTab, setEnergyFilter, toggleTheme, clearAllData, exportData, login, logout, askGemini, dragStart, allowDrop, dragLeave, drop, addFolder, openFolder, deleteFolder, saveApiKey, toggleLanguage };
})();

window.App = App; document.addEventListener('DOMContentLoaded', App.init); if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(e=>e); }); }
