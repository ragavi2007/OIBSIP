/* ============================================================
   TASKO — To-Do Web Application
   script.js
   Vanilla JS · LocalStorage · Full CRUD · Toast system
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────
   1. STATE
   ───────────────────────────────────────────── */

/**
 * In-memory task store. Each task:
 * {
 *   id:          string  — unique ID
 *   text:        string  — task content
 *   done:        boolean — completion state
 *   createdAt:   number  — Unix timestamp
 *   completedAt: number|null
 * }
 */
let tasks = [];

/* ─────────────────────────────────────────────
   2. DOM REFS
   ───────────────────────────────────────────── */
const taskInput      = document.getElementById('taskInput');
const addBtn         = document.getElementById('addBtn');
const validationMsg  = document.getElementById('validationMsg');
const charCounter    = document.getElementById('charCounter');
const pendingList    = document.getElementById('pendingList');
const completedList  = document.getElementById('completedList');
const pendingEmpty   = document.getElementById('pendingEmpty');
const completedEmpty = document.getElementById('completedEmpty');
const pendingCount   = document.getElementById('pendingCount');
const completedCount = document.getElementById('completedCount');
const totalCount     = document.getElementById('totalCount');
const pendingBadge   = document.getElementById('pendingBadge');
const completedBadge = document.getElementById('completedBadge');
const ringFill       = document.getElementById('ringFill');
const ringPct        = document.getElementById('ringPct');
const clearAllBtn    = document.getElementById('clearAllBtn');
const toastContainer = document.getElementById('toastContainer');

/* SVG ring circumference (r=32 → 2π×32 ≈ 201.06) */
const RING_CIRC = 201.06;

/* ─────────────────────────────────────────────
   3. UTILITIES
   ───────────────────────────────────────────── */

/** Generate a unique ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Format a timestamp for display */
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMs / 3600000);

  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs  < 24) return `${diffHrs}h ago`;

  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ─────────────────────────────────────────────
   4. LOCALSTORAGE
   ───────────────────────────────────────────── */

/** Persist current task array to localStorage */
function saveTasks() {
  try {
    localStorage.setItem('tasko_tasks', JSON.stringify(tasks));
  } catch (e) {
    console.warn('LocalStorage write failed:', e);
  }
}

/** Load tasks from localStorage on startup */
function loadTasks() {
  try {
    const raw = localStorage.getItem('tasko_tasks');
    if (raw) tasks = JSON.parse(raw);
  } catch (e) {
    tasks = [];
    console.warn('LocalStorage read failed:', e);
  }
}

/* ─────────────────────────────────────────────
   5. VALIDATION
   ───────────────────────────────────────────── */

/**
 * Show or hide the validation message under the input.
 * @param {string} msg - empty string to hide
 */
function setValidation(msg) {
  validationMsg.textContent = msg;
  if (msg) {
    validationMsg.classList.add('show');
    // Prefix with an icon
    validationMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
  } else {
    validationMsg.classList.remove('show');
  }
}

/* ─────────────────────────────────────────────
   6. TOAST NOTIFICATIONS
   ───────────────────────────────────────────── */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 2800) {
  const iconMap = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    info:    'fa-circle-info',
    warning: 'fa-triangle-exclamation',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${iconMap[type]}"></i><span>${message}</span>`;

  toastContainer.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ─────────────────────────────────────────────
   7. RENDER — Task Card
   ───────────────────────────────────────────── */

/**
 * Build and return a task card <li> element.
 * @param {object} task
 * @returns {HTMLLIElement}
 */
function buildCard(task) {
  const li = document.createElement('li');
  li.className = `task-card${task.done ? ' done-card' : ''}`;
  li.dataset.id = task.id;

  const timeLabel = task.done && task.completedAt
    ? `Completed ${formatTime(task.completedAt)}`
    : `Added ${formatTime(task.createdAt)}`;

  const timeIcon = task.done ? 'fa-circle-check' : 'fa-clock';

  li.innerHTML = `
    <div class="task-body">
      <input
        type="checkbox"
        class="task-checkbox"
        aria-label="Mark task as ${task.done ? 'incomplete' : 'complete'}"
        ${task.done ? 'checked' : ''}
      />
      <span class="task-text">${escapeHtml(task.text)}</span>
    </div>
    <div class="task-footer">
      <span class="task-time">
        <i class="fa-regular ${timeIcon}"></i>
        ${timeLabel}
      </span>
      <div class="task-actions">
        ${!task.done ? `
          <button class="task-btn btn-edit" data-action="edit" title="Edit task" aria-label="Edit task">
            <i class="fa-solid fa-pen"></i>
          </button>` : `
          <button class="task-btn btn-undo" data-action="undo" title="Move back to pending" aria-label="Undo completion">
            <i class="fa-solid fa-rotate-left"></i>
          </button>`
        }
        <button class="task-btn btn-delete" data-action="delete" title="Delete task" aria-label="Delete task">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;

  /* Attach event listeners */

  // Checkbox — toggle completion
  const checkbox = li.querySelector('.task-checkbox');
  checkbox.addEventListener('change', () => toggleTask(task.id));

  // Action buttons (edit / undo / delete)
  li.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'edit')   startEdit(task.id, li);
    if (action === 'save')   saveEdit(task.id, li);
    if (action === 'delete') deleteTask(task.id, li);
    if (action === 'undo')   undoTask(task.id);
  });

  return li;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────────
   8. RENDER — Full List Re-Render
   ───────────────────────────────────────────── */

/** Re-render both lists and update all counters */
function renderAll() {
  const pending   = tasks.filter(t => !t.done);
  const completed = tasks.filter(t => t.done);

  // Pending list
  pendingList.innerHTML = '';
  pending.forEach(t => pendingList.appendChild(buildCard(t)));

  // Completed list
  completedList.innerHTML = '';
  completed.forEach(t => completedList.appendChild(buildCard(t)));

  // Empty states
  pendingEmpty.classList.toggle('show', pending.length === 0);
  completedEmpty.classList.toggle('show', completed.length === 0);

  // Counters
  pendingCount.textContent   = pending.length;
  completedCount.textContent = completed.length;
  totalCount.textContent     = tasks.length;
  pendingBadge.textContent   = pending.length;
  completedBadge.textContent = completed.length;

  // Clear-all button visibility
  clearAllBtn.classList.toggle('active', completed.length > 0);

  // Progress ring
  updateRing(pending.length, completed.length);
}

/* ─────────────────────────────────────────────
   9. PROGRESS RING
   ───────────────────────────────────────────── */

/**
 * Update the SVG ring to reflect completion percentage.
 * @param {number} pendingN
 * @param {number} doneN
 */
function updateRing(pendingN, doneN) {
  const total = pendingN + doneN;
  const pct   = total === 0 ? 0 : Math.round((doneN / total) * 100);

  // Stroke offset: full = RING_CIRC, empty = 0
  const offset = RING_CIRC - (pct / 100) * RING_CIRC;
  ringFill.style.strokeDashoffset = offset;

  // Colour: green when 100%, violet otherwise
  ringFill.style.stroke = pct === 100 ? '#10B981' : '#7C3AED';

  ringPct.textContent = `${pct}%`;
}

/* ─────────────────────────────────────────────
   10. CRUD OPERATIONS
   ───────────────────────────────────────────── */

/** Add a new task */
function addTask() {
  const raw  = taskInput.value.trim();

  // Validation
  if (!raw) {
    setValidation('Please enter a task before adding.');
    taskInput.focus();
    return;
  }

  if (raw.length > 200) {
    setValidation('Task is too long — keep it under 200 characters.');
    return;
  }

  // Duplicate check (optional UX nicety)
  const isDuplicate = tasks.some(t => !t.done && t.text.toLowerCase() === raw.toLowerCase());
  if (isDuplicate) {
    setValidation('This task already exists in your pending list.');
    return;
  }

  setValidation('');

  const task = {
    id:          uid(),
    text:        raw,
    done:        false,
    createdAt:   Date.now(),
    completedAt: null,
  };

  tasks.unshift(task); // newest first
  saveTasks();
  renderAll();

  taskInput.value = '';
  charCounter.textContent = '0/200';
  charCounter.className = 'char-counter';

  showToast('Task added!', 'success');
}

/** Toggle a task's completion state */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.done        = !task.done;
  task.completedAt = task.done ? Date.now() : null;

  saveTasks();
  renderAll();

  showToast(
    task.done ? 'Task completed! 🎉' : 'Task moved back to pending.',
    task.done ? 'success' : 'info'
  );
}

/** Undo completion of a task (move back to pending) */
function undoTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.done        = false;
  task.completedAt = null;

  saveTasks();
  renderAll();
  showToast('Task moved back to pending.', 'info');
}

/**
 * Enter inline edit mode on a card.
 * @param {string} id
 * @param {HTMLLIElement} li
 */
function startEdit(id, li) {
  const task     = tasks.find(t => t.id === id);
  if (!task) return;

  const textSpan = li.querySelector('.task-text');
  const editBtn  = li.querySelector('[data-action="edit"]');

  // Replace text span with input
  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'task-edit-input';
  input.value     = task.text;
  input.maxLength = 200;
  input.setAttribute('aria-label', 'Edit task text');

  textSpan.replaceWith(input);
  input.focus();
  input.select();

  // Swap Edit → Save button
  editBtn.dataset.action = 'save';
  editBtn.className      = 'task-btn btn-save';
  editBtn.title          = 'Save changes';
  editBtn.setAttribute('aria-label', 'Save changes');
  editBtn.innerHTML      = '<i class="fa-solid fa-check"></i>';

  // Save on Enter, cancel on Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveEdit(id, li);
    if (e.key === 'Escape') cancelEdit(id, li);
  });
}

/**
 * Save the inline edit.
 * @param {string} id
 * @param {HTMLLIElement} li
 */
function saveEdit(id, li) {
  const task  = tasks.find(t => t.id === id);
  if (!task) return;

  const input = li.querySelector('.task-edit-input');
  if (!input) return;

  const newText = input.value.trim();

  if (!newText) {
    input.style.borderColor = '#F43F5E';
    input.focus();
    showToast('Task text cannot be empty.', 'error');
    return;
  }

  task.text = newText;
  saveTasks();
  renderAll();
  showToast('Task updated.', 'info');
}

/**
 * Cancel inline edit — re-render to restore state.
 * @param {string} id
 * @param {HTMLLIElement} li
 */
function cancelEdit(id, li) {
  // Re-render to restore original card state
  renderAll();
}

/**
 * Delete a task with exit animation.
 * @param {string} id
 * @param {HTMLLIElement} li
 */
function deleteTask(id, li) {
  li.classList.add('removing');

  li.addEventListener('animationend', () => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderAll();
  }, { once: true });

  showToast('Task deleted.', 'warning');
}

/** Delete all completed tasks */
function clearCompleted() {
  const completedTasks = tasks.filter(t => t.done);
  if (completedTasks.length === 0) return;

  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderAll();
  showToast(`${completedTasks.length} completed task${completedTasks.length > 1 ? 's' : ''} cleared.`, 'info');
}

/* ─────────────────────────────────────────────
   11. INPUT EVENTS
   ───────────────────────────────────────────── */

// Character counter
taskInput.addEventListener('input', () => {
  const len = taskInput.value.length;
  charCounter.textContent = `${len}/200`;

  charCounter.className = 'char-counter';
  if (len >= 160) charCounter.classList.add('warn');
  if (len >= 190) charCounter.classList.add('danger');

  // Clear validation on typing
  if (len > 0) setValidation('');
});

// Add on button click
addBtn.addEventListener('click', addTask);

// Add on Enter key
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

// Clear all completed
clearAllBtn.addEventListener('click', clearCompleted);

/* ─────────────────────────────────────────────
   12. REFRESH TIMESTAMPS periodically
      (so "X min ago" stays accurate)
   ───────────────────────────────────────────── */
setInterval(() => {
  // Update only visible time spans without full re-render
  document.querySelectorAll('.task-card').forEach(card => {
    const id   = card.dataset.id;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const timeEl = card.querySelector('.task-time');
    if (!timeEl) return;

    const timeLabel = task.done && task.completedAt
      ? `Completed ${formatTime(task.completedAt)}`
      : `Added ${formatTime(task.createdAt)}`;

    const icon = task.done ? 'fa-circle-check' : 'fa-clock';
    timeEl.innerHTML = `<i class="fa-regular ${icon}"></i>${timeLabel}`;
  });
}, 60000); // every 60s

/* ─────────────────────────────────────────────
   13. BOOTSTRAP
   ───────────────────────────────────────────── */

/** App entry point */
function init() {
  loadTasks();
  renderAll();
  taskInput.focus();

  // Inject SVG gradient definition into the ring SVG
  const svgEl = document.querySelector('.progress-ring');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#7C3AED" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  `;
  svgEl.prepend(defs);

  // Point the ring fill at the gradient
  ringFill.style.stroke = 'url(#ringGradient)';
}

document.addEventListener('DOMContentLoaded', init);
