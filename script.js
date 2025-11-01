// script.js — 完全動作版 for the provided index.html / styles.css
document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Elements ---------- */
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = {
    clock: document.getElementById('clock-panel'),
    stopwatch: document.getElementById('stopwatch-panel'),
    alarm: document.getElementById('alarm-panel'),
    settings: document.getElementById('settings-panel'),
  };

  // Clock
  const clockDisplay = document.getElementById('clock-display');
  const timeOffset = document.getElementById('time-offset');
  const offsetLabel = document.getElementById('offset-label');

  // Stopwatch
  const stopwatchDisplay = document.getElementById('stopwatch-display');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const resetBtn = document.getElementById('reset-btn');
  const lapBtn = document.getElementById('lap-btn');
  const lapList = document.getElementById('lap-list');

  // Alarm
  const alarmTimeInput = document.getElementById('alarm-time');
  const addAlarmBtn = document.getElementById('add-alarm');
  const alarmsContainer = document.getElementById('alarms');

  // Settings
  const darkToggle = document.getElementById('dark-toggle');
  const langSelect = document.querySelector('.lang-select'); // exists in settings panel

  /* ---------- State (persisted) ---------- */
  const S = {
    mode: localStorage.getItem('nclock_mode') || 'clock',
    offsetMin: Number(localStorage.getItem('nclock_offsetMin')) || 0, // minutes offset for clock
    swElapsed: Number(localStorage.getItem('nclock_sw_elapsed')) || 0, // ms
    swRunning: false,
    swLaps: JSON.parse(localStorage.getItem('nclock_sw_laps') || '[]'),
    alarms: JSON.parse(localStorage.getItem('nclock_alarms') || '[]'), // {id, hour, min, enabled}
    lastTriggered: localStorage.getItem('nclock_last_triggered') || '',
    darkForced: (localStorage.getItem('nclock_dark_forced') === 'true') || false,
    lang: localStorage.getItem('nclock_lang') || 'ja',
  };

  /* ---------- Utilities ---------- */
  function saveState() {
    localStorage.setItem('nclock_mode', S.mode);
    localStorage.setItem('nclock_offsetMin', String(S.offsetMin));
    localStorage.setItem('nclock_sw_elapsed', String(S.swElapsed));
    localStorage.setItem('nclock_sw_laps', JSON.stringify(S.swLaps));
    localStorage.setItem('nclock_alarms', JSON.stringify(S.alarms));
    localStorage.setItem('nclock_last_triggered', S.lastTriggered);
    localStorage.setItem('nclock_dark_forced', String(S.darkForced));
    localStorage.setItem('nclock_lang', S.lang);
  }

  function uid() { return Math.floor(Math.random() * 1e9).toString(36); }

  function pad(n, d = 2) { return String(n).padStart(d, '0'); }

  /* ---------- Tab / Mode handling ---------- */
  function setActiveMode(mode) {
    S.mode = mode;
    // tabs active class
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    // panels show/hide
    Object.entries(panels).forEach(([k, el]) => {
      if (k === mode) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
    saveState();
  }
  tabs.forEach(btn => {
    btn.addEventListener('click', () => setActiveMode(btn.dataset.mode));
  });

  /* ---------- Clock (offset) ---------- */
  function formatClock(dateObj, showSeconds = true) {
    const hh = pad(dateObj.getHours());
    const mm = pad(dateObj.getMinutes());
    const ss = pad(dateObj.getSeconds());
    return showSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }

  // update offset label text like "+120分" or "-30分" or "0分"
  function updateOffsetLabel() {
    const m = S.offsetMin;
    if (m === 0) offsetLabel.textContent = '0分';
    else offsetLabel.textContent = (m > 0 ? `+${m}分` : `${m}分`);
  }

  // initialize offset UI
  timeOffset.value = String(S.offsetMin);
  updateOffsetLabel();
  timeOffset.addEventListener('input', (e) => {
    S.offsetMin = Number(e.target.value);
    updateOffsetLabel();
    saveState();
  });

  /* ---------- Stopwatch ---------- */
  let swLastTick = performance.now();
  let swRunning = false;

  function renderStopwatch() {
    stopwatchDisplay.textContent = formatStopwatch(S.swElapsed);
  }
  function formatStopwatch(ms) {
    const totalHundredths = Math.floor(ms / 10);
    const hundredths = totalHundredths % 100;
    const totalSeconds = Math.floor(totalHundredths / 100);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600);
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}.${pad(hundredths, 2)}`;
  }
  function renderLaps() {
    lapList.innerHTML = '';
    if (S.swLaps.length === 0) {
      lapList.innerHTML = `<div style="color:var(--muted);padding:8px">ラップなし</div>`;
      return;
    }
    S.swLaps.forEach((t, i) => {
      const node = document.createElement('div');
      node.className = 'lap-item';
      node.innerHTML = `<div>Lap ${S.swLaps.length - i}</div><div>${t}</div>`;
      lapList.appendChild(node);
    });
  }

  startBtn.addEventListener('click', () => {
    swRunning = true;
    S.swRunning = true;
    swLastTick = performance.now();
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    lapBtn.disabled = false;
    resetBtn.disabled = true;
  });

  stopBtn.addEventListener('click', () => {
    swRunning = false;
    S.swRunning = false;
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    lapBtn.disabled = true;
    resetBtn.disabled = false;
    saveState();
  });

  lapBtn.addEventListener('click', () => {
    S.swLaps.unshift(formatStopwatch(S.swElapsed));
    if (S.swLaps.length > 1000) S.swLaps.pop();
    renderLaps();
    saveState();
  });

  resetBtn.addEventListener('click', () => {
    S.swElapsed = 0;
    S.swLaps = [];
    renderLaps();
    renderStopwatch();
    resetBtn.disabled = true;
    saveState();
  });

  renderStopwatch();
  renderLaps();

  /* ---------- Alarm ---------- */
  function renderAlarms() {
    alarmsContainer.innerHTML = '';
    if (!S.alarms || S.alarms.length === 0) {
      alarmsContainer.innerHTML = `<div style="color:var(--muted);padding:8px">アラームなし</div>`;
      return;
    }
    S.alarms.forEach((a, idx) => {
      const card = document.createElement('div');
      card.className = 'alarm-card';

      const timeDiv = document.createElement('div');
      timeDiv.className = 'alarm-time';
      timeDiv.textContent = `${pad(a.hour)}:${pad(a.min)}`;

      const actions = document.createElement('div');
      actions.className = 'alarm-actions';

      // toggle
      const toggle = document.createElement('div');
      toggle.className = 'toggle' + (a.enabled ? ' on' : '');
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      toggle.appendChild(thumb);
      toggle.addEventListener('click', () => {
        a.enabled = !a.enabled;
        saveState();
        renderAlarms();
      });

      // delete
      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '削除';
      del.addEventListener('click', () => {
        S.alarms.splice(idx, 1);
        saveState();
        renderAlarms();
      });

      actions.appendChild(toggle);
      actions.appendChild(del);
      card.appendChild(timeDiv);
      card.appendChild(actions);
      alarmsContainer.appendChild(card);
    });
  }

  addAlarmBtn.addEventListener('click', () => {
    const val = alarmTimeInput.value; // "HH:MM"
    if (!val) { alert('時刻を選択してください'); return; }
    const [hh, mm] = val.split(':').map(v => Number(v));
    if (isNaN(hh) || isNaN(mm)) { alert('不正な時刻です'); return; }
    S.alarms.push({ id: uid(), hour: hh, min: mm, enabled: true });
    saveState();
    renderAlarms();
    alarmTimeInput.value = '';
  });

  renderAlarms();

  function playAlarmSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = ctx.createGain(); g.connect(ctx.destination); g.gain.value = 0.0001;
      const t0 = ctx.currentTime;
      for (let i = 0; i < 5; i++) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 880 - i * 60;
        o.connect(g);
        o.start(t0 + i * 0.45);
        o.stop(t0 + i * 0.45 + 0.35);
      }
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
      setTimeout(() => { try { ctx.close(); } catch (e) { } }, 4000);
    } catch (e) { /* ignore */ }
  }

  /* ---------- Settings (dark mode, language) ---------- */
  // Dark toggle
  if (S.darkForced) document.documentElement.classList.add('dark-forced');
  darkToggle.checked = S.darkForced;
  darkToggle.addEventListener('change', () => {
    S.darkForced = darkToggle.checked;
    if (S.darkForced) document.documentElement.classList.add('dark-forced');
    else document.documentElement.classList.remove('dark-forced');
    saveState();
  });

  // language select (not used much here, placeholder)
  if (langSelect) {
    langSelect.value = S.lang;
    langSelect.addEventListener('change', () => {
      S.lang = langSelect.value;
      saveState();
    });
  }

  /* ---------- Main animation / tick loop ---------- */
  let rafId = null;
  let lastTick = performance.now();

  function mainTick(now) {
    const dt = Math.max(0, now - lastTick);
    lastTick = now;

    // Stopwatch update (if running)
    if (swRunning) {
      S.swElapsed += dt;
      renderStopwatch();
    }

    // Clock update (every frame but we'll show seconds with Date)
    if (S.mode === 'clock') {
      const real = new Date();
      // apply minute offset
      const virtual = new Date(real.getTime() + S.offsetMin * 60000);
      const hh = pad(virtual.getHours());
      const mm = pad(virtual.getMinutes());
      const ss = pad(virtual.getSeconds());
      clockDisplay.textContent = `${hh}:${mm}:${ss}`;
    }

    // Alarm check once per second (trigger at second === 0)
    const nowReal = new Date();
    if (nowReal.getSeconds() === 0) {
      const keyNow = `${nowReal.getFullYear()}${pad(nowReal.getMonth()+1)}${pad(nowReal.getDate())}${pad(nowReal.getHours())}${pad(nowReal.getMinutes())}`;
      S.alarms.forEach(a => {
        if (!a.enabled) return;
        if (a.hour === nowReal.getHours() && a.min === nowReal.getMinutes()) {
          if (S.lastTriggered !== keyNow) {
            S.lastTriggered = keyNow;
            saveState();
            // notification best-effort
            try {
              if (Notification && Notification.permission === 'granted') {
                new Notification('N Clock', { body: `アラーム: ${pad(a.hour)}:${pad(a.min)}` });
              }
            } catch (e) { }
            // sound + alert
            playAlarmSound();
            try { alert(`アラーム: ${pad(a.hour)}:${pad(a.min)}`); } catch (e) { }
          }
        }
      });
    }

    rafId = requestAnimationFrame(mainTick);
  }

  // Start / stop global loop as needed
  function startLoop() {
    if (!rafId) {
      lastTick = performance.now();
      rafId = requestAnimationFrame(mainTick);
    }
  }
  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* ---------- Restore state on load ---------- */
  function restoreAll() {
    // mode
    setActiveMode(S.mode);
    // offset
    timeOffset.value = String(S.offsetMin);
    updateOffsetLabel();
    // stopwatch
    renderStopwatch();
    renderLaps();
    // alarms
    renderAlarms();
    // dark
    darkToggle.checked = S.darkForced;
    if (S.darkForced) document.documentElement.classList.add('dark-forced');
    // language select
    if (langSelect) langSelect.value = S.lang;
    // If stopwatch was running when left, keep it stopped (we don't auto-run)
    S.swRunning = false;
    swRunning = false;
    startLoop();
  }

  restoreAll();
  startLoop();

  // request Notification permission proactively (non-blocking)
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(()=>{});
  }

  // save periodically
  setInterval(saveState, 2000);
});
