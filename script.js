const display = document.getElementById('display');
const tabClock = document.getElementById('tabClock');
const tabAlarm = document.getElementById('tabAlarm');
const tabSettings = document.getElementById('tabSettings');
const contents = document.querySelectorAll('.content');

const slider = document.getElementById('sliderHours');
const labelHours = document.getElementById('labelHours');
const toggleSeconds = document.getElementById('toggleSeconds');
const addAlarm = document.getElementById('addAlarm');
const alarmList = document.querySelector('.alarm-list');

let customHours = Number(localStorage.getItem('nclock_hours')) || 24;
let showSeconds = localStorage.getItem('nclock_showSeconds') !== 'false';
let alarms = JSON.parse(localStorage.getItem('nclock_alarms') || '[]');

slider.value = customHours;
labelHours.textContent = `${customHours} 時間`;
toggleSeconds.checked = showSeconds;

// タブ切り替え
function switchTab(target) {
  document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
  contents.forEach(c => c.classList.remove('active'));
  target.classList.add('active');
  document.querySelector(`#content${target.id.replace('tab', '')}`).classList.add('active');
}

tabClock.addEventListener('click', () => switchTab(tabClock));
tabAlarm.addEventListener('click', () => switchTab(tabAlarm));
tabSettings.addEventListener('click', () => switchTab(tabSettings));

// スライダー変更
slider.addEventListener('input', e => {
  customHours = Number(e.target.value);
  labelHours.textContent = `${customHours} 時間`;
  localStorage.setItem('nclock_hours', customHours);
});

// 秒数表示トグル
toggleSeconds.addEventListener('change', e => {
  showSeconds = e.target.checked;
  localStorage.setItem('nclock_showSeconds', showSeconds);
});

// 時計更新
function tick() {
  const speed = 24 / customHours;
  const now = new Date();
  const secOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const virtualSec = secOfDay * speed;
  const h = Math.floor(virtualSec / 3600) % 24;
  const m = Math.floor(virtualSec / 60) % 60;
  const s = Math.floor(virtualSec) % 60;
  display.textContent = showSeconds
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  checkAlarms(h, m);
}

setInterval(tick, 1000);
tick();

// アラーム表示更新
function renderAlarms() {
  alarmList.innerHTML = '';
  alarms.forEach((alarm, index) => {
    const div = document.createElement('div');
    div.className = 'alarm-item';
    div.innerHTML = `
      <div class="alarm-time">${alarm.h.padStart(2, '0')}:${alarm.m.padStart(2, '0')}</div>
      <label class="switch">
        <input type="checkbox" ${alarm.on ? 'checked' : ''} data-index="${index}">
        <span class="slider round"></span>
      </label>
    `;
    alarmList.appendChild(div);
  });
}

renderAlarms();

// アラーム追加
addAlarm.addEventListener('click', () => {
  const now = new Date();
  const h = String(now.getHours());
  const m = String(now.getMinutes());
  alarms.push({ h, m, on: true });
  localStorage.setItem('nclock_alarms', JSON.stringify(alarms));
  renderAlarms();
});

// アラームON/OFF
alarmList.addEventListener('change', e => {
  if (e.target.matches('input[type="checkbox"]')) {
    const index = e.target.dataset.index;
    alarms[index].on = e.target.checked;
    localStorage.setItem('nclock_alarms', JSON.stringify(alarms));
  }
});

// アラームチェック
function checkAlarms(h, m) {
  alarms.forEach(alarm => {
    if (alarm.on && Number(alarm.h) === h && Number(alarm.m) === m) {
      alert(`⏰ アラーム: ${alarm.h.padStart(2, '0')}:${alarm.m.padStart(2, '0')}`);
      alarm.on = false;
      localStorage.setItem('nclock_alarms', JSON.stringify(alarms));
      renderAlarms();
    }
  });
}
