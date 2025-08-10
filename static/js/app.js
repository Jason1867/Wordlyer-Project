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

// Create grid
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
            cell.addEventListener('contextmenu', onRightClick);

            cell.addEventListener('focus', () => cell.classList.add('focused'));
            cell.addEventListener('blur', () => cell.classList.remove('focused'));

            setupTapHandlers(cell);

            cells[r][c] = cell;
            grid.appendChild(cell);
        }
    }
    cells[0][0].focus();
}

// Handle taps for mobile and clicks for desktop
function setupTapHandlers(cell) {
    let lastTap = 0;

    cell.addEventListener('touchend', (e) => {
        const currentTime = Date.now();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (!cell.textContent) return;
            cellStates[row][col] = (cellStates[row][col] + 1) % 3;
            updateCellColor(row, col);
            lastTap = 0;
        } else {
            placeCursorAtEnd(cell);
            cell.focus();
            lastTap = currentTime;
        }
    });

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
        analyzeBtn.click();
        return;
    }

    if (e.key === 'Backspace') {
        e.preventDefault();
        this.textContent = '';
        cellStates[r][c] = 3;
        updateCellColor(r, c);

        if (c > 0) {
            cells[r][c - 1].focus();
        } else if (r > 0) {
            cells[r - 1][COLS - 1].focus();
        }
        return;
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        this.textContent = e.key.toUpperCase();
        cellStates[r][c] = 0;
        updateCellColor(r, c);

        if (c < COLS - 1) {
            cells[r][c + 1].focus();
        } else if (r < ROWS - 1) {
            cells[r + 1][0].focus();
        }
        return;
    }

    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        let nr = r, nc = c;
        if (e.key === 'ArrowRight') { nc++; if (nc >= COLS) { nc = 0; nr = (nr + 1) % ROWS; } }
        else if (e.key === 'ArrowLeft') { nc--; if (nc < 0) { nc = COLS - 1; nr = (nr - 1 + ROWS) % ROWS; } }
        else if (e.key === 'ArrowUp') { nr = (nr - 1 + ROWS) % ROWS; }
        else if (e.key === 'ArrowDown') { nr = (nr + 1) % ROWS; }
        cells[nr][nc].focus();
    } else {
        e.preventDefault();
    }
}

function onRightClick(e) {
    e.preventDefault();
    const r = parseInt(this.dataset.row);
    const c = parseInt(this.dataset.col);
    if (!cells[r][c].textContent) return;
    cellStates[r][c] = (cellStates[r][c] + 1) % 3;
    updateCellColor(r, c);
}

function updateCellColor(r, c) {
    const cell = cells[r][c];
    const hasLetter = cell.textContent.trim().length > 0;

    if (!hasLetter) {
        cellStates[r][c] = 3;
        cell.classList.remove('state-0', 'state-1', 'state-2');
        cell.classList.add('state-3');
    } else {
        if (cellStates[r][c] === 3) cellStates[r][c] = 0;
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


// Analyze without backend
analyzeBtn.addEventListener('click', () => {
    console.log('Analyze clicked');

    const guesses = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const letter = cells[r][c].textContent.toLowerCase();
            const state = cellStates[r][c];
            console.log(`Cell[${r}][${c}] = letter: '${letter}', state: ${state}`);
            row.push({ letter, state });
        }
        guesses.push(row);
    }
    console.log('Guesses:', guesses);

    const validWords = filterValidWords(WORDS, guesses);
    console.log('Valid words:', validWords);

    if (validWords.error) {
        result.textContent = validWords.error;
        showWordsBtn.style.display = 'none';
        return;
    }

    if (!validWords.length) {
        result.textContent = "No valid words found.";
        showWordsBtn.style.display = 'none';
        return;
    }

    const probability = 1 / validWords.length;
    result.textContent = `Correct Guess Probability: ${(probability * 100).toFixed(2)}% (${validWords.length} possible words)`;

    showWordsBtn.style.display = 'inline-block';
    showWordsBtn.onclick = () => {
        validWordsList.innerHTML = '';
        validWords.forEach(w => {
            const li = document.createElement('li');
            li.textContent = w;
            validWordsList.appendChild(li);
        });
        wordsModal.style.display = 'flex';
    };
});


function filterValidWords(wordList, guesses) {
    return wordList.filter(word => {
        return guesses.every(row => {
            return row.every((cell, i) => {
                if (cell.state === 0) return word[i] !== cell.letter && !word.includes(cell.letter);
                if (cell.state === 1) return word.includes(cell.letter) && word[i] !== cell.letter;
                if (cell.state === 2) return word[i] === cell.letter;
                return true;
            });
        });
    });
}

closeModal.addEventListener('click', () => {
    wordsModal.style.display = 'none';
});

window.onload = () => {
    cells[0][0].focus();
};

createGrid();
