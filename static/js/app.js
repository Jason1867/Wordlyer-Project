const grid = document.getElementById('grid');
const analyzeBtn = document.getElementById('analyzeBtn');
const result = document.getElementById('result');
const showWordsBtn = document.getElementById('showWordsBtn');
const wordsModal = document.getElementById('wordsModal');
const closeModal = document.getElementById('closeModal');
const validWordsList = document.getElementById('validWordsList');

const ROWS = 6;
const COLS = 5;
const STATE_COLORS = ['#787c7e', '#c9b458', '#6aaa64'];

let cells = [];
let cellStates = []; // 2D array holding state (0/1/2)

function createGrid() {
    for (let r = 0; r < ROWS; r++) {
        cells[r] = [];
        cellStates[r] = [];
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', 'state-3');
            cell.setAttribute('contenteditable', 'true');
            cell.setAttribute('spellcheck', 'false');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cellStates[r][c] = 3;
            cell.textContent = '';

            cell.addEventListener('keydown', onKeyDown);
            // Remove old click and double tap listeners here:
            // cell.addEventListener('click', onLeftClick);
            // cell.addEventListener('contextmenu', onRightClick);

            cell.addEventListener('contextmenu', onRightClick);

            cell.addEventListener('focus', () => {
                cell.classList.add('focused');
            });
            cell.addEventListener('blur', () => {
                cell.classList.remove('focused');
            });

            // New combined tap handler for mobile and desktop
            setupTapHandlers(cell);

            cells[r][c] = cell;
            grid.appendChild(cell);
        }
    }
    cells[0][0].focus();
}

// New combined tap handler function:
function setupTapHandlers(cell) {
    let lastTap = 0;

    cell.addEventListener('touchend', (e) => {
        const currentTime = Date.now();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected — cycle state like right click
            e.preventDefault();
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (!cell.textContent) return;
            cellStates[row][col] = (cellStates[row][col] + 1) % 3;
            updateCellColor(row, col);
            lastTap = 0;
        } else {
            // Single tap — focus and place cursor immediately
            placeCursorAtEnd(cell);
            cell.focus();
            lastTap = currentTime;
        }
    });

    // Desktop fallback — only on non-touch devices
    cell.addEventListener('click', (e) => {
        if (!('ontouchstart' in window)) {
            placeCursorAtEnd(cell);
            cell.focus();
        }
    });
}

function onKeyDown(e) {
    const r = parseInt(this.dataset.row);
    const c = parseInt(this.dataset.col);

    if (e.key === 'Enter') {
        e.preventDefault();
        analyzeBtn.click();  // Trigger analyze button click
        return;
    }

    if (e.key === 'Backspace') {
        e.preventDefault();
        this.textContent = '';
        cellStates[r][c] = 3;
        updateCellColor(r, c);

        // Move to previous cell
        if (c > 0) {
            cells[r][c - 1].focus();
        } else if (r > 0) {
            cells[r - 1][COLS - 1].focus();
        }
        return;
    }

    // Only allow letters A-Z, max 1 char
    if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        this.textContent = e.key.toUpperCase();
        cellStates[r][c] = 0;
        updateCellColor(r, c);

        // Move to next cell
        if (c < COLS - 1) {
            cells[r][c + 1].focus();
        } else if (r < ROWS - 1) {
            cells[r + 1][0].focus();
        }
        return;
    }

    // Arrow keys navigation with wrapping
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        let nr = r;
        let nc = c;
        if (e.key === 'ArrowRight') {
            nc++;
            if (nc >= COLS) {
                nc = 0;
                nr++;
                if (nr >= ROWS) nr = 0;
            }
        } else if (e.key === 'ArrowLeft') {
            nc--;
            if (nc < 0) {
                nc = COLS - 1;
                nr--;
                if (nr < 0) nr = ROWS - 1;
            }
        } else if (e.key === 'ArrowUp') {
            nr--;
            if (nr < 0) nr = ROWS - 1;
        } else if (e.key === 'ArrowDown') {
            nr++;
            if (nr >= ROWS) nr = 0;
        }
        cells[nr][nc].focus();
        return;
    }

    // Block other keys
    e.preventDefault();
}

function onRightClick(e) {
    e.preventDefault();
    const r = parseInt(this.dataset.row);
    const c = parseInt(this.dataset.col);

    if (!cells[r][c].textContent) return; // ignore empty cells

    cellStates[r][c] = (cellStates[r][c] + 1) % 3;
    updateCellColor(r, c);
}

function updateCellColor(r, c) {
    const cell = cells[r][c];
    const hasLetter = cell.textContent.trim().length > 0;

    if (!hasLetter) {
        // Empty cell: state 3 (empty)
        cellStates[r][c] = 3;
        cell.classList.remove('state-0', 'state-1', 'state-2');
        cell.classList.add('state-3');
    } else {
        // Letter present: keep current state but if it was 3, reset to 0
        if (cellStates[r][c] === 3) {
            cellStates[r][c] = 0;
        }
        cell.classList.remove('state-3', 'state-0', 'state-1', 'state-2');
        cell.classList.add(`state-${cellStates[r][c]}`);
    }
}

function placeCursorAtEnd(element) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}

analyzeBtn.addEventListener('click', () => {
    const payload = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            row.push({
                letter: cells[r][c].textContent.toLowerCase(),
                state: cellStates[r][c]
            });
        }
        payload.push(row);
    }

    fetch('/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            result.textContent = data.error;
            showWordsBtn.style.display = 'none';
            return;
        }
        result.textContent = `Correct Guess Probability: ${(data.probability * 100).toFixed(2)}% (${data.valid_words.length} possible words)`;
        showWordsBtn.style.display = data.valid_words.length ? 'inline-block' : 'none';

        showWordsBtn.onclick = () => {
            validWordsList.innerHTML = '';
            data.valid_words.forEach(w => {
                const li = document.createElement('li');
                li.textContent = w;
                validWordsList.appendChild(li);
            });
            wordsModal.style.display = 'flex';
        };
    })
    .catch(err => {
        result.textContent = "Error analyzing words.";
        showWordsBtn.style.display = 'none';
        console.error(err);
    });
});

document.getElementById('closeModal').addEventListener('click', () => {
    wordsModal.style.display = 'none';
});

window.onload = () => {
    cells[0][0].focus();
};

createGrid();
