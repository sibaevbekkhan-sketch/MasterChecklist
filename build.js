const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, 'modules');
const MANIFEST_PATH = path.join(MODULES_DIR, 'manifest.json');

const DEFAULT_ICONS = ['👷','📅','📄','⛑️','✅','👷‍♂️','🚜','📦','⚖️','🔩','🔗','🪵','🧱','🏗️','📋','🤝','💼','📈','🔧','📐','🪜','⚡','🔩','🪛','📐','🏗️','🧰'];

function extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
}

function extractDesc(content) {
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```') && !trimmed.startsWith('---')) {
            return trimmed.substring(0, 150);
        }
    }
    return '';
}

function generateManifest() {
    const files = fs.readdirSync(MODULES_DIR)
        .filter(f => /^module-\d+\.md$/.test(f))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
        });

    const manifest = files.map((file, index) => {
        const content = fs.readFileSync(path.join(MODULES_DIR, file), 'utf-8');
        const id = parseInt(file.match(/\d+/)[0]);
        const name = extractTitle(content) || `Модуль ${id}`;
        const desc = extractDesc(content);
        const icon = DEFAULT_ICONS[index] || '📚';

        return { id, file, name, desc, icon };
    });

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 4), 'utf-8');
    console.log(`Generated manifest.json with ${manifest.length} modules`);
}

generateManifest();
