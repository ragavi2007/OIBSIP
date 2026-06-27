/**
 * ============================================================
 *  LOGIN AUTHENTICATION SYSTEM — script.js
 *  Handles: Registration · Login · Session · Logout
 *  Security: SHA-256 via Web Crypto API (no plain-text passwords)
 * ============================================================
 */

'use strict';

/* ────────────────────────────────────────────────────────────
   CRYPTO — SHA-256 via Web Crypto API
   Returns a hex string of the hash of the input.
────────────────────────────────────────────────────────────── */
async function sha256(message) {
  const msgBuffer  = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ────────────────────────────────────────────────────────────
   STORAGE HELPERS
   Users are stored as an array under "auth_users".
   The current session is stored under "auth_session".
────────────────────────────────────────────────────────────── */
const USERS_KEY   = 'auth_users';
const SESSION_KEY = 'auth_session';

/** Return parsed users array from localStorage, or []. */
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}

/** Persist the users array to localStorage. */
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Find a user by username OR email (case-insensitive). */
function findUser(identifier) {
  const id = identifier.toLowerCase().trim();
  return getUsers().find(u =>
    u.username.toLowerCase() === id || u.email.toLowerCase() === id
  ) || null;
}

/** Create a new login session object and store it. */
function createSession(user) {
  const session = {
    username:  user.username,
    email:     user.email,
    loginTime: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** Return the active session object, or null if none. */
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

/** Destroy the current session. */
function destroySession() {
  localStorage.removeItem(SESSION_KEY);
}

/* ────────────────────────────────────────────────────────────
   UI HELPERS — alerts, field states, button spinner
────────────────────────────────────────────────────────────── */

/** Show a global alert box (pass null/'' to hide). */
function showAlert(boxId, message, type = 'error') {
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!message) { box.classList.remove('show'); return; }
  box.className = `alert alert-${type} show`;
  box.querySelector('.alert-msg').textContent = message;
  box.querySelector('.alert-icon').textContent = type === 'error' ? '⚠' : '✓';
}

/** Mark a field as invalid and show inline error text. */
function setFieldError(inputEl, errEl, message) {
  inputEl.classList.add('invalid');
  inputEl.classList.remove('valid');
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add('show');
  }
}

/** Clear a field's error state. */
function clearFieldError(inputEl, errEl) {
  inputEl.classList.remove('invalid');
  if (errEl) errEl.classList.remove('show');
}

/** Mark field as valid. */
function setFieldValid(inputEl) {
  inputEl.classList.remove('invalid');
  inputEl.classList.add('valid');
}

/** Toggle button loading spinner. */
function setButtonLoading(btn, loading) {
  if (loading) btn.classList.add('loading');
  else         btn.classList.remove('loading');
  btn.disabled = loading;
}

/* ────────────────────────────────────────────────────────────
   PASSWORD VISIBILITY TOGGLE
   Call once per password field + toggle button pair.
────────────────────────────────────────────────────────────── */
function initPasswordToggle(inputId, toggleId) {
  const input  = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  if (!input || !toggle) return;

  toggle.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type       = isHidden ? 'text' : 'password';
    toggle.textContent = isHidden ? '🙈' : '👁';
    toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });
}

/* ────────────────────────────────────────────────────────────
   PASSWORD STRENGTH METER
   Scores 0-3 based on: length>=8, has digit, has special char.
────────────────────────────────────────────────────────────── */
function initStrengthMeter(inputId, barIds, hintId) {
  const input = document.getElementById(inputId);
  const hint  = document.getElementById(hintId);
  if (!input) return;

  const bars  = barIds.map(id => document.getElementById(id));
  const labels = ['', 'Weak', 'Moderate', 'Strong'];
  const colors = ['', 'weak', 'medium', 'strong'];

  input.addEventListener('input', () => {
    const v = input.value;
    let score = 0;
    if (v.length >= 8)          score++;
    if (/\d/.test(v))           score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;

    bars.forEach((bar, i) => {
      bar.className = 'pw-bar';
      if (i < score) bar.classList.add(colors[score]);
    });

    if (hint) hint.textContent = v.length === 0 ? 'Min 8 chars, at least 1 number' : labels[score];
  });
}

/* ────────────────────────────────────────────────────────────
   VALIDATION HELPERS
────────────────────────────────────────────────────────────── */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8 && /\d/.test(password);
}

/* ────────────────────────────────────────────────────────────
   PAGE: REGISTER
────────────────────────────────────────────────────────────── */
async function initRegisterPage() {
  const form    = document.getElementById('registerForm');
  if (!form) return;

  /* Init UI widgets */
  initPasswordToggle('regPassword', 'toggleRegPw');
  initPasswordToggle('regConfirm',  'toggleConfirmPw');
  initStrengthMeter('regPassword', ['bar1','bar2','bar3'], 'pwHint');

  /* Live "confirm" match check */
  document.getElementById('regConfirm')?.addEventListener('input', () => {
    const pw  = document.getElementById('regPassword').value;
    const cfm = document.getElementById('regConfirm').value;
    const errEl = document.getElementById('errConfirm');
    const el    = document.getElementById('regConfirm');
    if (cfm && pw !== cfm) {
      setFieldError(el, errEl, 'Passwords do not match');
    } else {
      clearFieldError(el, errEl);
      if (cfm && pw === cfm) setFieldValid(el);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAlert('regAlert', ''); // clear previous

    const username  = document.getElementById('regUsername').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const password  = document.getElementById('regPassword').value;
    const confirm   = document.getElementById('regConfirm').value;

    /* Reset all field states */
    ['regUsername','regEmail','regPassword','regConfirm'].forEach(id => {
      const el = document.getElementById(id);
      clearFieldError(el, document.getElementById('err' + id.replace('reg','')));
    });

    let hasError = false;

    /* --- Username validation --- */
    if (!username) {
      setFieldError(
        document.getElementById('regUsername'),
        document.getElementById('errUsername'),
        'Username is required'
      );
      hasError = true;
    } else if (username.length < 3) {
      setFieldError(
        document.getElementById('regUsername'),
        document.getElementById('errUsername'),
        'Username must be at least 3 characters'
      );
      hasError = true;
    }

    /* --- Email validation --- */
    if (!email) {
      setFieldError(
        document.getElementById('regEmail'),
        document.getElementById('errEmail'),
        'Email is required'
      );
      hasError = true;
    } else if (!isValidEmail(email)) {
      setFieldError(
        document.getElementById('regEmail'),
        document.getElementById('errEmail'),
        'Enter a valid email address'
      );
      hasError = true;
    }

    /* --- Password validation --- */
    if (!password) {
      setFieldError(
        document.getElementById('regPassword'),
        document.getElementById('errPassword'),
        'Password is required'
      );
      hasError = true;
    } else if (!isValidPassword(password)) {
      setFieldError(
        document.getElementById('regPassword'),
        document.getElementById('errPassword'),
        'Min 8 characters and at least 1 number'
      );
      hasError = true;
    }

    /* --- Confirm match --- */
    if (!confirm) {
      setFieldError(
        document.getElementById('regConfirm'),
        document.getElementById('errConfirm'),
        'Please confirm your password'
      );
      hasError = true;
    } else if (password !== confirm) {
      setFieldError(
        document.getElementById('regConfirm'),
        document.getElementById('errConfirm'),
        'Passwords do not match'
      );
      hasError = true;
    }

    if (hasError) return;

    /* --- Duplicate check --- */
    const users = getUsers();
    const dupUsername = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    const dupEmail    = users.some(u => u.email.toLowerCase()    === email.toLowerCase());

    if (dupUsername) {
      setFieldError(
        document.getElementById('regUsername'),
        document.getElementById('errUsername'),
        'Username is already taken'
      );
      return;
    }
    if (dupEmail) {
      setFieldError(
        document.getElementById('regEmail'),
        document.getElementById('errEmail'),
        'An account with this email already exists'
      );
      return;
    }

    /* --- Hash & store --- */
    const btn = document.getElementById('regBtn');
    setButtonLoading(btn, true);

    try {
      const hashedPassword = await sha256(password);

      users.push({
        username,
        email,
        password:   hashedPassword,  // NEVER store plain-text
        createdAt:  new Date().toISOString()
      });
      saveUsers(users);

      showAlert('regAlert', 'Account created! Redirecting to login…', 'success');
      form.reset();

      /* Redirect after a short delay so the user sees the success message */
      setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    } catch (err) {
      showAlert('regAlert', 'Something went wrong. Please try again.');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

/* ────────────────────────────────────────────────────────────
   PAGE: LOGIN
────────────────────────────────────────────────────────────── */
async function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  initPasswordToggle('loginPassword', 'toggleLoginPw');

  /* If already logged in, skip to dashboard */
  if (getSession()) {
    window.location.replace('dashboard.html');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAlert('loginAlert', '');

    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password   = document.getElementById('loginPassword').value;

    /* Clear field states */
    clearFieldError(document.getElementById('loginIdentifier'), null);
    clearFieldError(document.getElementById('loginPassword'),   null);

    let hasError = false;

    if (!identifier) {
      setFieldError(
        document.getElementById('loginIdentifier'),
        document.getElementById('errIdentifier'),
        'Username or email is required'
      );
      hasError = true;
    }
    if (!password) {
      setFieldError(
        document.getElementById('loginPassword'),
        document.getElementById('errLoginPw'),
        'Password is required'
      );
      hasError = true;
    }
    if (hasError) return;

    const btn = document.getElementById('loginBtn');
    setButtonLoading(btn, true);

    try {
      const hashedInput = await sha256(password);
      const user        = findUser(identifier);

      /*
       * SECURITY: Do NOT reveal whether username or password was wrong.
       * Always show the same generic error message.
       */
      if (!user || user.password !== hashedInput) {
        showAlert('loginAlert', 'Invalid username/email or password');
        return;
      }

      /* Success — create session and redirect */
      createSession(user);
      window.location.href = 'dashboard.html';

    } catch (err) {
      showAlert('loginAlert', 'Something went wrong. Please try again.');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

/* ────────────────────────────────────────────────────────────
   PAGE: DASHBOARD (protected)
────────────────────────────────────────────────────────────── */
function initDashboardPage() {
  /* Guard: redirect to login if no valid session */
  const session = getSession();
  if (!session) {
    window.location.replace('index.html');
    return;
  }

  /* Populate welcome message */
  const nameEls = document.querySelectorAll('[data-username]');
  nameEls.forEach(el => { el.textContent = session.username; });

  /* Avatar initials */
  const avatarEls = document.querySelectorAll('[data-avatar]');
  const initials  = session.username.slice(0, 2).toUpperCase();
  avatarEls.forEach(el => { el.textContent = initials; });

  /* Session info */
  const loginTimeEl = document.getElementById('sessionLoginTime');
  const emailEl     = document.getElementById('sessionEmail');
  if (loginTimeEl) loginTimeEl.textContent = formatDateTime(session.loginTime);
  if (emailEl)     emailEl.textContent     = session.email;

  /* Logout */
  const logoutBtns = document.querySelectorAll('[data-logout]');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      destroySession();
      window.location.href = 'index.html';
    });
  });

  /* Animate counter stats */
  animateCounters();
}

/** Format ISO date string into readable local time. */
function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short'
    });
  } catch { return iso; }
}

/** Animate the stat counter numbers up from 0. */
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target   = parseInt(el.dataset.count, 10);
    const duration = 900;
    const step     = Math.ceil(duration / target);
    let current    = 0;
    const timer    = setInterval(() => {
      current += Math.ceil(target / 40);
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = current.toLocaleString();
    }, step);
  });
}

/* ────────────────────────────────────────────────────────────
   AUTO-INIT — detect which page is loaded by unique element IDs
────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('registerForm'))  initRegisterPage();
  if (document.getElementById('loginForm'))     initLoginPage();
  if (document.getElementById('dashboardPage')) initDashboardPage();
});
