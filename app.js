import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = { apiKey: "AIzaSyCz45FGoqkYt9BS4J1_UjkBu6gSTHp0QOU", authDomain: "smart-time-hub.firebaseapp.com", databaseURL: "https://smart-time-hub-default-rtdb.firebaseio.com", projectId: "smart-time-hub", storageBucket: "smart-time-hub.firebasestorage.app", messagingSenderId: "462409089", appId: "1:462409089:web:672735cbfc6d891eb92c80" };
const appFirebase = initializeApp(firebaseConfig); const auth = getAuth(appFirebase); const db = getDatabase(appFirebase); const provider = new GoogleAuthProvider();
let currentUser = null;

const dict = {
    es: {
        nav_inbox: "Bandeja", nav_board: "Pizarra", nav_analytics: "Analítica", nav_settings: "Ajustes", nav_projects: "PROYECTOS", btn_new_proj: "+ Nuevo Proyecto",
        btn_theme: "Modo Tema", btn_logout: "Cerrar Sesión", inbox_title: "Bandeja de Entrada", inbox_sub: "Captura tareas para procesarlas después.",
        prog_title: "Progreso Diario", freq_label: "Frecuencia de la tarea:", freq_once: "Una sola vez (Normal)", freq_daily: "Todos los días", freq_weekly: "Días específicos", btn_save: "Guardar Tarea", filter_energy: "Filtro de Energía",
        filt_all: "Todas", filt_high: "Alta", filt_med: "Normal", filt_low: "Baja", empty_title: "Bandeja Vacía", empty_sub: "Añade una tarea para comenzar.",
        board_title: "Pizarra", board_sub: "Organiza y ejecuta tus tareas.", btn_ai: "Analizar mi carga de trabajo", ai_name: "Asistente Ejecutivo:",
        col_later: "Algún día", col_week: "Esta Semana", col_today: "Hacer Hoy", stat_title: "Analítica", stat_sub: "Métricas de rendimiento.",
        stat_rank: "Rango Actual", stat_time: "Tiempo Invertido", stat_done: "Completadas", stat_dist: "Distribución", stat_log: "Registro de Actividad", stat_heatmap: "Mapa de Constancia (Últimas 12 semanas)",
        set_title: "Ajustes", set_sub: "Configura tu entorno.", set_ai: "Integración IA (Groq)", set_ai_sub: "Introduce tu API Key para activar el asistente.",
        btn_save_key: "Guardar Configuración", set_data: "Gestión de Datos", set_data_sub: "Exporta tus datos o formatea el sistema.", btn_format: "Formatear BD",
        proj_sub: "Tareas asignadas a este proyecto.", focus_badge: "SESIÓN DE ENFOQUE", btn_material: "Abrir Material", btn_end_focus: "Finalizar Sesión",
        edit_title: "Editar Tarea", edit_name: "Nombre de la tarea", edit_time: "Tiempo (min)", edit_energy: "Energía", btn_cancel: "Cancelar", btn_save_changes: "Guardar Cambios",
        habits_title: "Rutinas de Hoy", habits_empty: "No hay rutinas programadas para hoy.", notif_title: "Centro de Avisos", tree_title: "Árbol del Foco",
        js_exec: "Ejecutar", js_edit: "Editar", js_comp: "Completar", js_del: "Borrar", js_undo: "Deshacer", js_tasks: "tareas",
        js_rank1: "Analista", js_rank2: "Asociado", js_rank3: "Mánager", js_rank4: "Ejecutivo", js_streak: "Racha",
        js_opt1: "Bandeja", js_opt2: "Algún día", js_opt3: "Esta Semana", js_opt4: "Hacer Hoy",
        tree_seed: "Semilla", tree_sprout: "Brote", tree_tree: "Árbol", tree_oak: "Roble", tree_dead: "Marchito",
        mod_proj_title: "Crear Nuevo Proyecto", mod_proj_sub: "Agrupa tus tareas en carpetas de trabajo.", btn_create: "Crear Proyecto",
        conf_del_task: "¿Borrar Tarea?", conf_del_task_sub: "Se eliminará permanentemente del sistema.", conf_del_proj: "¿Borrar Proyecto?", conf_del_proj_sub: "Las tareas de este proyecto se moverán a 'General'.", conf_format: "⚠️ ¿Formatear Sistema?", conf_format_sub: "Se borrarán TODAS las tareas, proyectos y el árbol morirá."
    },
    en: {
        nav_inbox: "Inbox", nav_board: "Board", nav_analytics: "Analytics", nav_settings: "Settings", nav_projects: "PROJECTS", btn_new_proj: "+ New Project",
        btn_theme: "Toggle Theme", btn_logout: "Sign Out", inbox_title: "Inbox", inbox_sub: "Capture tasks and process them later.",
        prog_title: "Daily Progress", freq_label: "Task Frequency:", freq_once: "Once (Normal)", freq_daily: "Every day", freq_weekly: "Specific days", btn_save: "Save Task", filter_energy: "Energy Filter",
        filt_all: "All", filt_high: "High", filt_med: "Normal", filt_low: "Low", empty_title: "Inbox is Empty", empty_sub: "Add a task to start.",
        board_title: "Board", board_sub: "Organize and execute tasks.", btn_ai: "Analyze my schedule", ai_name: "Executive Assistant:",
        col_later: "Backlog", col_week: "This Week", col_today: "Today", stat_title: "Analytics", stat_sub: "Performance metrics.",
        stat_rank: "Current Rank", stat_time: "Time Invested", stat_done: "Completed", stat_dist: "Distribution", stat_log: "Activity Log", stat_heatmap: "Consistency Map (Last 12 weeks)",
        set_title: "Settings", set_sub: "Manage your workspace.", set_ai: "AI Integration (Groq)", set_ai_sub: "Provide your API Key to enable assistant.",
        btn_save_key: "Save Configuration", set_data: "Data Management", set_data_sub: "Export or format your database.", btn_format: "Format Database",
        proj_sub: "Tasks assigned to this project.", focus_badge: "FOCUS SESSION", btn_material: "Open Material", btn_end_focus: "End Session",
        edit_title: "Edit Task", edit_name: "Task Name", edit_time: "Time (min)", edit_energy: "Energy", btn_cancel: "Cancel", btn_save_changes: "Save Changes",
        habits_title: "Today's Routines", habits_empty: "No routines scheduled for today.", notif_title: "Notification Center", tree_title: "Focus Tree",
        js_exec: "Execute", js_edit: "Edit", js_comp: "Complete", js_del: "Delete", js_undo: "Undo", js_tasks: "tasks",
        js_rank1: "Analyst", js_rank2: "Associate", js_rank3: "Manager", js_rank4: "Executive", js_streak: "Streak",
        js_opt1: "Inbox", js_opt2: "Backlog", js_opt3: "This Week", js_opt4: "Today",
        tree_seed: "Seed", tree_sprout: "Sprout", tree_tree: "Tree", tree_oak: "Oak", tree_dead: "Withered",
        mod_proj_title: "Create New Project", mod_proj_sub: "Group your tasks into working folders.", btn_create: "Create Project",
        conf_del_task: "Delete Task?", conf_del_task_sub: "It will be permanently removed.", conf_del_proj: "Delete Project?", conf_del_proj_sub: "Tasks within this project will be moved to 'General'.", conf_format: "⚠️ Format Database?", conf_format_sub: "ALL tasks and projects will be wiped. The tree will die."
    }
};

const App = (() => {
    let tasks = []; let folders = ['General']; let currentActiveFolder = 'General';
    let tree = { health: 100, lastCheck: '' }; let notifs = []; let unreadNotifs = 0; 
    let focusInterval; let myChart = null; let draggedTaskId = null; let currentEnergyFilter = 'all';
    let lang = localStorage.getItem('smartLang') || 'es';
    let confirmActionCallback = null; // Para guardar la función de borrar

    const t = (key) => dict[lang][key] || key;
    const applyTranslations = () => { document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); }); document.getElementById('langBtn').textContent = lang === 'es' ? '🇬🇧 English' : '🇪🇸 Español'; UI.updateStats(); UI.render(); UI.renderNotifs(); };
    const toggleLanguage = () => { lang = lang === 'es' ? 'en' : 'es'; localStorage.setItem('smartLang', lang); applyTranslations(); };
    const showToast = (msg) => { const c = document.getElementById('toast-container'); if(!c) return; const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = msg; c.appendChild(toast); setTimeout(() => toast.remove(), 3000); };
    
    const addNotif = (msg, type = 'info') => { const d = new Date(); const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; notifs.unshift({ msg, time: timeStr, type, id: Date.now() }); if(notifs.length > 20) notifs.pop(); unreadNotifs++; Storage.saveNotifs(); UI.renderNotifs(); };
    const toggleNotifPanel = () => { const p = document.getElementById('notifPanel'); p.classList.toggle('hidden'); if(!p.classList.contains('hidden')) { unreadNotifs = 0; Storage.saveNotifs(); UI.renderNotifs(); } };
    const clearNotifs = () => { notifs = []; unreadNotifs = 0; Storage.saveNotifs(); UI.renderNotifs(); };

    const getLocalDate = (offsetDays = 0) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
    
    const checkDailyRoutinesAndTree = () => {
        const todayStr = getLocalDate(0); const yesterdayStr = getLocalDate(-1); const currentDayNum = new Date().getDay().toString(); 
        let needsTaskSave = false; let needsTreeSave = false;

        if (!tree.lastCheck) { tree.lastCheck = todayStr; needsTreeSave = true; }
        if (tree.lastCheck !== todayStr) {
            const neglectedTasks = tasks.filter(t => !t.completed && t.status === 'today').length;
            if (neglectedTasks > 0) { 
                tree.health = Math.max(0, tree.health - (neglectedTasks * 15)); 
                addNotif(lang==='es' ? `El Árbol perdió vida por ${neglectedTasks} tareas atrasadas.` : `Tree lost health due to ${neglectedTasks} overdue tasks.`, 'danger');
            }
            tree.lastCheck = todayStr; needsTreeSave = true;
        }

        tasks.forEach(task => {
            if (task.completed && task.freq && task.freq !== 'once') {
                let shouldRevive = false;
                if (task.freq === 'daily' && task.lastCompletedDate !== todayStr) shouldRevive = true;
                else if (task.freq === 'weekly' && task.days && task.days.includes(currentDayNum) && task.lastCompletedDate !== todayStr) shouldRevive = true;

                if (shouldRevive) { task.completed = false; task.status = 'today'; needsTaskSave = true; if (task.lastCompletedDate !== yesterdayStr && task.lastCompletedDate) task.streak = 0; }
            }
        });
        if (needsTaskSave) Storage.saveTasks(); if (needsTreeSave) Storage.saveTree();
    };

    const toggleDaysSelector = (mode) => { const sel = document.getElementById(mode === 'new' ? 'freqInput' : 'editFreqInput'); const daysDiv = document.getElementById(mode === 'new' ? 'daysSelector_new' : 'daysSelector_edit'); if (sel.value === 'weekly') { daysDiv.classList.remove('hidden'); } else { daysDiv.classList.add('hidden'); } };

    const Storage = {
        saveTasks: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/tasks'), tasks); },
        saveFolders: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/folders'), folders); },
        saveTree: () => { if(currentUser) set(ref(db, 'users/' + currentUser.uid + '/tree'), tree); },
        saveNotifs: () => { localStorage.setItem('smartNotifs', JSON.stringify(notifs)); localStorage.setItem('smartUnread', unreadNotifs); },
        listen: () => {
            if(currentUser) {
                onValue(ref(db, 'users/' + currentUser.uid + '/tasks'), (snapshot) => { const data = snapshot.val(); tasks = data ? (Array.isArray(data) ? data.filter(x=>x) : Object.values(data).filter(x=>x)) : []; checkDailyRoutinesAndTree(); UI.render(); });
                onValue(ref(db, 'users/' + currentUser.uid + '/folders'), (snapshot) => { const data = snapshot.val(); if (data) folders = Array.isArray(data) ? data : Object.values(data); UI.renderFolders(); });
                onValue(ref(db, 'users/' + currentUser.uid + '/tree'), (snapshot) => { const data = snapshot.val(); if (data) { tree = data; checkDailyRoutinesAndTree(); UI.updateStats(); } else { Storage.saveTree(); } });
                const savedNotifs = localStorage.getItem('smartNotifs'); if(savedNotifs) notifs = JSON.parse(savedNotifs);
                const savedUnread = localStorage.getItem('smartUnread'); if(savedUnread) unreadNotifs = parseInt(savedUnread);
                UI.renderNotifs();
            }
        }
    };

    const switchTab = (tab, btn) => { document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active', 'hidden'); t.style.display = 'none'; }); const targetTab = document.getElementById(`tab-${tab}`); if(targetTab) { targetTab.classList.add('active'); targetTab.style.display = 'block'; } document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); if(tab === 'historial') setTimeout(UI.renderChart, 100); };
    
    // --- NUEVO: SISTEMA DE MODALES PROFESIONALES (Adios Prompt y Confirm) ---
    const openProjectModal = () => { document.getElementById('newProjectInput').value = ''; document.getElementById('projectModal').classList.remove('hidden'); document.getElementById('newProjectInput').focus(); };
    const closeProjectModal = () => { document.getElementById('projectModal').classList.add('hidden'); };
    const confirmAddFolder = () => { const name = document.getElementById('newProjectInput').value.trim(); if(name !== "") { if(!folders.includes(name)) { folders.push(name); Storage.saveFolders(); addNotif(lang==='es'?`Proyecto "${name}" creado.`:`Project "${name}" created.`, 'success'); closeProjectModal(); } else { alert(lang==='es'?"Esa carpeta ya existe.":"Folder already exists."); } } };

    const openConfirmModal = (actionType, idOrName) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const textEl = document.getElementById('confirmText');
        
        if (actionType === 'delete_task') {
            titleEl.textContent = t('conf_del_task'); textEl.textContent = t('conf_del_task_sub');
            confirmActionCallback = () => { tasks = tasks.filter(t => t.id !== idOrName); Storage.saveTasks(); closeConfirmModal(); };
        } else if (actionType === 'delete_folder') {
            titleEl.textContent = t('conf_del_proj'); textEl.textContent = t('conf_del_proj_sub');
            confirmActionCallback = () => { 
                let needsTaskSave = false; tasks.forEach(t => { if(t.folder === idOrName) { t.folder = 'General'; needsTaskSave = true; } });
                if(needsTaskSave) Storage.saveTasks(); folders = folders.filter(f => f !== idOrName); Storage.saveFolders();
                if(currentActiveFolder === idOrName) { currentActiveFolder = 'General'; document.getElementById('currentFolderName').textContent = `General`; switchTab('bandeja', document.querySelector('.nav-btn')); }
                addNotif(lang==='es'?`Proyecto "${idOrName}" eliminado.`:`Project "${idOrName}" deleted.`, 'warning'); UI.renderFolders(); UI.render(); closeConfirmModal(); 
            };
        } else if (actionType === 'format') {
            titleEl.textContent = t('conf_format'); textEl.textContent = t('conf_format_sub');
            confirmActionCallback = () => { tasks = []; folders = ['General']; tree = { health: 100, lastCheck: '' }; notifs = []; unreadNotifs = 0; Storage.saveTasks(); Storage.saveFolders(); Storage.saveTree(); Storage.saveNotifs(); showToast("Formatted."); UI.renderNotifs(); closeConfirmModal(); };
        }
        
        // Quitar eventos viejos del botón "Sí" y poner el nuevo
        const btn = document.getElementById('confirmBtn');
        btn.onclick = confirmActionCallback;
        modal.classList.remove('hidden');
    };
    const closeConfirmModal = () => { document.getElementById('confirmModal').classList.add('hidden'); confirmActionCallback = null; };

    const openFolder = (name, btn) => { currentActiveFolder = name; document.getElementById('currentFolderName').textContent = name; switchTab('carpetas', btn); UI.render(); };
    const setEnergyFilter = (level, btn) => { currentEnergyFilter = level; document.querySelectorAll('.btn-energy').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); UI.render(); };
    const checkSharedLinks = () => { const urlParams = new URLSearchParams(window.location.search); const t = urlParams.get('title') || urlParams.get('text'); const u = urlParams.get('url'); if (t || u) { if (document.getElementById('titleInput')) document.getElementById('titleInput').value = t || ''; if (document.getElementById('urlInput')) document.getElementById('urlInput').value = u || ''; window.history.replaceState({}, document.title, window.location.pathname); showToast("Link captured."); } };
    const dragStart = (e, id) => { draggedTaskId = id; e.target.classList.add('dragging'); e.dataTransfer.setData('text/plain', id); }; const allowDrop = (e) => { e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.add('drag-over'); }; const dragLeave = (e) => { const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); }; const drop = (e, status) => { e.preventDefault(); const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); if(draggedTaskId) { moveTask(draggedTaskId, status); draggedTaskId = null; } };
    
    // --- AÑADIDO RÁPIDO ("QUICK ADD") ---
    const addTask = (e) => {
        e.preventDefault(); 
        const titleVal = document.getElementById('titleInput').value.trim();
        if (!titleVal) return; 

        const energyVal = document.getElementById('energyInput') ? document.getElementById('energyInput').value : 'media'; 
        const freqVal = document.getElementById('freqInput') ? document.getElementById('freqInput').value : 'once'; 
        const folderVal = document.getElementById('folderInput') ? document.getElementById('folderInput').value : 'General';
        const urlVal = document.getElementById('urlInput') ? document.getElementById('urlInput').value : '';
        const catVal = document.getElementById('categoryInput') ? document.getElementById('categoryInput').value : 'proyecto';
        
        const timeInputRaw = document.getElementById('timeInput').value;
        const timeVal = (timeInputRaw && !isNaN(timeInputRaw)) ? parseInt(timeInputRaw) : 15; // 15 mins por defecto
        
        let selectedDays = [];
        if (freqVal === 'weekly') {
            document.querySelectorAll('.day-cb:checked').forEach(cb => selectedDays.push(cb.value));
            if (selectedDays.length === 0) { alert(lang==='es'?"Selecciona al menos un día.":"Select at least one day."); return; }
        }
        
        tasks.unshift({ 
            id: Date.now().toString(), url: urlVal, title: titleVal, 
            category: catVal, energy: energyVal, folder: folderVal, time: timeVal, 
            freq: freqVal, days: selectedDays, streak: 0, lastCompletedDate: null, completedDates: [], completed: false, status: 'bandeja' 
        });
        Storage.saveTasks(); document.getElementById('taskForm').reset(); 
        if(document.getElementById('folderInput')) document.getElementById('folderInput').value = folderVal; 
        toggleDaysSelector('new'); 
        showToast(lang === 'es' ? "Tarea Guardada ⚡" : "Task Saved ⚡");
    };

    const editTask = (id) => { 
        const task = tasks.find(t => t.id === id); if (!task) return; 
        document.getElementById('editTaskId').value = task.id; document.getElementById('editTitleInput').value = task.title; document.getElementById('editTimeInput').value = task.time; document.getElementById('editEnergyInput').value = task.energy || 'media';
        const freqSel = document.getElementById('editFreqInput'); freqSel.value = task.freq || 'once'; toggleDaysSelector('edit');
        document.querySelectorAll('.edit-day-cb').forEach(cb => cb.checked = false);
        if (task.freq === 'weekly' && task.days) { document.querySelectorAll('.edit-day-cb').forEach(cb => { if(task.days.includes(cb.value)) cb.checked = true; }); }
        document.getElementById('editModal').classList.remove('hidden');
    };

    const closeEditModal = () => { document.getElementById('editModal').classList.add('hidden'); };

    const saveEditedTask = () => {
        const id = document.getElementById('editTaskId').value; const task = tasks.find(t => t.id === id); if (!task) return; 
        const newTitle = document.getElementById('editTitleInput').value; const newTime = parseInt(document.getElementById('editTimeInput').value); const newEnergy = document.getElementById('editEnergyInput').value; const newFreq = document.getElementById('editFreqInput').value;
        if (!newTitle || isNaN(newTime) || newTime <= 0) { alert(lang==='es'?"Datos inválidos.":"Invalid data."); return; }
        let selectedDays = [];
        if (newFreq === 'weekly') { document.querySelectorAll('.edit-day-cb:checked').forEach(cb => selectedDays.push(cb.value)); if (selectedDays.length === 0) { alert(lang==='es'?"Selecciona un día.":"Select a day."); return; } }
        task.title = newTitle; task.time = newTime; task.energy = newEnergy; task.freq = newFreq; task.days = selectedDays;
        Storage.saveTasks(); UI.render(); closeEditModal(); showToast(lang==='es'?"Actualizada":"Updated");
    };

    const toggleComplete = (id) => { 
        const tk = tasks.find(x => x.id === id); 
        if(tk) { 
            tk.completed = !tk.completed; 
            const today = getLocalDate(0);
            if (!tk.completedDates) tk.completedDates = [];

            if(tk.completed) { 
                tk.completedAt = today; 
                if (!tk.completedDates.includes(today)) tk.completedDates.push(today);
                tree.health = Math.min(100, tree.health + 10); Storage.saveTree();
                if(tk.freq && tk.freq !== 'once') { if(tk.lastCompletedDate !== today) { tk.streak = (tk.streak || 0) + 1; tk.lastCompletedDate = today; } } 
                if (typeof confetti === "function") confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#38bdf8', '#10b981'] });
            } 
            else { 
                tk.completedDates = tk.completedDates.filter(d => d !== today); 
                tree.health = Math.max(0, tree.health - 10); Storage.saveTree();
                if(tk.freq && tk.freq !== 'once') { tk.streak = Math.max(0, (tk.streak || 0) - 1); tk.lastCompletedDate = null; } 
            } 
            Storage.saveTasks(); 
        } 
    };

    const moveTask = (id, newStatus) => { const tk = tasks.find(x => x.id === id); if(tk) { tk.status = newStatus; Storage.saveTasks(); } };
    
    const playDing = () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.setValueAtTime(1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5); } catch(e) {} };
    
    const startFocus = (id) => { 
        const task = tasks.find(t => t.id === id); if(!task) return; 
        if ("Notification" in window && Notification.permission === "default") { Notification.requestPermission(); } 
        const overlay = document.getElementById('focusOverlay'); overlay.classList.remove('hidden', 'finished');
        document.getElementById('focusTitle').textContent = task.title; 
        const urlBtn = document.getElementById('focusUrlBtn'); 
        if (urlBtn) { if (task.url && task.url.trim() !== "") { let finalUrl = task.url.trim(); if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl; urlBtn.href = finalUrl; urlBtn.style.display = 'inline-block'; } else { urlBtn.style.display = 'none'; } } 
        
        const endTime = Date.now() + ((task.time || 25) * 60 * 1000); 
        const updateTimer = () => { 
            const remaining = Math.round((endTime - Date.now()) / 1000); 
            if (remaining <= 0) { 
                clearInterval(focusInterval); document.getElementById('focusTimer').textContent = "00:00"; 
                playDing(); overlay.classList.add('finished'); document.getElementById('focusTitle').textContent = lang==='es' ? "¡Misión Cumplida!" : "Time's Up!";
                if ("Notification" in window && Notification.permission === "granted") { new Notification("Focus Complete", { body: `Task finished: "${task.title}".`, icon: "./icon.png" }); } 
                addNotif(lang==='es' ? `Sesión de enfoque completada: "${task.title}".` : `Focus session completed: "${task.title}".`, 'success');
                if (typeof confetti === "function") confetti({ particleCount: 200, spread: 100, origin: { y: 0.3 }, colors: ['#ffffff', '#16a34a'] });
                return; 
            } 
            document.getElementById('focusTimer').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`; 
        }; 
        updateTimer(); focusInterval = setInterval(updateTimer, 1000); 
    };
    const stopFocus = () => { clearInterval(focusInterval); const overlay = document.getElementById('focusOverlay'); overlay.classList.add('hidden'); overlay.classList.remove('finished'); };

    const UI = {
        renderNotifs: () => {
            const list = document.getElementById('notifList'); const badge = document.getElementById('notifBadge');
            if(badge) { if(unreadNotifs > 0) { badge.textContent = unreadNotifs; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); } }
            if(list) {
                list.innerHTML = '';
                if(notifs.length === 0) { list.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center;">${lang==='es'?'No hay notificaciones.':'No notifications.'}</p>`; return; }
                notifs.forEach(n => { list.innerHTML += `<div class="notif-item ${n.type}"><div>${n.msg}</div><span class="notif-time">${n.time}</span></div>`; });
            }
        },
        renderFolders: () => { const list = document.getElementById('folderList'); const select = document.getElementById('folderInput'); if(list) { list.innerHTML = ''; folders.forEach(f => { const folderItem = document.createElement('div'); folderItem.className = 'folder-item'; const btn = document.createElement('button'); btn.className = 'nav-btn'; btn.innerHTML = f; btn.onclick = function() { App.openFolder(f, this); }; folderItem.appendChild(btn); if(f !== 'General') { const delBtn = document.createElement('button'); delBtn.className = 'delete-folder-btn'; delBtn.innerHTML = '✕'; delBtn.onclick = (e) => { e.stopPropagation(); App.openConfirmModal('delete_folder', f); }; folderItem.appendChild(delBtn); } list.appendChild(folderItem); }); } if(select) { select.innerHTML = ''; folders.forEach(f => { select.innerHTML += `<option value="${f}">${f}</option>`; }); } },
        updateStats: () => {
            const completed = tasks.filter(t => t.completed); const c = completed.length;
            if(document.getElementById('progressFill')) document.getElementById('progressFill').style.width = tasks.length === 0 ? '0%' : `${(c / tasks.length) * 100}%`;
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

            const treeIconEl = document.getElementById('treeIcon');
            if(treeIconEl) {
                let isDead = tree.health <= 0; let stageName, icon, nextXP, currentTierXP;
                if (isDead) { stageName = t('tree_dead'); icon = '🥀'; nextXP = totalMins; currentTierXP = totalMins; }
                else if (totalMins < 60) { stageName = t('tree_seed'); icon = '🌱'; nextXP = 60; currentTierXP = 0; }
                else if (totalMins < 300) { stageName = t('tree_sprout'); icon = '🌿'; nextXP = 300; currentTierXP = 60; }
                else if (totalMins < 1000) { stageName = t('tree_tree'); icon = '🌳'; nextXP = 1000; currentTierXP = 300; }
                else { stageName = t('tree_oak'); icon = '🌲'; nextXP = totalMins; currentTierXP = totalMins; }
                
                const progressPercent = (nextXP === totalMins) ? 100 : Math.min(100, ((totalMins - currentTierXP) / (nextXP - currentTierXP)) * 100);
                treeIconEl.textContent = icon; document.getElementById('treeStageName').textContent = stageName; document.getElementById('treeProgressText').textContent = isDead ? `0 XP` : (nextXP === totalMins ? `MAX` : `${totalMins} / ${nextXP} XP`);
                const fill = document.getElementById('treeProgressFill'); fill.style.width = `${progressPercent}%`; fill.style.background = isDead ? 'var(--danger-red)' : 'var(--cta-green)';
                const healthEl = document.getElementById('treeHealth'); healthEl.textContent = `❤️ ${tree.health}%`; healthEl.className = tree.health > 50 ? 'health-good' : (tree.health > 0 ? 'health-warn' : 'health-dead');
            }
            UI.renderHeatmap(); 
        },
        renderHeatmap: () => {
            const container = document.getElementById('heatmapContainer'); if(!container) return; const counts = {};
            tasks.forEach(task => { if(task.completedDates && Array.isArray(task.completedDates)) { task.completedDates.forEach(d => { counts[d] = (counts[d] || 0) + 1; }); } else if(task.completed) { const fallbackDate = task.completedAt || getLocalDate(0); counts[fallbackDate] = (counts[fallbackDate] || 0) + 1; } });
            let html = '';
            for (let col = 0; col < 12; col++) {
                html += '<div class="heatmap-col">';
                for (let row = 0; row < 7; row++) {
                    const daysAgo = (11 - col) * 7 + (6 - row); const dObj = new Date(); dObj.setDate(dObj.getDate() - daysAgo);
                    const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
                    const c = counts[dStr] || 0; let lvl = 0; if(c === 1) lvl = 1; else if(c === 2) lvl = 2; else if(c >= 3 && c <= 4) lvl = 3; else if(c >= 5) lvl = 4;
                    html += `<div class="heatmap-cell" data-level="${lvl}" title="${c} ${t('js_tasks')} (${dStr})"></div>`;
                }
                html += '</div>';
            }
            container.innerHTML = html;
        },
        render: () => {
            const g = { bandeja: document.getElementById('tasksGrid'), later: document.getElementById('column-later'), week: document.getElementById('column-week'), today: document.getElementById('column-today'), history: document.getElementById('historyList'), folder: document.getElementById('folderTasksGrid'), habits: document.getElementById('habitsList') };
            Object.values(g).forEach(el => { if(el) el.innerHTML = ''; }); 
            let enBandeja = 0; let hasHabitsToday = false; const currentDayNum = new Date().getDay().toString();

            const createCardDOM = (task) => {
                let energyLabel = task.energy === "alta" ? "High" : (task.energy === "baja" ? "Low" : "Normal");
                const card = document.createElement('div'); card.className = `kanban-card`; card.draggable = true; 
                card.ondragstart = (e) => App.dragStart(e, task.id); card.ondragend = (e) => e.target.classList.remove('dragging');

                card.innerHTML = `
                    <div style="font-size:0.75rem; margin-bottom: 5px; font-weight:600; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span class="pill ${task.category}">${task.category.toUpperCase()}</span>
                        <span style="color:var(--text-muted);">${task.time}m</span>
                        <span style="color:var(--accent-blue);">${task.folder || 'General'}</span>
                    </div>
                    <h4>${task.title}</h4>
                    <select style="margin:10px 0; width:100%;" onchange="App.moveTask('${task.id}', this.value)">
                        <option value="bandeja" ${task.status === 'bandeja'?'selected':''}>${t('js_opt1')}</option><option value="later" ${task.status === 'later'?'selected':''}>${t('js_opt2')}</option><option value="week" ${task.status === 'week'?'selected':''}>${t('js_opt3')}</option><option value="today" ${task.status === 'today'?'selected':''}>${t('js_opt4')}</option>
                    </select>
                    <div class="card-actions">
                        <button class="btn-play" onclick="App.startFocus('${task.id}')">${t('js_exec')}</button>
                        <button class="btn-edit" onclick="App.editTask('${task.id}')">${t('js_edit')}</button>
                        <button class="btn-complete" onclick="App.toggleComplete('${task.id}')">${t('js_comp')}</button>
                        <button class="btn-delete" onclick="App.openConfirmModal('delete_task', '${task.id}')">${t('js_del')}</button>
                    </div>`;
                return card;
            };

            tasks.forEach(task => {
                if (currentEnergyFilter !== 'all' && task.energy !== currentEnergyFilter && !task.completed) return;

                if (task.freq && task.freq !== 'once') {
                    let isForToday = false;
                    if (task.freq === 'daily') isForToday = true;
                    if (task.freq === 'weekly' && task.days && task.days.includes(currentDayNum)) isForToday = true;

                    if (isForToday) {
                        hasHabitsToday = true; const isDone = task.completed; const habitEl = document.createElement('div');
                        habitEl.className = `habit-item ${isDone ? 'done' : ''}`;
                        habitEl.innerHTML = `
                            <div class="habit-left">
                                <input type="checkbox" class="habit-checkbox" ${isDone ? 'checked' : ''} onchange="App.toggleComplete('${task.id}')">
                                <span class="habit-title">${task.title}</span>
                                <span class="streak-badge">${t('js_streak')}: ${task.streak || 0}</span>
                            </div>
                            <div class="habit-actions">
                                <button onclick="App.editTask('${task.id}')">${t('js_edit')}</button>
                                <button onclick="App.openConfirmModal('delete_task', '${task.id}')">${t('js_del')}</button>
                            </div>
                        `;
                        if(g.habits) g.habits.appendChild(habitEl);
                    }
                    return; 
                }

                if (task.completed) {
                    if(g.history) g.history.innerHTML += `
                        <div class="history-item">
                            <div style="display:flex; flex-direction:column;"><span style="text-decoration:line-through; color:var(--text-muted); font-weight:500;">${task.title}</span><span style="font-size:0.75rem; color:var(--cta-green);">+${task.time} min</span></div>
                            <button onclick="App.toggleComplete('${task.id}')" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">${t('js_undo')}</button>
                        </div>`;
                    return;
                }

                const card = createCardDOM(task);
                if (task.status === 'bandeja') { if(g.bandeja) g.bandeja.appendChild(card); enBandeja++; }
                else if (task.status === 'later') { if(g.later) g.later.appendChild(card); }
                else if (task.status === 'week') { if(g.week) g.week.appendChild(card); }
                else if (task.status === 'today') { if(g.today) g.today.appendChild(card); }
                if (task.folder === currentActiveFolder || (!task.folder && currentActiveFolder === 'General')) { const folderCard = createCardDOM(task); if(g.folder) g.folder.appendChild(folderCard); }
            });
            
            if (!hasHabitsToday && g.habits) { g.habits.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">${t('habits_empty')}</p>`; }
            if(document.getElementById('emptyState')) document.getElementById('emptyState').classList.toggle('hidden', enBandeja > 0);
            UI.updateStats();
        },
        renderChart: () => { const ctx = document.getElementById('statsChart'); if(!ctx) return; const comp = tasks.filter(t => t.completed); if(myChart) myChart.destroy(); const counts = ['video', 'articulo', 'curso', 'proyecto'].map(c => comp.filter(t => (t.category || 'proyecto') === c).length); const fontColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#fafaef' : '#09090b'; myChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Video', 'Article', 'Course', 'Project'], datasets: [{ data: counts, backgroundColor: ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: fontColor } } } }}); }
    };

    const saveApiKey = () => { const key = document.getElementById('apiKeyInput').value.trim(); if(key) { localStorage.setItem('aiApiKey', key); showToast("Key Saved"); } else { localStorage.removeItem('aiApiKey'); showToast("Key Removed"); } };
    const askGemini = async () => { const apiKey = localStorage.getItem('aiApiKey'); if (!apiKey) { alert("API Key required."); switchTab('ajustes', document.querySelectorAll('.nav-btn')[3]); return; } const aiCard = document.getElementById('aiResponseCard'); const aiText = document.getElementById('aiResponseText'); const pendingTasks = tasks.filter(t => !t.completed); if(pendingTasks.length === 0) { showToast("No tasks available."); return; } aiCard.classList.remove('hidden'); aiText.innerHTML = '<i>Processing workload data...</i>'; const tasksString = pendingTasks.map(t => `- [${t.status.toUpperCase()}] ${t.title} (${t.time}m, Energy: ${t.energy})`).join('\n'); const promptSystem = `You are an Executive Assistant. Your goal is to maximize efficiency. Recommend EXACTLY ONE task from the list. Be concise, professional, no emojis. Provide rationale. Respond in ${lang === 'es' ? 'Spanish' : 'English'}.`; const promptUser = `Energy capacity: ${currentEnergyFilter}. Pending tasks:\n${tasksString}`; try { const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: promptSystem }, { role: "user", content: promptUser }] }) }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error?.message || "Server Error."); } const data = await response.json(); const aiResponse = data.choices[0].message.content; aiText.innerHTML = ''; let i = 0; const typeWriter = setInterval(() => { if(i < aiResponse.length) { aiText.innerHTML += aiResponse.charAt(i); i++; } else { clearInterval(typeWriter); } }, 15); } catch (error) { console.error(error); aiText.innerHTML = `<span style="color:var(--danger-red)">System Error: ${error.message}</span>`; } };
    const toggleTheme = () => { const html = document.documentElement; if (html.getAttribute('data-theme') === 'dark') { html.removeAttribute('data-theme'); } else { html.setAttribute('data-theme', 'dark'); } UI.renderChart(); };
    
    let isLoggingIn = false; const login = async () => { if(isLoggingIn) return; isLoggingIn = true; try { await signInWithPopup(auth, provider); } catch (error) { if(error.code !== 'auth/cancelled-popup-request') alert("Auth Error: " + error.message); } finally { isLoggingIn = false; } };
    const logout = () => signOut(auth).then(() => { tasks = []; tree = { health: 100, lastCheck: '' }; notifs = []; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); });

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

    return { init, toggleComplete, editTask, startFocus, moveTask, switchTab, setEnergyFilter, toggleTheme, exportData, login, logout, askGemini, dragStart, allowDrop, dragLeave, drop, addFolder, openFolder, saveApiKey, toggleLanguage, toggleDaysSelector, closeEditModal, saveEditedTask, toggleNotifPanel, clearNotifs, openProjectModal, closeProjectModal, confirmAddFolder, openConfirmModal, closeConfirmModal };
})();

window.App = App; document.addEventListener('DOMContentLoaded', App.init); if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(e=>e); }); }
