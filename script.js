// ── Constants (mirrors Go) ──
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS  = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

// ── State ──
let count = 1;
let sets  = { upper: true, digits: true, symbols: false };
let lastPasswords = [];
let showPasswords = false;
// Theme storage removed — single dark theme enforced

// ── Crypto helpers ──
function randomChar(set) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return set[buf[0] % set.length];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── generatePassword (mirrors Go func) ──
function generatePassword(length, useUpper, useDigits, useSymbols) {
  let pool = LOWER;
  if (useUpper)   pool += UPPER;
  if (useDigits)  pool += DIGITS;
  if (useSymbols) pool += SYMBOLS;

  // Guarantee at least one from each active set
  const pwd = [randomChar(LOWER)];
  if (useUpper)   pwd.push(randomChar(UPPER));
  if (useDigits)  pwd.push(randomChar(DIGITS));
  if (useSymbols) pwd.push(randomChar(SYMBOLS));

  while (pwd.length < length) pwd.push(randomChar(pool));
  return shuffle(pwd).join('');
}

// ── evaluateStrength (mirrors Go func) ──
function evaluateStrength(pwd) {
  let score = 1;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(pwd)) score++;
  return Math.min(5, score);
}

function strengthLabel(s) {
  return ['', 'Weak', 'Fair', 'Moderate', 'Strong', 'Very Strong'][s];
}

function maskPassword(pwd) {
  return '•'.repeat(pwd.length);
}

function themeIcon(theme) {
  if (theme === 'dark') {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12.8A8.7 8.7 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"></path>
      </svg>`;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5"></circle>
      <path d="M12 2.5v2.2"></path>
      <path d="M12 19.3v2.2"></path>
      <path d="M4.9 4.9l1.6 1.6"></path>
      <path d="M17.5 17.5l1.6 1.6"></path>
      <path d="M2.5 12h2.2"></path>
      <path d="M19.3 12h2.2"></path>
      <path d="M4.9 19.1l1.6-1.6"></path>
      <path d="M17.5 6.5l1.6-1.6"></path>
    </svg>`;
  }

function visibilityIcon(isVisible) {
  if (isVisible) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path>
        <circle cx="12" cy="12" r="2.8"></circle>
        <path d="M4 20L20 4"></path>
      </svg>`;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path>
      <circle cx="12" cy="12" r="2.8"></circle>
    </svg>`;
  }

function applyTheme(theme) {
  // Enforce single theme: always set dark tokens
  document.body.dataset.theme = 'dark';
}

function applyVisibilityState() {
  const button = document.getElementById('visibility-toggle');
  button.innerHTML = visibilityIcon(showPasswords);
  button.setAttribute('aria-pressed', String(showPasswords));
  button.setAttribute('aria-label', showPasswords ? 'Hide passwords' : 'Show passwords');
}

function togglePasswordVisibility() {
  showPasswords = !showPasswords;
  applyVisibilityState();
  if (lastPasswords.length) {
    renderOutput(lastPasswords, parseInt(document.getElementById('length').value));
  }
}

// ── Entropy ──
function calcEntropy(length, useUpper, useDigits, useSymbols) {
  let pool = 26;
  if (useUpper)   pool += 26;
  if (useDigits)  pool += 10;
  if (useSymbols) pool += 30;
  return Math.round(length * Math.log2(pool));
}

function entropyGrade(bits) {
  if (bits < 40)  return 'Very weak';
  if (bits < 60)  return 'Weak';
  if (bits < 80)  return 'Moderate';
  if (bits < 100) return 'Strong';
  if (bits < 128) return 'Very strong';
  return 'Excellent';
}

// ── UI update ──
function updateUI() {
  const len = parseInt(document.getElementById('length').value);
  document.getElementById('len-num').textContent   = len;
  document.getElementById('len-meta').textContent  = len === 1 ? 'character' : 'characters';

  const bits = calcEntropy(len, sets.upper, sets.digits, sets.symbols);
  const pct  = Math.min(100, Math.round((bits / 128) * 100));
  document.getElementById('entropy-num').innerHTML   = `${bits}<span>bits</span>`;
  document.getElementById('entropy-bar').style.width = pct + '%';
  document.getElementById('entropy-grade').textContent = entropyGrade(bits);
  
  // Update attempts value
  updateAttemptsDisplay(bits);
}

function updateAttemptsDisplay(bits) {
  const attemptsEl = document.getElementById('attempts-value');
  if (!attemptsEl) return;
  
  if (bits < 40) {
    attemptsEl.textContent = '1 in 10^12';
  } else if (bits < 60) {
    attemptsEl.textContent = '1 in 10^18';
  } else if (bits < 80) {
    attemptsEl.textContent = '1 in 10^24';
  } else if (bits < 100) {
    attemptsEl.textContent = `1 in 10^${Math.round(bits)}`;
  } else if (bits < 128) {
    attemptsEl.textContent = `1 in 10^${Math.round(bits)}`;
  } else {
    attemptsEl.textContent = `1 in 10^${Math.round(bits)}`;
  }
}

function setCount(n) {
  count = n;
  document.querySelectorAll('.count-btn').forEach(el => {
    el.classList.toggle('active', parseInt(el.textContent) === n);
  });
}

function toggleSet(key) {
  sets[key] = !sets[key];
  const row = document.getElementById('row-' + key);
  row.classList.toggle('on', sets[key]);
  updateUI();
}

// ── Generate ──
function generate() {
  const label = document.getElementById('gen-label');
  label.textContent = 'Working…';

  setTimeout(() => {
    const len = parseInt(document.getElementById('length').value);

    lastPasswords = Array.from({ length: count }, () =>
      generatePassword(len, sets.upper, sets.digits, sets.symbols)
    );

    renderOutput(lastPasswords, len);
    label.textContent = 'Generate →';

    document.getElementById('main-meta').textContent =
      `${count} password${count > 1 ? 's' : ''} · ${len} characters each`;
  }, 60);
}

function renderOutput(passwords, len) {
  const cards = passwords.map((pwd, i) => {
    const score = evaluateStrength(pwd);
    const delay = Math.min(i * 40, 200);
    const visiblePwd = showPasswords ? pwd : maskPassword(pwd);
    return `
      <div class="pwd-card" style="animation-delay:${delay}ms">
        <div class="pwd-text">${visiblePwd}</div>
        <span class="strength-badge s${score}">${strengthLabel(score)}</span>
        <button class="copy-btn" onclick="copyPwd(this,'${pwd}')">Copy</button>
      </div>`;
  }).join('');

  const saveBar = `
    <div class="save-bar">
      <div class="save-info">
        <strong>${passwords.length}</strong> password${passwords.length > 1 ? 's' : ''} ready
        &mdash; download as <code style="font-family:var(--code);font-size:10px">output_1.txt</code>
      </div>
      <button class="save-btn" onclick="saveAll()">&#8595; Download</button>
    </div>`;

  document.getElementById('output').innerHTML = `<div class="pwd-list">${cards}</div>` + saveBar;
}

function copyPwd(btn, pwd) {
  navigator.clipboard.writeText(pwd).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('copied');
    }, 1500);
  });
}

function saveAll() {
  if (!lastPasswords.length) return;
  const lines = lastPasswords
    .map(p => `${p} - Strength: ${evaluateStrength(p)}/5`)
    .join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'output_1.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ── Boot ──
// Single-theme mode: always apply dark
applyTheme('dark');
applyVisibilityState();

document.getElementById('length').addEventListener('input', updateUI);
updateUI();