// --- Configuration & State ---
const COLUMN_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const DEFAULT_DATA = [
    { id: 'col-1', title: 'To Do', color: '#ef4444', cards: ['ออกแบบ UX/UI', 'ประชุมทีม'] },
    { id: 'col-2', title: 'In Progress', color: '#f59e0b', cards: ['ทำหน้า Login'] },
    { id: 'col-3', title: 'Done', color: '#10b981', cards: ['Setup Server'] }
];

let boardData = [];
let draggedItem = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadBoard();
    setupTheme(); // Initialize theme
});

function loadBoard() {
    const stored = localStorage.getItem('modernKanbanData');
    boardData = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_DATA));
    renderBoard();
}

function saveBoard() {
    // Construct data from DOM to capture order and text edits
    const newBoardData = [];
    document.querySelectorAll('.column').forEach(col => {
        const id = col.id;
        const title = col.querySelector('.column-title').innerText;
        const color = col.dataset.color;
        const cards = [];
        
        col.querySelectorAll('.card').forEach(card => {
            const clone = card.cloneNode(true);
            const delBtn = clone.querySelector('.btn-delete-card');
            if(delBtn) delBtn.remove();
            cards.push(clone.innerText.trim());
        });

        newBoardData.push({ id, title, color, cards });
    });

    boardData = newBoardData;
    localStorage.setItem('modernKanbanData', JSON.stringify(boardData));
    updateCounts();
}

function resetBoard() {
    if(confirm('ต้องการรีเซ็ตเป็นค่าเริ่มต้นหรือไม่? ข้อมูลทั้งหมดจะหายไป')) {
        localStorage.removeItem('modernKanbanData');
        loadBoard();
    }
}

// --- Theme Logic ---
function setupTheme() {
    const themeBtn = document.getElementById('theme-btn');
    const icon = themeBtn.querySelector('i');
    
    // Check saved preference or system preference
    const savedTheme = localStorage.getItem('kanbanTheme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.body.classList.add('dark-mode');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-btn');
    const icon = themeBtn.querySelector('i');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('kanbanTheme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        localStorage.setItem('kanbanTheme', 'light');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// --- Rendering ---
function renderBoard() {
    const board = document.getElementById('board');
    const addBtn = document.getElementById('add-column-wrapper');
    
    // Clear existing columns
    document.querySelectorAll('.column').forEach(el => el.remove());

    boardData.forEach(col => {
        const colEl = createColumnHTML(col);
        board.insertBefore(colEl, addBtn);
    });
    
    updateCounts();
}

function createColumnHTML(colData) {
    const col = document.createElement('div');
    col.className = 'column';
    col.id = colData.id;
    col.dataset.color = colData.color;

    col.innerHTML = `
        <div class="column-header">
            <div class="column-title-wrapper">
                <div class="col-color-indicator" style="background: ${colData.color}"></div>
                <div class="column-title" contenteditable="true" 
                     onblur="saveBoard()" onkeydown="handleEnter(event)">${colData.title}</div>
                <span class="card-count">0</span>
            </div>
            <button class="btn-delete-col" onclick="deleteColumn('${colData.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="card-list" ondrop="drop(event)" ondragover="allowDrop(event)">
            </div>
        <div class="add-card-wrapper">
            <button class="btn-show-add-form" onclick="toggleAddForm('${colData.id}', true)">
                <i class="fa-solid fa-plus"></i> เพิ่มการ์ด
            </button>
            <div class="add-card-form">
                <textarea class="add-input" placeholder="ใส่รายละเอียด..." rows="2"></textarea>
                <div class="form-actions">
                    <button class="btn-confirm" onclick="addCard('${colData.id}')">เพิ่ม</button>
                    <button class="btn-cancel" onclick="toggleAddForm('${colData.id}', false)">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    const list = col.querySelector('.card-list');
    colData.cards.forEach(text => {
        list.appendChild(createCardHTML(text));
    });

    return col;
}

function createCardHTML(text) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.innerText = text;

    // Delete Button
    const btn = document.createElement('button');
    btn.className = 'btn-delete-card';
    btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    btn.onclick = (e) => {
        e.stopPropagation();
        if(confirm('ลบการ์ดนี้?')) {
            card.remove();
            saveBoard();
        }
    };
    card.appendChild(btn);

    // Events
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);
    card.addEventListener('dblclick', () => {
        card.contentEditable = true;
        card.focus();
        btn.style.display = 'none';
    });
    card.addEventListener('blur', () => {
        card.contentEditable = false;
        btn.style.display = '';
        saveBoard();
    });
    card.addEventListener('keydown', handleEnter);

    return card;
}

// --- Logic: Columns ---
function createNewColumn() {
    const title = prompt("ชื่อคอลัมน์ใหม่:");
    if(title && title.trim()) {
        const newCol = {
            id: 'col-' + Date.now(),
            title: title.trim(),
            color: COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)],
            cards: []
        };
        
        boardData.push(newCol);
        const board = document.getElementById('board');
        const addBtn = document.getElementById('add-column-wrapper');
        
        board.insertBefore(createColumnHTML(newCol), addBtn);
        saveBoard();
        
        addBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function deleteColumn(id) {
    const col = document.getElementById(id);
    const hasCards = col.querySelectorAll('.card').length > 0;
    
    if(hasCards) {
        if(!confirm('คอลัมน์นี้มีการ์ดอยู่ ต้องการลบทั้งหมดหรือไม่?')) return;
    } else {
        if(!confirm('ลบคอลัมน์นี้?')) return;
    }
    
    col.remove();
    saveBoard();
}

// --- Logic: Cards ---
function toggleAddForm(colId, show) {
    const col = document.getElementById(colId);
    const form = col.querySelector('.add-card-form');
    const btn = col.querySelector('.btn-show-add-form');
    const input = form.querySelector('.add-input');

    if(show) {
        form.classList.add('active');
        btn.style.display = 'none';
        input.focus();
    } else {
        form.classList.remove('active');
        btn.style.display = 'flex';
        input.value = '';
    }
}

function addCard(colId) {
    const col = document.getElementById(colId);
    const input = col.querySelector('.add-input');
    const text = input.value.trim();

    if(text) {
        const list = col.querySelector('.card-list');
        list.appendChild(createCardHTML(text));
        saveBoard();
        input.value = '';
        input.focus();
    }
}

// --- Logic: Drag & Drop ---
function dragStart() {
    draggedItem = this;
    setTimeout(() => this.classList.add('dragging'), 0);
}

function dragEnd() {
    this.classList.remove('dragging');
    draggedItem = null;
    saveBoard();
}

function allowDrop(e) {
    e.preventDefault();
    const container = e.currentTarget;
    const afterElement = getDragAfterElement(container, e.clientY);
    
    if (afterElement == null) {
        container.appendChild(draggedItem);
    } else {
        container.insertBefore(draggedItem, afterElement);
    }
}

function drop(e) {
    e.preventDefault();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- Utilities ---
function updateCounts() {
    document.querySelectorAll('.column').forEach(col => {
        const count = col.querySelectorAll('.card').length;
        col.querySelector('.card-count').innerText = count;
    });
}

function handleEnter(e) {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.target.blur();
    }
}
