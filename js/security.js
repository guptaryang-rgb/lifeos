/* ═══════════════════════════════════════════════════════════════════════════
   LifeOS · Security & Privacy Module
   PIN lock, auto-lock, encrypted-ish secure notes vault
   ═══════════════════════════════════════════════════════════════════════════ */

const Security = (() => {
  'use strict';

  /* ── Storage Keys ── */
  const KEYS = {
    security:    'lifeos_security',
    secureNotes: 'lifeos_secure_notes',
    pinHash:     'lifeos_pin_hash',
  };

  /* ── Helpers ── */
  const _load = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const _save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  const _defaults = () => ({
    pinEnabled: false,
    autoLockEnabled: false,
    autoLockMinutes: 5,
    isLocked: false,
    lastActivity: Date.now(),
  });

  const _state = () => _load(KEYS.security) || _defaults();
  const _saveState = (s) => _save(KEYS.security, s);

  /* ── djb2 Hash ── */
  const _hash = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit int
    }
    return 'djb2_' + Math.abs(hash).toString(36);
  };

  /* ── XOR Obfuscation (not real crypto, but hides plaintext in localStorage) ── */
  const _obfuscationKey = 'L1f3OS_s3cur3_n0t3s_k3y!2024';
  const _xorObfuscate = (text) => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ _obfuscationKey.charCodeAt(i % _obfuscationKey.length));
    }
    return btoa(unescape(encodeURIComponent(result)));
  };
  const _xorDeobfuscate = (encoded) => {
    try {
      const decoded = decodeURIComponent(escape(atob(encoded)));
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ _obfuscationKey.charCodeAt(i % _obfuscationKey.length));
      }
      return result;
    } catch { return ''; }
  };

  /* ── Notes Storage ── */
  const _loadNotes = () => {
    const raw = _load(KEYS.secureNotes);
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map(n => ({
      ...n,
      title: _xorDeobfuscate(n.title),
      content: _xorDeobfuscate(n.content),
    }));
  };

  const _saveNotes = (notes) => {
    const encoded = notes.map(n => ({
      ...n,
      title: _xorObfuscate(n.title),
      content: _xorObfuscate(n.content),
    }));
    _save(KEYS.secureNotes, encoded);
  };

  /* ── Auto-Lock Timer ── */
  let _autoLockInterval = null;

  const _startAutoLockWatcher = () => {
    if (_autoLockInterval) clearInterval(_autoLockInterval);
    _autoLockInterval = setInterval(() => {
      const s = _state();
      if (!s.pinEnabled || !s.autoLockEnabled || s.isLocked) return;
      const elapsed = (Date.now() - s.lastActivity) / 60000;
      if (elapsed >= s.autoLockMinutes) {
        api.pin.lock();
      }
    }, 15000); // Check every 15 seconds
  };

  const _resetActivity = () => {
    const s = _state();
    s.lastActivity = Date.now();
    _saveState(s);
  };

  /* ── Inject CSS ── */
  const _injectCSS = () => {
    if (document.getElementById('security-styles')) return;
    const style = document.createElement('style');
    style.id = 'security-styles';
    style.textContent = `
      /* ── Lock Screen ── */
      .sec-lock-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        animation: secFadeIn .3s ease;
      }
      @keyframes secFadeIn { from { opacity: 0 } to { opacity: 1 } }
      .sec-lock-logo {
        width: 80px; height: 80px; border-radius: 24px;
        background: linear-gradient(135deg, #6c5ce7, #a29bfe);
        display: flex; align-items: center; justify-content: center;
        font-size: 40px; margin-bottom: 12px;
        box-shadow: 0 8px 32px rgba(108,92,231,.45);
      }
      .sec-lock-title { color: #fff; font-size: 28px; font-weight: 700; margin-bottom: 4px; }
      .sec-lock-sub { color: rgba(255,255,255,.55); font-size: 14px; margin-bottom: 32px; }

      .sec-dots { display: flex; gap: 14px; margin-bottom: 28px; }
      .sec-dot {
        width: 16px; height: 16px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,.35);
        transition: all .15s ease;
      }
      .sec-dot.filled { background: #a29bfe; border-color: #a29bfe; transform: scale(1.15); }

      .sec-numpad { display: grid; grid-template-columns: repeat(3,72px); gap: 14px; }
      .sec-numpad-btn {
        width: 72px; height: 72px; border-radius: 50%;
        background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
        color: #fff; font-size: 26px; font-weight: 500; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all .15s ease; user-select: none;
      }
      .sec-numpad-btn:hover { background: rgba(255,255,255,.15); }
      .sec-numpad-btn:active { transform: scale(.92); background: rgba(162,155,254,.3); }
      .sec-numpad-btn.action { font-size: 14px; background: transparent; border-color: transparent; }
      .sec-numpad-btn.action:hover { color: #a29bfe; }

      .sec-error { color: #ff6b6b; font-size: 13px; min-height: 20px; margin-top: 14px; }

      @keyframes secShake {
        0%,100% { transform: translateX(0) }
        20%,60% { transform: translateX(-12px) }
        40%,80% { transform: translateX(12px) }
      }
      .sec-shake { animation: secShake .45s ease; }

      .sec-forgot {
        margin-top: 24px; background: none; border: none; color: rgba(255,255,255,.4);
        font-size: 13px; cursor: pointer;
      }
      .sec-forgot:hover { color: #ff6b6b; }

      /* ── Settings Page ── */
      .sec-settings { max-width: 720px; margin: 0 auto; }
      .sec-section {
        background: var(--bg-card, #1e1e2e); border-radius: 16px;
        padding: 24px; margin-bottom: 20px;
        border: 1px solid var(--border, rgba(255,255,255,.06));
      }
      .sec-section-title {
        font-size: 18px; font-weight: 700;
        color: var(--text-primary, #fff); margin-bottom: 16px;
        display: flex; align-items: center; gap: 8px;
      }
      .sec-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 0; border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
      }
      .sec-row:last-child { border-bottom: none; }
      .sec-row-label { color: var(--text-primary, #e0e0e0); font-size: 15px; }
      .sec-row-desc { color: var(--text-secondary, #888); font-size: 12px; margin-top: 2px; }

      /* Toggle Switch */
      .sec-toggle {
        position: relative; width: 48px; height: 26px;
        background: rgba(255,255,255,.1); border-radius: 13px;
        cursor: pointer; transition: background .2s;
      }
      .sec-toggle.active { background: #6c5ce7; }
      .sec-toggle::after {
        content: ''; position: absolute; top: 3px; left: 3px;
        width: 20px; height: 20px; border-radius: 50%;
        background: #fff; transition: transform .2s;
      }
      .sec-toggle.active::after { transform: translateX(22px); }

      /* Timer select */
      .sec-timer-select {
        background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
        border-radius: 8px; padding: 6px 12px; color: var(--text-primary, #fff);
        font-size: 14px; cursor: pointer;
      }

      /* ── Secure Notes ── */
      .sec-notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
      .sec-note-card {
        background: rgba(255,255,255,.04); border-radius: 12px; padding: 16px;
        border: 1px solid rgba(255,255,255,.06); cursor: pointer;
        transition: all .2s;
      }
      .sec-note-card:hover { border-color: #6c5ce7; transform: translateY(-2px); }
      .sec-note-title {
        font-size: 15px; font-weight: 600; color: var(--text-primary, #fff);
        margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .sec-note-cat {
        display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px;
        background: rgba(108,92,231,.15); color: #a29bfe; margin-bottom: 8px;
      }
      .sec-note-preview {
        font-size: 13px; color: var(--text-secondary, #888);
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
        overflow: hidden; line-height: 1.5;
      }
      .sec-note-date { font-size: 11px; color: var(--text-tertiary, #555); margin-top: 8px; }
      .sec-add-note {
        border: 2px dashed rgba(255,255,255,.1); border-radius: 12px; padding: 16px;
        display: flex; align-items: center; justify-content: center;
        color: var(--text-secondary, #888); cursor: pointer; min-height: 120px;
        font-size: 14px; gap: 8px; transition: all .2s;
      }
      .sec-add-note:hover { border-color: #6c5ce7; color: #a29bfe; }

      /* ── Note Modal ── */
      .sec-modal-bg {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center;
        animation: secFadeIn .2s ease;
      }
      .sec-modal {
        background: var(--bg-card, #1e1e2e); border-radius: 16px;
        padding: 28px; width: 90%; max-width: 480px;
        border: 1px solid rgba(255,255,255,.08);
      }
      .sec-modal h3 { color: var(--text-primary, #fff); margin-bottom: 20px; font-size: 18px; }
      .sec-modal input, .sec-modal textarea, .sec-modal select {
        width: 100%; padding: 10px 14px; border-radius: 10px;
        background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
        color: var(--text-primary, #fff); font-size: 14px; margin-bottom: 12px;
        font-family: inherit; box-sizing: border-box;
      }
      .sec-modal textarea { min-height: 120px; resize: vertical; }
      .sec-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
      .sec-btn {
        padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;
        font-size: 14px; font-weight: 600; transition: all .15s;
      }
      .sec-btn-primary { background: #6c5ce7; color: #fff; }
      .sec-btn-primary:hover { background: #5a4bd1; }
      .sec-btn-ghost { background: transparent; color: var(--text-secondary, #888); border: 1px solid rgba(255,255,255,.1); }
      .sec-btn-ghost:hover { background: rgba(255,255,255,.05); }
      .sec-btn-danger { background: #ff4757; color: #fff; }
      .sec-btn-danger:hover { background: #e0303f; }

      /* PIN change modal */
      .sec-pin-input {
        display: flex; gap: 8px; justify-content: center; margin: 16px 0;
      }
      .sec-pin-box {
        width: 44px; height: 52px; text-align: center; font-size: 22px;
        background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px; color: var(--text-primary, #fff);
        -webkit-text-security: disc;
      }
      .sec-pin-box:focus { border-color: #6c5ce7; outline: none; }

      /* Danger zone */
      .sec-danger-zone {
        border-color: rgba(255,71,87,.2) !important;
      }
      .sec-danger-zone .sec-section-title { color: #ff4757; }
    `;
    document.head.appendChild(style);
  };

  /* ── Seed Data (Demo Secure Notes) ── */
  const _seedNotes = () => {
    const existing = _load(KEYS.secureNotes);
    if (existing && existing.length > 0) return;
    const notes = [
      { id: 'sn_1', title: 'WiFi Passwords', content: 'Home Network: MyWifi_5G\nPassword: sunflower2024!\n\nOffice: CorpNet-Guest\nPassword: Welcome@Office', category: 'Passwords', createdAt: '2026-06-10T10:00:00', updatedAt: '2026-06-10T10:00:00' },
      { id: 'sn_2', title: 'Health Insurance Info', content: 'Provider: BlueCross BlueShield\nMember ID: XKJ-992841\nGroup: 00442\nPCP: Dr. Sarah Mitchell\nPhone: (555) 234-5678', category: 'Medical', createdAt: '2026-06-08T14:30:00', updatedAt: '2026-06-08T14:30:00' },
      { id: 'sn_3', title: 'Bank Account Details', content: 'Checking: ****4582\nRouting: 021000021\nSavings: ****7713\n\nCredit Card ending: 9021\nExpiry: 08/28', category: 'Financial', createdAt: '2026-06-05T09:00:00', updatedAt: '2026-06-12T11:20:00' },
      { id: 'sn_4', title: 'Important Dates', content: 'Mom\'s birthday: March 14\nDad\'s birthday: August 22\nAnniversary: June 5\nLease renewal: Sept 1, 2026', category: 'Personal', createdAt: '2026-06-03T16:00:00', updatedAt: '2026-06-03T16:00:00' },
      { id: 'sn_5', title: 'Passport Info', content: 'Passport #: 5482193XX\nIssued: 2023-01-15\nExpires: 2033-01-14\nIssuing Authority: US Dept of State\n\nGlobal Entry: GE-8841002\nTSA PreCheck: TK-299281', category: 'Personal', createdAt: '2026-06-01T08:00:00', updatedAt: '2026-06-01T08:00:00' },
    ];
    _saveNotes(notes);
  };

  /* ── Lock Screen ── */
  let _lockPinBuffer = '';

  const _renderLockScreen = () => {
    // Remove existing
    const existing = document.getElementById('sec-lock-overlay');
    if (existing) existing.remove();

    const s = _state();
    if (!s.pinEnabled || !s.isLocked) return;

    const overlay = document.createElement('div');
    overlay.id = 'sec-lock-overlay';
    overlay.className = 'sec-lock-overlay';
    _lockPinBuffer = '';

    const maxDigits = 6;
    const storedHash = _load(KEYS.pinHash);
    // Determine PIN length from stored hash metadata, default to 4 dots shown
    const dotCount = 6;

    overlay.innerHTML = `
      <div class="sec-lock-logo">🔒</div>
      <div class="sec-lock-title">LifeOS</div>
      <div class="sec-lock-sub">Enter your PIN to unlock</div>
      <div class="sec-dots" id="sec-dots">
        ${Array.from({length: dotCount}, () => '<div class="sec-dot"></div>').join('')}
      </div>
      <div class="sec-numpad" id="sec-numpad">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="sec-numpad-btn" data-num="${n}">${n}</button>`).join('')}
        <button class="sec-numpad-btn action" data-action="clear">Clear</button>
        <button class="sec-numpad-btn" data-num="0">0</button>
        <button class="sec-numpad-btn action" data-action="delete">⌫</button>
      </div>
      <div class="sec-error" id="sec-error"></div>
      <button class="sec-forgot" id="sec-forgot">Forgot PIN?</button>
    `;

    document.body.appendChild(overlay);

    // Number pad events
    overlay.querySelector('#sec-numpad').addEventListener('click', (e) => {
      const btn = e.target.closest('.sec-numpad-btn');
      if (!btn) return;

      const num = btn.dataset.num;
      const action = btn.dataset.action;

      if (action === 'clear') {
        _lockPinBuffer = '';
      } else if (action === 'delete') {
        _lockPinBuffer = _lockPinBuffer.slice(0, -1);
      } else if (num !== undefined && _lockPinBuffer.length < maxDigits) {
        _lockPinBuffer += num;
      }

      // Update dots
      const dots = overlay.querySelectorAll('.sec-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < _lockPinBuffer.length);
      });

      // Auto-submit when 4+ digits and hash matches
      if (_lockPinBuffer.length >= 4) {
        const attempt = _hash(_lockPinBuffer);
        if (attempt === storedHash) {
          // Success!
          const st = _state();
          st.isLocked = false;
          st.lastActivity = Date.now();
          _saveState(st);
          overlay.style.animation = 'secFadeIn .3s ease reverse';
          setTimeout(() => overlay.remove(), 280);
          return;
        }
        // If max digits reached and still wrong
        if (_lockPinBuffer.length === maxDigits) {
          const dotsContainer = overlay.querySelector('.sec-dots');
          dotsContainer.classList.add('sec-shake');
          overlay.querySelector('#sec-error').textContent = 'Incorrect PIN';
          setTimeout(() => {
            dotsContainer.classList.remove('sec-shake');
            _lockPinBuffer = '';
            dots.forEach(d => d.classList.remove('filled'));
          }, 500);
        }
      }
    });

    // Forgot PIN
    overlay.querySelector('#sec-forgot').addEventListener('click', () => {
      if (confirm('This will reset your PIN and clear all secure notes. Continue?')) {
        localStorage.removeItem(KEYS.pinHash);
        localStorage.removeItem(KEYS.secureNotes);
        const st = _defaults();
        _saveState(st);
        overlay.remove();
        if (typeof App !== 'undefined' && App.toast) App.toast('PIN and secure notes have been reset', 'info');
      }
    });

    // Keyboard support
    const _keyHandler = (e) => {
      if (!document.getElementById('sec-lock-overlay')) {
        document.removeEventListener('keydown', _keyHandler);
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        const btn = overlay.querySelector(`[data-num="${e.key}"]`);
        if (btn) btn.click();
      } else if (e.key === 'Backspace') {
        const btn = overlay.querySelector('[data-action="delete"]');
        if (btn) btn.click();
      }
    };
    document.addEventListener('keydown', _keyHandler);
  };

  /* ── Settings Render ── */
  const _render = (container) => {
    _injectCSS();
    _seedNotes();
    const s = _state();
    const notes = _loadNotes();

    const esc = typeof escHtml === 'function' ? escHtml : (s) => {
      const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    };

    container.innerHTML = `
      <div class="sec-settings">
        <h2 style="color:var(--text-primary,#fff);font-size:26px;font-weight:800;margin-bottom:6px;">
          🔐 Security & Privacy
        </h2>
        <p style="color:var(--text-secondary,#888);font-size:14px;margin-bottom:28px;">
          Protect your data with PIN lock and secure notes
        </p>

        <!-- PIN Lock Section -->
        <div class="sec-section">
          <div class="sec-section-title">🔑 PIN Lock</div>
          <div class="sec-row">
            <div>
              <div class="sec-row-label">Enable PIN Lock</div>
              <div class="sec-row-desc">Require PIN to access LifeOS</div>
            </div>
            <div class="sec-toggle ${s.pinEnabled ? 'active' : ''}" id="sec-toggle-pin"></div>
          </div>
          ${s.pinEnabled ? `
          <div class="sec-row">
            <div>
              <div class="sec-row-label">Change PIN</div>
              <div class="sec-row-desc">Update your unlock PIN</div>
            </div>
            <button class="sec-btn sec-btn-ghost" id="sec-change-pin">Change</button>
          </div>
          <div class="sec-row">
            <div>
              <div class="sec-row-label">Auto-Lock</div>
              <div class="sec-row-desc">Lock after inactivity</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="sec-toggle ${s.autoLockEnabled ? 'active' : ''}" id="sec-toggle-autolock"></div>
              ${s.autoLockEnabled ? `
              <select class="sec-timer-select" id="sec-autolock-timer">
                ${[1,2,5,10,15,30].map(m => `<option value="${m}" ${s.autoLockMinutes === m ? 'selected' : ''}>${m} min</option>`).join('')}
              </select>` : ''}
            </div>
          </div>
          <div class="sec-row">
            <div>
              <div class="sec-row-label">Lock Now</div>
              <div class="sec-row-desc">Immediately lock the app</div>
            </div>
            <button class="sec-btn sec-btn-primary" id="sec-lock-now">🔒 Lock</button>
          </div>
          ` : ''}
        </div>

        <!-- Secure Notes Vault -->
        <div class="sec-section">
          <div class="sec-section-title">🗄️ Secure Notes Vault</div>
          <div class="sec-notes-grid">
            ${notes.map(n => `
              <div class="sec-note-card" data-id="${esc(n.id)}">
                <div class="sec-note-cat">${esc(n.category)}</div>
                <div class="sec-note-title">${esc(n.title)}</div>
                <div class="sec-note-preview">${esc(n.content.substring(0, 100))}</div>
                <div class="sec-note-date">${new Date(n.updatedAt).toLocaleDateString()}</div>
              </div>
            `).join('')}
            <div class="sec-add-note" id="sec-add-note">
              <span style="font-size:24px;">+</span> Add Note
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="sec-section sec-danger-zone">
          <div class="sec-section-title">⚠️ Data Management</div>
          <div class="sec-row">
            <div>
              <div class="sec-row-label">Export Data</div>
              <div class="sec-row-desc">Download all LifeOS data as JSON</div>
            </div>
            <button class="sec-btn sec-btn-ghost" id="sec-export">📦 Export</button>
          </div>
          <div class="sec-row">
            <div>
              <div class="sec-row-label">Clear All Data</div>
              <div class="sec-row-desc" style="color:#ff6b6b;">This action cannot be undone</div>
            </div>
            <button class="sec-btn sec-btn-danger" id="sec-clear-all">🗑️ Clear Everything</button>
          </div>
        </div>
      </div>
    `;

    /* ── Event Bindings ── */

    // Toggle PIN
    const togglePin = container.querySelector('#sec-toggle-pin');
    if (togglePin) {
      togglePin.addEventListener('click', () => {
        const st = _state();
        if (!st.pinEnabled) {
          _showPinSetModal(container);
        } else {
          _showPinVerifyModal('Confirm current PIN to disable', (ok) => {
            if (ok) {
              const st2 = _state();
              st2.pinEnabled = false;
              st2.isLocked = false;
              st2.autoLockEnabled = false;
              _saveState(st2);
              localStorage.removeItem(KEYS.pinHash);
              _render(container);
              if (typeof App !== 'undefined' && App.toast) App.toast('PIN lock disabled', 'info');
            }
          });
        }
      });
    }

    // Change PIN
    const changePin = container.querySelector('#sec-change-pin');
    if (changePin) {
      changePin.addEventListener('click', () => {
        _showPinVerifyModal('Enter current PIN', (ok) => {
          if (ok) _showPinSetModal(container, true);
        });
      });
    }

    // Toggle Auto-Lock
    const toggleAutolock = container.querySelector('#sec-toggle-autolock');
    if (toggleAutolock) {
      toggleAutolock.addEventListener('click', () => {
        const st = _state();
        st.autoLockEnabled = !st.autoLockEnabled;
        _saveState(st);
        if (st.autoLockEnabled) _startAutoLockWatcher();
        _render(container);
      });
    }

    // Auto-lock timer
    const timerSelect = container.querySelector('#sec-autolock-timer');
    if (timerSelect) {
      timerSelect.addEventListener('change', (e) => {
        const st = _state();
        st.autoLockMinutes = parseInt(e.target.value);
        _saveState(st);
      });
    }

    // Lock Now
    const lockNow = container.querySelector('#sec-lock-now');
    if (lockNow) {
      lockNow.addEventListener('click', () => {
        api.pin.lock();
        _renderLockScreen();
      });
    }

    // Add Note
    const addNoteBtn = container.querySelector('#sec-add-note');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => _showNoteModal(null, container));
    }

    // Edit Notes
    container.querySelectorAll('.sec-note-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const note = _loadNotes().find(n => n.id === id);
        if (note) _showNoteModal(note, container);
      });
    });

    // Export
    const exportBtn = container.querySelector('#sec-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('lifeos_')) {
            try { data[key] = JSON.parse(localStorage.getItem(key)); }
            catch { data[key] = localStorage.getItem(key); }
          }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `lifeos_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(url);
        if (typeof App !== 'undefined' && App.toast) App.toast('Data exported successfully!', 'success');
      });
    }

    // Clear All
    const clearBtn = container.querySelector('#sec-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('⚠️ Are you absolutely sure?\n\nThis will permanently delete ALL LifeOS data including tasks, goals, habits, secure notes, and settings.\n\nThis CANNOT be undone.')) {
          if (confirm('Final confirmation: Type OK to proceed with deletion.\n\nAll data will be erased.')) {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key.startsWith('lifeos_')) keys.push(key);
            }
            keys.forEach(k => localStorage.removeItem(k));
            if (typeof App !== 'undefined' && App.toast) App.toast('All data has been cleared', 'info');
            _render(container);
          }
        }
      });
    }
  };

  /* ── PIN Set Modal ── */
  const _showPinSetModal = (parentContainer, isChange = false) => {
    const bg = document.createElement('div');
    bg.className = 'sec-modal-bg';
    bg.innerHTML = `
      <div class="sec-modal">
        <h3>${isChange ? 'Set New PIN' : 'Create PIN'}</h3>
        <p style="color:var(--text-secondary,#888);font-size:13px;margin-bottom:16px;">
          Enter a 4-6 digit PIN to lock your LifeOS
        </p>
        <div class="sec-pin-input" id="sec-pin-set">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric" pattern="[0-9]">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric" pattern="[0-9]">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric" pattern="[0-9]">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric" pattern="[0-9]">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric" pattern="[0-9]">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric" pattern="[0-9]">
        </div>
        <div class="sec-error" id="sec-set-error"></div>
        <div class="sec-modal-actions">
          <button class="sec-btn sec-btn-ghost" id="sec-set-cancel">Cancel</button>
          <button class="sec-btn sec-btn-primary" id="sec-set-confirm">Set PIN</button>
        </div>
      </div>
    `;
    document.body.appendChild(bg);

    const boxes = bg.querySelectorAll('.sec-pin-box');
    boxes[0].focus();

    // Auto-advance on input
    boxes.forEach((box, i) => {
      box.addEventListener('input', () => {
        box.value = box.value.replace(/\D/g, '');
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && i > 0) {
          boxes[i - 1].focus();
        }
      });
    });

    bg.querySelector('#sec-set-cancel').addEventListener('click', () => bg.remove());
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.remove(); });

    bg.querySelector('#sec-set-confirm').addEventListener('click', () => {
      const pin = Array.from(boxes).map(b => b.value).join('');
      if (pin.length < 4) {
        bg.querySelector('#sec-set-error').textContent = 'PIN must be at least 4 digits';
        return;
      }
      _save(KEYS.pinHash, _hash(pin));
      const st = _state();
      st.pinEnabled = true;
      st.lastActivity = Date.now();
      _saveState(st);
      bg.remove();
      _render(parentContainer);
      if (typeof App !== 'undefined' && App.toast) App.toast('PIN has been set!', 'success');
    });
  };

  /* ── PIN Verify Modal ── */
  const _showPinVerifyModal = (message, callback) => {
    const bg = document.createElement('div');
    bg.className = 'sec-modal-bg';
    bg.innerHTML = `
      <div class="sec-modal">
        <h3>${message}</h3>
        <div class="sec-pin-input" id="sec-pin-verify">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric">
          <input class="sec-pin-box" type="password" maxlength="1" inputmode="numeric">
        </div>
        <div class="sec-error" id="sec-verify-error"></div>
        <div class="sec-modal-actions">
          <button class="sec-btn sec-btn-ghost" id="sec-verify-cancel">Cancel</button>
          <button class="sec-btn sec-btn-primary" id="sec-verify-confirm">Verify</button>
        </div>
      </div>
    `;
    document.body.appendChild(bg);

    const boxes = bg.querySelectorAll('.sec-pin-box');
    boxes[0].focus();

    boxes.forEach((box, i) => {
      box.addEventListener('input', () => {
        box.value = box.value.replace(/\D/g, '');
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
      });
    });

    bg.querySelector('#sec-verify-cancel').addEventListener('click', () => { bg.remove(); callback(false); });
    bg.addEventListener('click', (e) => { if (e.target === bg) { bg.remove(); callback(false); } });

    bg.querySelector('#sec-verify-confirm').addEventListener('click', () => {
      const pin = Array.from(boxes).map(b => b.value).join('');
      const storedHash = _load(KEYS.pinHash);
      if (_hash(pin) === storedHash) {
        bg.remove();
        callback(true);
      } else {
        bg.querySelector('#sec-verify-error').textContent = 'Incorrect PIN';
        const container = bg.querySelector('.sec-pin-input');
        container.classList.add('sec-shake');
        setTimeout(() => {
          container.classList.remove('sec-shake');
          boxes.forEach(b => { b.value = ''; });
          boxes[0].focus();
        }, 500);
      }
    });
  };

  /* ── Note Edit/Add Modal ── */
  const _showNoteModal = (note, parentContainer) => {
    const isEdit = !!note;
    const categories = ['Passwords', 'Personal', 'Financial', 'Medical', 'Other'];
    const esc = typeof escHtml === 'function' ? escHtml : (s) => {
      const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    };

    const bg = document.createElement('div');
    bg.className = 'sec-modal-bg';
    bg.innerHTML = `
      <div class="sec-modal">
        <h3>${isEdit ? 'Edit Note' : 'New Secure Note'}</h3>
        <input type="text" placeholder="Title" id="sec-note-title" value="${isEdit ? esc(note.title) : ''}">
        <select id="sec-note-category">
          ${categories.map(c => `<option value="${c}" ${isEdit && note.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <textarea placeholder="Write your note content..." id="sec-note-content">${isEdit ? esc(note.content) : ''}</textarea>
        <div class="sec-modal-actions">
          ${isEdit ? '<button class="sec-btn sec-btn-danger" id="sec-note-delete">Delete</button>' : ''}
          <div style="flex:1"></div>
          <button class="sec-btn sec-btn-ghost" id="sec-note-cancel">Cancel</button>
          <button class="sec-btn sec-btn-primary" id="sec-note-save">${isEdit ? 'Update' : 'Save'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(bg);

    bg.querySelector('#sec-note-cancel').addEventListener('click', () => bg.remove());
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.remove(); });

    bg.querySelector('#sec-note-save').addEventListener('click', () => {
      const title = bg.querySelector('#sec-note-title').value.trim();
      const content = bg.querySelector('#sec-note-content').value.trim();
      const category = bg.querySelector('#sec-note-category').value;

      if (!title) { bg.querySelector('#sec-note-title').style.borderColor = '#ff4757'; return; }
      if (!content) { bg.querySelector('#sec-note-content').style.borderColor = '#ff4757'; return; }

      const allNotes = _loadNotes();
      if (isEdit) {
        const idx = allNotes.findIndex(n => n.id === note.id);
        if (idx !== -1) {
          allNotes[idx] = { ...allNotes[idx], title, content, category, updatedAt: new Date().toISOString() };
        }
      } else {
        allNotes.push({
          id: 'sn_' + Date.now(),
          title, content, category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      _saveNotes(allNotes);
      bg.remove();
      _render(parentContainer);
      if (typeof App !== 'undefined' && App.toast) App.toast(isEdit ? 'Note updated' : 'Note saved', 'success');
    });

    // Delete
    const delBtn = bg.querySelector('#sec-note-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (confirm('Delete this note permanently?')) {
          const allNotes = _loadNotes().filter(n => n.id !== note.id);
          _saveNotes(allNotes);
          bg.remove();
          _render(parentContainer);
          if (typeof App !== 'undefined' && App.toast) App.toast('Note deleted', 'info');
        }
      });
    }
  };

  /* ── Track Activity on Global Interactions ── */
  if (typeof document !== 'undefined') {
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, _resetActivity, { passive: true });
    });
  }

  /* ── Public API ── */
  const api = {
    pin: {
      isSet: () => !!_load(KEYS.pinHash),
      set: (pin) => {
        if (typeof pin !== 'string' || pin.length < 4 || pin.length > 6) return false;
        _save(KEYS.pinHash, _hash(pin));
        const s = _state();
        s.pinEnabled = true;
        _saveState(s);
        return true;
      },
      verify: (pin) => {
        const stored = _load(KEYS.pinHash);
        return stored === _hash(String(pin));
      },
      remove: (currentPin) => {
        if (!api.pin.verify(currentPin)) return false;
        localStorage.removeItem(KEYS.pinHash);
        const s = _state();
        s.pinEnabled = false;
        s.isLocked = false;
        _saveState(s);
        return true;
      },
      isLocked: () => {
        const s = _state();
        return s.pinEnabled && s.isLocked;
      },
      lock: () => {
        const s = _state();
        if (!s.pinEnabled) return;
        s.isLocked = true;
        _saveState(s);
      },
      unlock: (pin) => {
        if (!api.pin.verify(pin)) return false;
        const s = _state();
        s.isLocked = false;
        s.lastActivity = Date.now();
        _saveState(s);
        return true;
      },
    },

    _hash,

    autoLock: {
      isEnabled: () => _state().autoLockEnabled,
      setTimer: (minutes) => {
        const s = _state();
        s.autoLockMinutes = Math.max(1, Math.min(60, parseInt(minutes) || 5));
        s.autoLockEnabled = true;
        _saveState(s);
        _startAutoLockWatcher();
      },
      getTimer: () => _state().autoLockMinutes,
      resetActivity: _resetActivity,
    },

    notes: {
      getAll: () => _loadNotes(),
      add: (note) => {
        const notes = _loadNotes();
        const newNote = {
          id: 'sn_' + Date.now(),
          title: note.title || 'Untitled',
          content: note.content || '',
          category: note.category || 'Other',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        notes.push(newNote);
        _saveNotes(notes);
        return newNote;
      },
      update: (id, data) => {
        const notes = _loadNotes();
        const idx = notes.findIndex(n => n.id === id);
        if (idx === -1) return null;
        notes[idx] = { ...notes[idx], ...data, updatedAt: new Date().toISOString() };
        _saveNotes(notes);
        return notes[idx];
      },
      delete: (id) => {
        const notes = _loadNotes().filter(n => n.id !== id);
        _saveNotes(notes);
      },
      categories: ['Passwords', 'Personal', 'Financial', 'Medical', 'Other'],
    },

    showLockScreen: () => {
      _injectCSS();
      _renderLockScreen();
    },
    hideLockScreen: () => {
      const el = document.getElementById('sec-lock-overlay');
      if (el) el.remove();
    },

    render: (container) => {
      _injectCSS();
      _render(container);
    },
    renderLockScreen: () => {
      _injectCSS();
      const s = _state();
      if (s.pinEnabled && s.isLocked) _renderLockScreen();
    },
  };

  // Start auto-lock watcher if enabled
  const initialState = _state();
  if (initialState.pinEnabled && initialState.autoLockEnabled) {
    _startAutoLockWatcher();
  }
  // Show lock screen on page load if locked
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      _injectCSS();
      if (initialState.pinEnabled && initialState.isLocked) {
        _renderLockScreen();
      }
    });
  }

  return api;
})();
