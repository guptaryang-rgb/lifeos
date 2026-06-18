// ============================================================
// security.js — PIN lock, secure notes vault, settings
// ============================================================
import { store } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal, hashPin } from './utils.js';

export const meta = { title: 'Security', eyebrow: 'Protect' };

let unlockedPin = null; // { string }
let isLocked = false;

// Derived encryption key / encryption logic
async function deriveKey(pin) {
  const pinBuf = new TextEncoder().encode(pin + ':lifeos-vault');
  const hash = await crypto.subtle.digest('SHA-256', pinBuf);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptData(text, pin) {
  const key = await deriveKey(pin);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(base64, pin) {
  try {
    const key = await deriveKey(pin);
    const combined = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return null;
  }
}

async function loadNotes() {
  const raw = localStorage.getItem('lifeos:vault');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Legacy plaintext notes - migrate them if pin is unlocked
      if (unlockedPin) {
        const encryptedStr = await encryptData(JSON.stringify(parsed), unlockedPin);
        localStorage.setItem('lifeos:vault', JSON.stringify({ encrypted: true, data: encryptedStr }));
      }
      return parsed;
    }
    if (parsed && parsed.encrypted && parsed.data) {
      if (!unlockedPin) return [];
      const decryptedStr = await decryptData(parsed.data, unlockedPin);
      if (decryptedStr) {
        return JSON.parse(decryptedStr);
      } else {
        console.warn("Failed to decrypt notes");
        return [];
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function render(root) {
  const user = store.get('user') || {};
  const pinSet = !!user.pinHash;

  root.appendChild(h('div.grid.grid-2', {})

    // PIN Lock card
    , h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('shield', 16), ' PIN lock'),
        h('div.card-subtitle', {}, pinSet ? 'Enabled' : 'Not set'),
      ),
      h('div.text-sm.text-muted', { style: { marginBottom: '16px' } },
        pinSet ? 'A 4-digit PIN protects your data after inactivity. Update or remove below.'
              : 'Set a 4-digit PIN so the app locks automatically.'
      ),
      h('div.row', { style: { gap: '8px' } },
        h('button.btn.btn-primary', { onclick: () => setPin() }, icon('shield', 14), pinSet ? ' Change PIN' : ' Set PIN'),
        pinSet ? h('button.btn.btn-danger', { onclick: () => removePin() }, icon('x', 14), ' Remove') : null,
      ),
    )

    // Auto-lock settings
    , h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('clock', 16), ' Auto-lock'),
        h('div.card-subtitle', {}, 'Lock when idle'),
      ),
      h('div.text-sm.text-muted', { style: { marginBottom: '16px' } }, 'Minutes of inactivity before the app locks. Set to 0 to disable.'),
      autoLockSlider(user),
    )

    // Secure notes vault
    , h('div.card', { style: { gridColumn: 'span 2' } },
      h('div.card-header', {},
        h('div.card-title', {}, icon('shield', 16), ' Secure vault'),
        h('div.card-subtitle', {}, 'Encrypted notes (stored locally)'),
      ),
      h('div.col', { style: { gap: '12px' } }, vaultUI())
    )

    // Data controls
    , h('div.card', { style: { gridColumn: 'span 2' } },
      h('div.card-header', {},
        h('div.card-title', {}, icon('settings', 16), ' Data controls'),
      ),
      h('div.row', { style: { gap: '12px', flexWrap: 'wrap' } },
        h('button.btn.btn-secondary', { onclick: () => exportData() }, icon('send', 14), ' Export data'),
        h('button.btn.btn-secondary', { onclick: () => importData() }, icon('refresh', 14), ' Import data'),
        h('button.btn.btn-danger', { onclick: () => wipeData() }, icon('trash', 14), ' Reset everything'),
      ),
    )
  );
}

function autoLockSlider(user) {
  const current = user.autoLockMinutes || 0;
  const slider = h('input.slider', { type: 'range', min: '0', max: '60', step: '5', value: String(current) });
  const val = h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: 'var(--aurora-cyan)' } }, current === 0 ? 'Off' : current + ' min');
  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    val.textContent = v === 0 ? 'Off' : v + ' min';
    store.patch('user', store.get('user.id') || 'me', {});
    store.set('user', { ...store.get('user'), autoLockMinutes: v });
  });
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } }, slider, val);
}

function setPin() {
  const pin = h('input.field-input', { type: 'password', placeholder: '4-digit PIN', maxlength: '4', inputmode: 'numeric' });
  const confirm = h('input.field-input', { type: 'password', placeholder: 'Confirm', maxlength: '4', inputmode: 'numeric' });
  modal({
    title: 'Set PIN',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'New PIN'), pin),
      h('div.field', {}, h('div.field-label', {}, 'Confirm'), confirm),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Save', kind: 'primary', onClick: async () => {
        if (pin.value.length < 4) return toast({ kind: 'warning', title: 'PIN must be 4 digits' });
        if (pin.value !== confirm.value) return toast({ kind: 'warning', title: 'PINs don\'t match' });
        
        const hash = await hashPin(pin.value);
        const oldNotes = await loadNotes(); // Load whatever we have currently
        
        store.set('user', { ...store.get('user'), pinHash: hash });
        unlockedPin = pin.value;
        
        // Encrypt notes with new pin
        const encryptedStr = await encryptData(JSON.stringify(oldNotes), pin.value);
        localStorage.setItem('lifeos:vault', JSON.stringify({ encrypted: true, data: encryptedStr }));
        
        toast({ kind: 'success', title: 'PIN set and vault secured' });
        rerender();
      } }
    ]
  });
}

function removePin() {
  modal({
    title: 'Remove PIN?',
    subtitle: 'This will decrypt your secure notes vault and store them in plaintext.',
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Remove', kind: 'danger', onClick: async () => {
        const notes = await loadNotes();
        localStorage.setItem('lifeos:vault', JSON.stringify(notes)); // Save as plaintext array
        store.set('user', { ...store.get('user'), pinHash: null });
        unlockedPin = null;
        toast({ kind: 'info', title: 'PIN removed' });
        rerender();
      } }
    ]
  });
}

function vaultUI() {
  const container = h('div', {});
  const pinSet = !!store.get('user.pinHash');
  
  if (!pinSet) {
    container.appendChild(h('div.empty', { style: { padding: '20px' } }, 
      h('div.empty-icon', {}, '🔐'),
      h('div.empty-title', {}, 'PIN Lock Required'),
      h('div.empty-sub', {}, 'Set a 4-digit PIN above to enable and unlock the secure notes vault.')
    ));
    return container;
  }
  
  if (!unlockedPin) {
    const pinField = h('input.field-input', { type: 'password', placeholder: 'Enter PIN', maxlength: '4', inputmode: 'numeric', style: { maxWidth: '200px' } });
    const unlockBtn = h('button.btn.btn-primary', {
      onclick: async () => {
        const hash = await hashPin(pinField.value);
        if (hash === store.get('user.pinHash')) {
          unlockedPin = pinField.value;
          rerender();
        } else {
          toast({ kind: 'warning', title: 'Incorrect PIN' });
        }
      }
    }, 'Unlock Vault');
    
    container.appendChild(h('div.col', { style: { alignItems: 'center', gap: '16px', padding: '24px' } },
      h('div.empty-icon', {}, '🔒'),
      h('div.empty-title', {}, 'Vault Locked'),
      h('div.empty-sub', {}, 'Enter your PIN to decrypt and access your secure notes.'),
      h('div.row', { style: { gap: '8px', width: '100%', justifyContent: 'center' } }, pinField, unlockBtn)
    ));
    
    pinField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlockBtn.click();
    });
    
    return container;
  }

  // Vault is unlocked
  const noteList = h('div.list', {});
  container.appendChild(noteList);
  
  loadNotes().then(notes => {
    noteList.innerHTML = '';
    if (notes.length === 0) {
      noteList.appendChild(h('div.empty', { style: { padding: '20px' } },
        h('div.empty-icon', {}, '🔓'),
        h('div.empty-title', {}, 'Vault empty'),
        h('div.empty-sub', {}, 'Add encrypted notes that only you can read.')
      ));
    } else {
      notes.forEach((n, idx) => {
        noteList.appendChild(h('div.list-item', { onclick: () => viewNote(idx) },
          h('div', { style: { width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elev-2)', display: 'grid', placeItems: 'center', fontSize: '14px' } }, '🔑'),
          h('div.list-item-title', {}, n.title || 'Untitled'),
          h('div.list-item-meta', {}, new Date(n.createdAt).toLocaleDateString()),
        ));
      });
    }
  });
  
  container.appendChild(h('div.row', { style: { gap: '8px', marginTop: '12px' } },
    h('button.btn.btn-secondary.btn-sm', { onclick: () => addNote() }, icon('plus', 12), ' Add secure note'),
    h('button.btn.btn-ghost.btn-sm', { onclick: () => { unlockedPin = null; rerender(); } }, icon('lock', 12), ' Lock vault')
  ));
  
  return container;
}

function addNote() {
  const title = h('input.field-input', { placeholder: 'Title' });
  const body = h('textarea.field-textarea', { placeholder: 'Sensitive content' });
  modal({
    title: 'New secure note',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), title),
      h('div.field', {}, h('div.field-label', {}, 'Content'), body),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Encrypt & save', kind: 'primary', onClick: async () => {
        const notes = await loadNotes();
        notes.push({ id: Math.random().toString(36).slice(2), title: title.value, body: body.value, createdAt: Date.now() });
        const encryptedStr = await encryptData(JSON.stringify(notes), unlockedPin);
        localStorage.setItem('lifeos:vault', JSON.stringify({ encrypted: true, data: encryptedStr }));
        toast({ kind: 'success', title: 'Encrypted' });
        rerender();
      } }
    ]
  });
}

function viewNote(idx) {
  loadNotes().then(notes => {
    const n = notes[idx];
    if (!n) return;
    modal({
      title: n.title || 'Untitled',
      body: h('div', { style: { whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '12px', background: 'var(--bg-elev-1)', borderRadius: '8px' } }, n.body),
      actions: [
        { label: 'Delete', kind: 'danger', onClick: async () => {
          notes.splice(idx, 1);
          const encryptedStr = await encryptData(JSON.stringify(notes), unlockedPin);
          localStorage.setItem('lifeos:vault', JSON.stringify({ encrypted: true, data: encryptedStr }));
          toast({ kind: 'info', title: 'Removed' });
          rerender();
        } },
        { label: 'Close', kind: 'ghost' },
      ]
    });
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lifeos-export-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast({ kind: 'success', title: 'Exported' });
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      store.state = data;
      store.persist();
      toast({ kind: 'success', title: 'Imported', body: 'Reloading…' });
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast({ kind: 'danger', title: 'Import failed' });
    }
  };
  input.click();
}

function wipeData() {
  modal({
    title: 'Reset everything?',
    subtitle: 'This deletes all your local data. This cannot be undone.',
    body: h('div', {}, h('div.text-sm.text-muted', {}, 'You\'ll start with a fresh seed dataset.')),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Reset', kind: 'danger', onClick: () => {
        localStorage.removeItem('lifeos:v2');
        localStorage.removeItem('lifeos:vault');
        location.reload();
      } }
    ]
  });
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'security' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}

export function lockApp() {
  unlockedPin = null;
  showLockScreen();
  if (location.hash === '#security') {
    rerender();
  }
}

export function showLockScreen() {
  if (isLocked) return;
  const pinHash = store.get('user.pinHash');
  if (!pinHash) return;

  isLocked = true;
  
  const backdrop = h('div.lock-screen-backdrop', {
    style: {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      background: 'var(--bg-void)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(40px)',
      animation: 'fadeIn 0.3s ease-out'
    }
  });

  const glow = h('div', {
    style: {
      position: 'absolute',
      width: '300px',
      height: '300px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(176, 124, 255, 0.2) 0%, transparent 70%)',
      zIndex: '-1'
    }
  });
  backdrop.appendChild(glow);

  const container = h('div.lock-container', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
      width: '100%',
      maxWidth: '320px',
      padding: '24px',
      textAlign: 'center'
    }
  });

  const brandMark = h('div.brand-mark', { style: { width: '64px', height: '64px', fontSize: '32px', borderRadius: 'var(--r-lg)', margin: '0 auto' } }, 'L');
  
  const title = h('h1', {
    style: {
      fontSize: '24px',
      fontWeight: '700',
      color: 'var(--text-100)',
      background: 'linear-gradient(135deg, var(--aurora-cyan), var(--aurora-violet))',
      webkitBackgroundClip: 'text',
      backgroundClip: 'text',
      webkitTextFillColor: 'transparent',
      margin: '0'
    }
  }, 'LifeOS Locked');

  const inputContainer = h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', margin: '16px 0' } });
  const dots = Array.from({ length: 4 }, () => h('div', {
    style: {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      border: '2px solid var(--border-strong)',
      transition: 'all 0.15s ease'
    }
  }));
  dots.forEach(d => inputContainer.appendChild(d));

  let pinVal = '';

  const updateDots = () => {
    dots.forEach((d, idx) => {
      if (idx < pinVal.length) {
        d.style.background = 'var(--aurora-cyan)';
        d.style.boxShadow = 'var(--glow-cyan)';
        d.style.borderColor = 'var(--aurora-cyan)';
      } else {
        d.style.background = 'transparent';
        d.style.boxShadow = 'none';
        d.style.borderColor = 'var(--border-strong)';
      }
    });
  };

  const statusMsg = h('div', { style: { height: '20px', fontSize: '13px', color: 'var(--danger)', fontWeight: '500' } });

  const tryUnlock = async () => {
    if (pinVal.length < 4) return;
    const hash = await hashPin(pinVal);
    if (hash === pinHash) {
      unlockedPin = pinVal;
      isLocked = false;
      backdrop.remove();
      toast({ kind: 'success', title: 'Unlocked' });
      if (location.hash === '#security') {
        rerender();
      }
    } else {
      pinVal = '';
      updateDots();
      statusMsg.textContent = 'Incorrect PIN';
      setTimeout(() => { statusMsg.textContent = ''; }, 2000);
      if (navigator.vibrate) navigator.vibrate(200);
    }
  };

  const keypad = h('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      width: '100%'
    }
  });

  const appendNum = (n) => {
    if (pinVal.length >= 4) return;
    pinVal += n;
    updateDots();
    if (pinVal.length === 4) {
      setTimeout(tryUnlock, 150);
    }
  };

  const backspace = () => {
    if (pinVal.length > 0) {
      pinVal = pinVal.slice(0, -1);
      updateDots();
    }
  };

  for (let i = 1; i <= 9; i++) {
    keypad.appendChild(h('button.btn', {
      style: {
        height: '56px',
        borderRadius: '50%',
        fontSize: '20px',
        fontWeight: '600',
        background: 'var(--bg-elev-1)',
        border: '1px solid var(--border-soft)',
        color: 'var(--text-100)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer'
      },
      onclick: () => appendNum(String(i))
    }, String(i)));
  }

  keypad.appendChild(h('button.btn', {
    style: {
      height: '56px',
      borderRadius: '50%',
      fontSize: '14px',
      fontWeight: '600',
      background: 'transparent',
      border: 'none',
      color: 'var(--text-60)',
      cursor: 'pointer'
    },
    onclick: () => { pinVal = ''; updateDots(); }
  }, 'Clear'));

  keypad.appendChild(h('button.btn', {
    style: {
      height: '56px',
      borderRadius: '50%',
      fontSize: '20px',
      fontWeight: '600',
      background: 'var(--bg-elev-1)',
      border: '1px solid var(--border-soft)',
      color: 'var(--text-100)',
      cursor: 'pointer'
    },
    onclick: () => appendNum('0')
  }, '0'));

  keypad.appendChild(h('button.btn', {
    style: {
      height: '56px',
      borderRadius: '50%',
      fontSize: '14px',
      fontWeight: '600',
      background: 'transparent',
      border: 'none',
      color: 'var(--text-60)',
      cursor: 'pointer'
    },
    onclick: backspace
  }, 'Delete'));

  const keyHandler = (e) => {
    if (!isLocked) {
      window.removeEventListener('keydown', keyHandler);
      return;
    }
    if (e.key >= '0' && e.key <= '9') {
      appendNum(e.key);
    } else if (e.key === 'Backspace') {
      backspace();
    } else if (e.key === 'Escape') {
      pinVal = '';
      updateDots();
    }
  };
  window.addEventListener('keydown', keyHandler);

  container.appendChild(brandMark);
  container.appendChild(title);
  container.appendChild(inputContainer);
  container.appendChild(statusMsg);
  container.appendChild(keypad);
  backdrop.appendChild(container);
  document.body.appendChild(backdrop);
}

export function initSecurity() {
  const pinHash = store.get('user.pinHash');
  if (pinHash) {
    showLockScreen();
  }

  let lastActivity = Date.now();
  const updateActivity = () => {
    lastActivity = Date.now();
  };

  document.addEventListener('mousemove', updateActivity);
  document.addEventListener('keydown', updateActivity);
  document.addEventListener('click', updateActivity);
  document.addEventListener('touchstart', updateActivity);
  document.addEventListener('scroll', updateActivity);

  setInterval(() => {
    const activePinHash = store.get('user.pinHash');
    if (!activePinHash) return;
    if (isLocked) return;

    const autoLockMins = store.get('user.autoLockMinutes') || 0;
    if (autoLockMins > 0 && Date.now() - lastActivity > autoLockMins * 60 * 1000) {
      lockApp();
    }
  }, 5000);
}
