// === Module Data (loaded from modules/manifest.json) ===
let MODULES = [];
let MODULE_ICONS = [];

async function loadManifest() {
    try {
        const response = await fetch('modules/manifest.json');
        if (!response.ok) throw new Error('Manifest not found');
        MODULES = await response.json();
        MODULE_ICONS = MODULE_ICONS_PLACEHOLDER;
    } catch (err) {
        console.error('Failed to load manifest:', err);
        MODULES = [];
        MODULE_ICONS = [];
    }
}

const MODULE_ICONS_PLACEHOLDER = ['📚'];

const TOTAL_MODULES = MODULES.length;

// === Storage ===
const STORAGE_KEY = 'master_academy_progress';
const NOTES_KEY = 'master_academy_notes';
const THEME_KEY = 'master_academy_theme';
const CHECKLISTS_KEY = 'master_checklist_data';

function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadNotes() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {}; } catch { return {}; }
}

function saveNotes(data) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(data));
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// === State ===
let progress = loadProgress();
let notes = loadNotes();
let currentPage = 'home';
let currentModuleId = null;
let currentChecklistId = null;
let checklistsFilter = 'all';

// === Checklist Storage ===
function loadChecklists() {
    try { return JSON.parse(localStorage.getItem(CHECKLISTS_KEY)) || { lists: [] }; } catch { return { lists: [] }; }
}

function saveChecklists(data) {
    localStorage.setItem(CHECKLISTS_KEY, JSON.stringify(data));
}

let checklistsData = loadChecklists();

function getAllModules() {
    return MODULES;
}

// === Helpers ===
function getCompletedCount() {
    return Object.values(progress).filter(Boolean).length;
}

function getTotalModules() {
    return getAllModules().length;
}

function getPercent() {
    const total = getTotalModules();
    return total > 0 ? Math.round((getCompletedCount() / total) * 100) : 0;
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// === Toast ===
let toastTimer;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}

// === Navigation ===
function navigateTo(page, id) {
    currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    document.querySelectorAll('.mobile-nav__btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home') renderHome();
    else if (page === 'modules') renderModules();
    else if (page === 'module' && id) renderModuleDetail(id);
    else if (page === 'progress') renderProgress();
    else if (page === 'checklists') renderChecklists();
    else if (page === 'checklist' && id) renderChecklistDetail(id);
    else if (page === 'settings') renderSettings();
}

// === Render: Home ===
function renderHome() {
    const completed = getCompletedCount();
    const percent = getPercent();
    const total = getTotalModules();

    const statModules = document.getElementById('statModules');
    const statPercent = document.getElementById('statPercent');
    const homeProgressCount = document.getElementById('homeProgressCount');
    const homeProgressBar = document.getElementById('homeProgressBar');
    const homeProgressPercent = document.getElementById('homeProgressPercent');
    const modulesPreview = document.getElementById('modulesPreview');

    if (statModules) statModules.textContent = completed;
    if (statPercent) statPercent.textContent = percent + '%';
    if (homeProgressCount) homeProgressCount.textContent = completed + ' из ' + total + ' модулей';
    if (homeProgressBar) homeProgressBar.style.width = percent + '%';
    if (homeProgressPercent) homeProgressPercent.textContent = percent + '%';

    if (modulesPreview) {
        // Show up to 3 modules: prioritize unfinished, then any
        let preview = MODULES.filter(m => !progress[m.id]).slice(0, 3);
        if (preview.length < 3) {
            const remaining = 3 - preview.length;
            const extra = MODULES
                .filter(m => !preview.includes(m))
                .slice(0, remaining);
            preview = [...preview, ...extra];
        }

        modulesPreview.innerHTML = preview.map((module, i) => {
            const done = progress[module.id] === true;
            return `
                <div class="module-card ${done ? 'completed' : ''}">
                    <div class="module-card-header">
                        <div class="module-number">${getModuleIcon(MODULES.indexOf(module))}</div>
                        <div class="module-info">
                            <h3 class="module-name">${module.name}</h3>
                            <p class="module-desc">${module.desc}</p>
                        </div>
                    </div>
                    <div class="module-card-actions">
                        <button class="btn btn-study" onclick="navigateTo('module', ${module.id})">Изучить</button>
                    </div>
                </div>`;
        }).join('');
    }
}

function getModuleIcon(index) {
    const mod = MODULES[index];
    if (mod && mod.icon) return mod.icon;
    return '📚';
}

// === Render: Modules list ===
function renderModules() {
    const completed = getCompletedCount();
    const total = getTotalModules();
    const label = document.getElementById('modulesProgressLabel');
    if (label) label.textContent = completed + ' из ' + total + ' пройдено';

    const grid = document.getElementById('modulesList');
    if (!grid) return;

    grid.innerHTML = MODULES.map((module, i) => {
        const done = progress[module.id] === true;
        return `
            <div class="module-card ${done ? 'completed' : ''}" style="animation-delay: ${i * 0.03}s">
                <div class="module-card-header">
                    <div class="module-number">${getModuleIcon(i)}</div>
                    <div class="module-info">
                        <h3 class="module-name">${module.name}</h3>
                        <p class="module-desc">${module.desc}</p>
                    </div>
                </div>
                <div class="module-card-actions">
                    <button class="btn btn-study" onclick="navigateTo('module', ${module.id})">Изучить</button>
                    <button class="btn btn-complete ${done ? 'is-completed' : ''}" onclick="toggleComplete(${module.id})">
                        ${done ? '✓ Завершено' : 'Завершить'}
                    </button>
                </div>
            </div>`;
    }).join('');
}

// === Markdown Parser ===
function parseMarkdown(text) {
    let html = text
        // Code blocks ```...```
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Inline code `...`
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Unordered lists
        .replace(/^- (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Paragraphs: wrap remaining plain text lines
    html = html.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (/^<(h[1-6]|ul|ol|li|pre|code|blockquote|hr|table)/.test(trimmed)) return line;
        if (/<\/(h[1-6]|ul|ol|li|pre|code|blockquote|table)>$/.test(trimmed)) return line;
        return '<p>' + trimmed + '</p>';
    }).join('\n');

    return html;
}

// === Module Content Loader (files only) ===
function getModuleFile(moduleId) {
    const mod = MODULES.find(m => m.id === moduleId);
    return mod ? mod.file : 'module-' + String(moduleId).padStart(2, '0') + '.md';
}

async function loadModuleContent(moduleId) {
    const file = getModuleFile(moduleId);
    try {
        const response = await fetch('modules/' + file);
        if (!response.ok) return null;
        const text = await response.text();
        return parseMarkdown(text);
    } catch {
        return null;
    }
}

// === Render: Module Detail ===
async function renderModuleDetail(moduleId) {
    const allModules = getAllModules();
    const module = allModules.find(m => m.id === moduleId);
    if (!module) return;

    currentModuleId = moduleId;
    const idx = allModules.indexOf(module);
    const noteText = notes[moduleId] || '';

    const container = document.getElementById('moduleDetail');
    if (!container) return;

    // Check if PDF exists for this module
    const padId = String(moduleId).padStart(2, '0');
    const pdfUrl = 'pdf/module-' + padId + '.pdf';
    let hasPdf = false;
    try {
        const resp = await fetch(pdfUrl, { method: 'HEAD' });
        hasPdf = resp.ok;
    } catch {}

    container.innerHTML = `
        <button class="btn-back" onclick="navigateTo('modules')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Назад к модулям
        </button>
        <div class="module-detail">
            <div class="module-detail-header">
                <div class="detail-number">${getModuleIcon(idx)} Модуль ${module.id}</div>
                <h1 class="detail-title">${module.name}</h1>
                <p class="detail-desc">${module.desc}</p>
            </div>

            <div class="detail-section">
                <div class="module-content" id="moduleContent">
                    <div class="editor-empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <p>Загрузка...</p>
                    </div>
                </div>
            </div>

            ${hasPdf ? `
            <div class="presentation-block">
                <div class="presentation-block__header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>Презентация</span>
                </div>
                <div class="presentation-block__body">
                    <div class="presentation-attached">
                        <div class="presentation-file">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            <span class="presentation-file__name">module-${padId}.pdf</span>
                        </div>
                        <div class="presentation-actions">
                            <button class="btn btn-study" onclick="window.open('${pdfUrl}', '_blank')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                Открыть презентацию
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="notes-compact">
                <div class="notes-compact__header" onclick="toggleNotesBlock()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span>Личные заметки</span>
                    <svg class="notes-compact__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="notes-compact__body" id="notesBody">
                    <textarea class="module-notes" id="moduleNotes" placeholder="Ваши заметки к этому модулю...">${noteText}</textarea>
                    <button class="btn btn-sm btn--outline" onclick="saveModuleNote(${moduleId})">Сохранить заметки</button>
                </div>
            </div>

            <div class="detail-actions">
                <button class="btn btn-complete ${done ? 'is-completed' : ''}" onclick="toggleComplete(${moduleId}); navigateTo('module', ${moduleId});">
                    ${done ? '✓ Завершено' : 'Завершить модуль'}
                </button>
            </div>
        </div>`;

    // Load Markdown content
    const contentEl = document.getElementById('moduleContent');
    const mdContent = await loadModuleContent(moduleId);
    if (contentEl) {
        contentEl.innerHTML = mdContent || '<div class="editor-empty-state"><p>Материал пока не добавлен</p></div>';
    }
}

// === PDF Presentation ===
function openPdfPresentation(moduleId) {
    const padId = String(moduleId).padStart(2, '0');
    window.open('pdf/module-' + padId + '.pdf', '_blank');
}

function toggleNotesBlock() {
    const body = document.getElementById('notesBody');
    const arrow = document.querySelector('.notes-compact__arrow');
    if (!body) return;
    const isOpen = body.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : '';
}

function saveModuleNote(moduleId) {
    const textarea = document.getElementById('moduleNotes');
    if (!textarea) return;
    notes[moduleId] = textarea.value;
    saveNotes(notes);
    showToast('Заметки сохранены');
}

// === Toggle Complete ===
function toggleComplete(moduleId) {
    progress[moduleId] = !progress[moduleId];
    saveProgress(progress);

    const module = MODULES.find(m => m.id === moduleId);
    const status = progress[moduleId] ? 'завершён' : 'возвращён в работу';
    showToast(module.name + ' — ' + status);

    if (currentPage === 'home') renderHome();
    else if (currentPage === 'modules') renderModules();
    else if (currentPage === 'progress') renderProgress();
}

// === Render: Progress ===
function renderProgress() {
    const dash = document.getElementById('progressDashboard');
    if (!dash) return;

    const completed = getCompletedCount();
    const percent = getPercent();
    const total = getTotalModules();
    const allModules = getAllModules();
    const remaining = total - completed;

    dash.innerHTML = `
        <div class="summary-cards">
            <div class="summary-card">
                <div class="summary-icon icon-primary">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div class="summary-value">${total}</div>
                <div class="summary-label">Всего модулей</div>
            </div>
            <div class="summary-card">
                <div class="summary-icon icon-success">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="summary-value">${completed}</div>
                <div class="summary-label">Пройдено</div>
            </div>
            <div class="summary-card">
                <div class="summary-icon icon-warning">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div class="summary-value">${remaining}</div>
                <div class="summary-label">Осталось</div>
            </div>
            <div class="summary-card">
                <div class="summary-icon icon-primary">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <div class="summary-value">${percent}%</div>
                <div class="summary-label">Прогресс</div>
            </div>
        </div>

        <div class="progress-card" style="margin-bottom: 24px">
            <div class="progress-info">
                <span>Общий прогресс</span>
                <span id="progressPercent">${percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: ${percent}%"></div>
            </div>
        </div>

        <div class="progress-modules">
            ${allModules.map((module, i) => {
                const done = progress[module.id] === true;
                return `
                    <div class="progress-module-item ${done ? 'completed' : ''}" style="animation-delay: ${i * 0.03}s" onclick="navigateTo('module', ${module.id})">
                        <div class="pm-number">${getModuleIcon(i)}</div>
                        <div class="pm-title">${module.name}</div>
                        <div class="pm-status ${done ? 'status-completed' : 'status-pending'}">
                            ${done
                                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Пройдено'
                                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> В процессе'}
                        </div>
                    </div>`;
            }).join('')}
        </div>

        ${completed > 0 ? `
            <div style="text-align: center; margin-top: 32px">
                <button class="btn btn-danger" onclick="resetProgress()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    Сбросить прогресс
                </button>
            </div>` : ''}
    `;
}

function resetProgress() {
    if (!confirm('Вы уверены? Весь прогресс будет сброшен.')) return;
    progress = {};
    notes = {};
    saveProgress(progress);
    saveNotes(notes);
    showToast('Прогресс сброшен');
    renderProgress();
    renderHome();
}

// === Checklist Templates ===
const CHECKLIST_TEMPLATES = [
    {
        name: 'Утренний осмотр площадки',
        category: 'daily',
        items: [
            'Проверить освещение площадки',
            'Осмотреть ограждения и входы',
            'Проверить наличие и исправность СИЗ у рабочих',
            'Проверить исправность лестниц и лесов',
            'Убедиться в наличии аптечек',
            'Проверить состояние проездов',
            'Осмотреть технику перед началом работ',
            'Провести утренний инструктаж',
        ]
    },
    {
        name: 'Приёмка бетона',
        category: 'daily',
        items: [
            'Проверить паспорт на бетонную смесь',
            'Убедиться в соответствии марки бетона',
            'Проверить температуру смеси',
            'Проверить подвижность смеси (осадка конуса)',
            'Отобрать образцы для контрольных испытаний',
            'Проверить наличие миксера и его состояние',
            'Убедиться в готовности опалубки',
            'Проверить наличие вибратора',
        ]
    },
    {
        name: 'Контроль арматурных работ',
        category: 'weekly',
        items: [
            'Проверить диаметр и марку арматуры по чертежам',
            'Проверить шаг и количество стержней',
            'Убедиться в правильности вязки/сварки',
            'Проверить величину защитного слоя',
            'Проверить правильность установки закладных деталей',
            'Убедиться в соответствии чертежам СКМ',
            'Проверить сварные соединения (если есть)',
            'Оформить акт скрытых работ',
        ]
    },
    {
        name: 'Проверка опалубки',
        category: 'weekly',
        items: [
            'Проверить геометрию опалубки по чертежам',
            'Убедиться в жёсткости и устойчивости',
            'Проверить вертикальность и горизонтальность',
            'Проверить отсутствие щелей и зазоров',
            'Убедиться в наличии смазки поверхности',
            'Проверить крепления и раскосы',
            'Проверить уровень бетонирования',
            'Оформить акт освидетельствования скрытых работ',
        ]
    },
    {
        name: 'Охрана труда — ежедневный чек-лист',
        category: 'daily',
        items: [
            'Провести утренний инструктаж по ОТ',
            'Проверить наличие СИЗ у всех рабочих',
            'Проверить исправность ограждений',
            'Убедиться в наличии знаков безопасности',
            'Проверить исправность электрооборудования',
            'Проверить состояние лесов и лестниц',
            'Убедиться в наличии аптечек и огнетушителей',
            'Проверить чистоту и порядок на площадке',
            'Проверить наличие допусков у рабочих',
        ]
    },
];

// === Render: Checklists ===
function renderChecklists() {
    const grid = document.getElementById('checklistsGrid');
    const filters = document.getElementById('checklistsFilters');
    if (!grid || !filters) return;

    const categories = ['all', 'daily', 'weekly', 'project', 'custom'];
    const categoryLabels = { all: 'Все', daily: 'Ежедневные', weekly: 'Еженедельные', project: 'Проектные', custom: 'Свои' };

    filters.innerHTML = categories.map(cat =>
        `<button class="filter-btn ${checklistsFilter === cat ? 'active' : ''}" onclick="filterChecklists('${cat}')">${categoryLabels[cat]}</button>`
    ).join('');

    const filtered = checklistsFilter === 'all'
        ? checklistsData.lists
        : checklistsData.lists.filter(l => l.category === checklistsFilter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="checklist-empty" style="grid-column: 1 / -1">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <p>Чек-листов пока нет</p>
                <button class="btn btn--primary" onclick="App.openCreateChecklist()">Создать первый чек-лист</button>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(list => {
        const checked = list.items.filter(i => i.checked).length;
        const total = list.items.length;
        const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
        const date = new Date(list.updatedAt).toLocaleDateString('ru-RU');

        return `
            <div class="checklist-card" onclick="navigateTo('checklist', '${list.id}')">
                <div class="checklist-card__header">
                    <div class="checklist-card__title">${escHtml(list.name)}</div>
                    <div class="checklist-card__category ${list.category}">${categoryLabels[list.category] || list.category}</div>
                </div>
                <div class="checklist-card__progress">
                    <div class="checklist-card__progress-text">${checked} из ${total} пунктов</div>
                    <div class="progress-bar">
                        <div class="progress-bar__fill" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="checklist-card__footer">
                    <span class="checklist-card__date">${date}</span>
                    <button class="checklist-card__delete" onclick="event.stopPropagation(); deleteChecklist('${list.id}')" title="Удалить">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>`;
    }).join('');
}

function filterChecklists(category) {
    checklistsFilter = category;
    renderChecklists();
}

// === Render: Checklist Detail ===
function renderChecklistDetail(listId) {
    const list = checklistsData.lists.find(l => l.id === listId);
    if (!list) { navigateTo('checklists'); return; }

    currentChecklistId = listId;
    const container = document.getElementById('checklistDetail');
    if (!container) return;

    const checked = list.items.filter(i => i.checked).length;
    const total = list.items.length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    const categoryLabels = { daily: 'Ежедневный', weekly: 'Еженедельный', project: 'Проектный', custom: 'Свой' };

    container.innerHTML = `
        <button class="btn-back" onclick="navigateTo('checklists')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Назад к чек-листам
        </button>

        <div class="checklist-detail__header">
            <div>
                <h1 class="checklist-detail__title">${escHtml(list.name)}</h1>
                <span class="checklist-detail__category checklist-card__category ${list.category}">${categoryLabels[list.category] || list.category}</span>
            </div>
        </div>

        <div class="checklist-progress">
            <div class="progress-info">
                <span>${checked} из ${total} выполнено</span>
                <span>${percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar__fill" style="width: ${percent}%"></div>
            </div>
        </div>

        <div class="checklist-items" id="checklistItems">
            ${list.items.map((item, i) => `
                <div class="checklist-item ${item.checked ? 'checked' : ''}">
                    <div class="checklist-item__checkbox" onclick="toggleChecklistItem('${listId}', ${i})"></div>
                    <span class="checklist-item__text">${escHtml(item.text)}</span>
                    <button class="checklist-item__delete" onclick="deleteChecklistItem('${listId}', ${i})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            `).join('')}
        </div>

        <div class="checklist-add">
            <input type="text" id="newChecklistItem" placeholder="Новый пункт..." onkeydown="if(event.key==='Enter') addChecklistItem('${listId}')">
            <button class="btn btn--primary" onclick="addChecklistItem('${listId}')">Добавить</button>
        </div>
    `;
}

// === Checklist CRUD ===
function toggleChecklistItem(listId, itemIndex) {
    const list = checklistsData.lists.find(l => l.id === listId);
    if (!list) return;
    list.items[itemIndex].checked = !list.items[itemIndex].checked;
    list.updatedAt = new Date().toISOString();
    saveChecklists(checklistsData);
    renderChecklistDetail(listId);
}

function addChecklistItem(listId) {
    const input = document.getElementById('newChecklistItem');
    if (!input || !input.value.trim()) return;
    const list = checklistsData.lists.find(l => l.id === listId);
    if (!list) return;
    list.items.push({ text: input.value.trim(), checked: false });
    list.updatedAt = new Date().toISOString();
    saveChecklists(checklistsData);
    renderChecklistDetail(listId);
}

function deleteChecklistItem(listId, itemIndex) {
    const list = checklistsData.lists.find(l => l.id === listId);
    if (!list) return;
    list.items.splice(itemIndex, 1);
    list.updatedAt = new Date().toISOString();
    saveChecklists(checklistsData);
    renderChecklistDetail(listId);
}

function deleteChecklist(listId) {
    if (!confirm('Удалить чек-лист?')) return;
    checklistsData.lists = checklistsData.lists.filter(l => l.id !== listId);
    saveChecklists(checklistsData);
    showToast('Чек-лист удалён');
    renderChecklists();
}

function openCreateChecklist() {
    const name = prompt('Название чек-листа:');
    if (!name || !name.trim()) return;
    const category = prompt('Категория (daily / weekly / project / custom):', 'custom') || 'custom';
    const newList = {
        id: uid(),
        name: name.trim(),
        category: ['daily', 'weekly', 'project', 'custom'].includes(category) ? category : 'custom',
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    checklistsData.lists.push(newList);
    saveChecklists(checklistsData);
    showToast('Чек-лист создан');
    navigateTo('checklist', newList.id);
}

function createFromTemplate(templateIndex) {
    const tpl = CHECKLIST_TEMPLATES[templateIndex];
    if (!tpl) return;
    const newList = {
        id: uid(),
        name: tpl.name,
        category: tpl.category,
        items: tpl.items.map(text => ({ text, checked: false })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    checklistsData.lists.push(newList);
    saveChecklists(checklistsData);
    showToast('Чек-лист из шаблона создан');
    navigateTo('checklist', newList.id);
}

// === Render: Settings ===
function renderSettings() {
    const container = document.getElementById('settingsList');
    if (!container) return;

    const moduleCount = Object.values(progress).filter(Boolean).length;
    const total = getTotalModules();
    const checklistCount = checklistsData.lists.length;

    container.innerHTML = `
        <div class="settings-group">
            <div class="settings-group__title">Данные</div>
            <div class="settings-item">
                <div class="settings-item__info">
                    <div class="settings-item__label">Экспорт данных</div>
                    <div class="settings-item__desc">Сохранить прогресс, заметки и чек-листы в JSON-файл</div>
                </div>
                <button class="btn btn--primary" onclick="exportData()">Экспортировать</button>
            </div>
            <div class="settings-item">
                <div class="settings-item__info">
                    <div class="settings-item__label">Импорт данных</div>
                    <div class="settings-item__desc">Загрузить данные из JSON-файла ( заменит текущие данные)</div>
                </div>
                <button class="btn btn--outline" onclick="importData()">Импортировать</button>
            </div>
            <div class="settings-item">
                <div class="settings-item__info">
                    <div class="settings-item__label">Сбросить всё</div>
                    <div class="settings-item__desc">Удалить весь прогресс, заметки и чек-листы</div>
                </div>
                <button class="btn btn-danger" onclick="resetAll()">Сбросить</button>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-group__title">Шаблоны чек-листов</div>
            ${CHECKLIST_TEMPLATES.map((tpl, i) => `
                <div class="settings-item">
                    <div class="settings-item__info">
                        <div class="settings-item__label">${escHtml(tpl.name)}</div>
                        <div class="settings-item__desc">${tpl.items.length} пунктов · ${tpl.category}</div>
                    </div>
                    <button class="btn btn--outline" onclick="createFromTemplate(${i})">Создать</button>
                </div>
            `).join('')}
        </div>

        <div class="settings-group">
            <div class="settings-group__title">Статистика</div>
            <div class="settings-item">
                <div class="settings-item__info">
                    <div class="settings-item__label">Модулей пройдено</div>
                    <div class="settings-item__desc">${moduleCount} из ${total}</div>
                </div>
            </div>
            <div class="settings-item">
                <div class="settings-item__info">
                    <div class="settings-item__label">Чек-листов создано</div>
                    <div class="settings-item__desc">${checklistCount}</div>
                </div>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-group__title">О приложении</div>
            <div class="settings-item">
                <div class="settings-item__info">
                    <div class="settings-item__label">Master Checklist</div>
                    <div class="settings-item__desc">Версия 1.0 · Построено для строителей</div>
                </div>
            </div>
        </div>
    `;
}

// === Export / Import ===
function exportData() {
    const data = {
        version: 7,
        exportedAt: new Date().toISOString(),
        progress,
        notes,
        checklists: checklistsData,
        theme: document.documentElement.getAttribute('data-theme'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master-checklist-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Данные экспортированы');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.progress) { progress = data.progress; saveProgress(progress); }
                if (data.notes) { notes = data.notes; saveNotes(notes); }
                if (data.checklists) { checklistsData = data.checklists; saveChecklists(checklistsData); }
                if (data.theme) { document.documentElement.setAttribute('data-theme', data.theme); saveTheme(data.theme); }
                showToast('Данные импортированы');
                navigateTo('home');
            } catch {
                showToast('Ошибка: неверный формат файла');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function resetAll() {
    if (!confirm('Вы уверены? ВСЕ данные будут удалены без возможности восстановления.')) return;
    progress = {};
    notes = {};
    checklistsData = { lists: [] };
    saveProgress(progress);
    saveNotes(notes);
    saveChecklists(checklistsData);
    showToast('Все данные сброшены');
    navigateTo('home');
}

// === Helpers ===
function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// === Theme ===
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    saveTheme(next);
}

// === Mobile Menu ===
function toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    mobileNav.classList.toggle('open');
}

// === App ===
const App = {
    goHome() { navigateTo('home'); },
    navigateTo(page) { navigateTo(page); },
    openCreateChecklist() { openCreateChecklist(); },
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    await loadManifest();

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileMenu);

    document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
    document.querySelectorAll('.mobile-nav__btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.page);
            document.getElementById('mobileNav').classList.remove('open');
        });
    });

    navigateTo('home');
});
