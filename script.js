// === Module Data (loaded from modules/manifest.json) ===
let MODULES = [];

async function loadManifest() {
    try {
        const response = await fetch('modules/manifest.json');
        if (!response.ok) throw new Error('Manifest not found');
        MODULES = await response.json();
    } catch (err) {
        console.error('Failed to load manifest:', err);
        MODULES = [];
    }
}

// === Storage (theme + progress only) ===
const THEME_KEY = 'master_academy_theme';
const PROGRESS_KEY = 'master_academy_progress';

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
}

function saveProgress(data) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

// === State ===
let progress = loadProgress();
let currentPage = 'home';
let currentModuleId = null;

// === Helpers ===
function getCompletedCount() {
    return Object.values(progress).filter(Boolean).length;
}

function getTotalModules() {
    return MODULES.length;
}

function getPercent() {
    const total = getTotalModules();
    return total > 0 ? Math.round((getCompletedCount() / total) * 100) : 0;
}

function getModuleIcon(index) {
    const mod = MODULES[index];
    if (mod && mod.icon) return mod.icon;
    return '📚';
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    else if (page === 'search') initSearch();
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
        let preview = MODULES.filter(m => !progress[m.id]).slice(0, 3);
        if (preview.length < 3) {
            const remaining = 3 - preview.length;
            const extra = MODULES
                .filter(m => !preview.includes(m))
                .slice(0, remaining);
            preview = [...preview, ...extra];
        }

        modulesPreview.innerHTML = preview.map((module) => {
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
    // Strip first # heading — it's already shown in module detail header
    text = text.replace(/^#\s+.+\n?/, '');

    // Split into blocks separated by blank lines
    const blocks = text.split(/\n{2,}/);
    const htmlBlocks = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        // Code block
        if (/^```/.test(trimmed)) {
            return trimmed.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        }

        // List items
        const lines = trimmed.split('\n');
        const isList = lines.every(l => /^[-*]\s/.test(l.trim()));
        if (isList) {
            const items = lines.map(l => '<li>' + l.trim().replace(/^[-*]\s+/, '') + '</li>').join('\n');
            return '<ul>\n' + items + '\n</ul>';
        }

        // Heading
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
        if (headingMatch) {
            const level = headingMatch[1].length;
            return '<h' + level + '>' + headingMatch[2] + '</h' + level + '>';
        }

        // Horizontal rule
        if (/^---+$/.test(trimmed)) {
            return '<hr style="border:none;border-top:1px solid var(--border);margin:24px 0">';
        }

        // Paragraph — wrap each line
        return lines.map(l => {
            const lt = l.trim();
            if (!lt) return '';
            // Already a tag line
            if (/^<(h[1-6]|ul|ol|li|pre|code|blockquote|hr|table|img)/.test(lt)) return lt;
            // Inline formatting
            let formatted = lt
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0">');
            return '<p>' + formatted + '</p>';
        }).join('\n');
    });

    return htmlBlocks.filter(b => b).join('\n\n');
}

// === Module Content ===
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

async function loadModuleRaw(moduleId) {
    const file = getModuleFile(moduleId);
    try {
        const response = await fetch('modules/' + file);
        if (!response.ok) return null;
        return await response.text();
    } catch {
        return null;
    }
}

// === Render: Module Detail ===
async function renderModuleDetail(moduleId) {
    const allModules = MODULES;
    const module = allModules.find(m => m.id === moduleId);
    if (!module) return;

    currentModuleId = moduleId;
    const idx = allModules.indexOf(module);
    const done = progress[moduleId] === true;

    const container = document.getElementById('moduleDetail');
    if (!container) return;

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
                                Открыть PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="detail-actions">
                <button class="btn btn-complete ${done ? 'is-completed' : ''}" onclick="toggleComplete(${moduleId}); navigateTo('module', ${moduleId});">
                    ${done ? '✓ Завершено' : 'Завершить модуль'}
                </button>
            </div>
        </div>`;

    const contentEl = document.getElementById('moduleContent');
    const mdContent = await loadModuleContent(moduleId);
    if (contentEl) {
        contentEl.innerHTML = mdContent || '<div class="editor-empty-state"><p>Материал пока не добавлен</p></div>';
    }
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
            ${MODULES.map((module, i) => {
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
    saveProgress(progress);
    showToast('Прогресс сброшен');
    renderProgress();
    renderHome();
}

// === Search ===
let searchCache = {};

function initSearch() {
    const input = document.getElementById('searchInput');
    if (input && input.value) {
        performSearch(input.value);
    }
}

async function performSearch(query) {
    const resultsEl = document.getElementById('searchResults');
    if (!resultsEl) return;

    const q = query.trim().toLowerCase();
    if (!q) {
        resultsEl.innerHTML = '';
        return;
    }

    resultsEl.innerHTML = '<div class="search-loading">Поиск...</div>';

    const results = [];

    for (const module of MODULES) {
        let rawText = searchCache[module.id];
        if (rawText === undefined) {
            rawText = await loadModuleRaw(module.id);
            searchCache[module.id] = rawText || '';
            rawText = searchCache[module.id];
        }

        const searchable = ((module.name || '') + ' ' + (module.desc || '') + ' ' + rawText).toLowerCase();
        if (searchable.includes(q)) {
            let snippet = '';
            if (rawText) {
                const plainText = rawText.replace(/[#*`\[\]!>-]/g, ' ').replace(/\s+/g, ' ');
                const idx = plainText.toLowerCase().indexOf(q);
                if (idx !== -1) {
                    const start = Math.max(0, idx - 80);
                    const end = Math.min(plainText.length, idx + q.length + 80);
                    snippet = (start > 0 ? '...' : '') + plainText.substring(start, end).trim() + (end < plainText.length ? '...' : '');
                }
            }
            results.push({ module, snippet });
        }
    }

    if (results.length === 0) {
        resultsEl.innerHTML = '<div class="search-empty">Ничего не найдено</div>';
        return;
    }

    resultsEl.innerHTML = results.map(r => `
        <div class="search-result" onclick="navigateTo('module', ${r.module.id})">
            <div class="search-result__header">
                <span class="search-result__icon">${getModuleIcon(MODULES.indexOf(r.module))}</span>
                <div>
                    <div class="search-result__title">${escHtml(r.module.name)}</div>
                    <div class="search-result__desc">${escHtml(r.module.desc)}</div>
                </div>
            </div>
            ${r.snippet ? `<div class="search-result__snippet">${escHtml(r.snippet)}</div>` : ''}
        </div>
    `).join('');
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
