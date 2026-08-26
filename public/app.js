document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initClock();
  initCalendar();
  loadHabits();
  
  // Section 1 Tracker Initialisierung
  initTrackers();

  // Section 2 Interactive Modules Initialisierung
  initBookshelf();
  initFinance();
  initBingo();
  initProjectProgress();

  // Section 3 Reflection & Divider Initialisierung
  initReflectionAndDividers();

  // Formular Handling für neuen Kurs
  const addCourseForm = document.getElementById('add-course-form');
  if (addCourseForm) {
    addCourseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('course-title').value;
      const type = document.getElementById('course-type').value;
      const day = document.getElementById('course-day').value;
      const color = document.getElementById('course-color').value;
      const start = document.getElementById('course-start').value;
      const end = document.getElementById('course-end').value;

      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, type, dayOfWeek: parseInt(day), startTime: start, endTime: end, color })
        });
        if (res.ok) {
          addCourseForm.reset();
          if (window.calendarObj) window.calendarObj.refetchEvents();
        }
      } catch (err) { console.error('Fehler:', err); }
    });
  }
});

/* Navigation Umschalter */
function initNav() {
  const buttons = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.dashboard-view');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      buttons.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetId).classList.add('active');

      // Kalender-Layout aktualisieren, falls zum Studium-Dashboard gewechselt wird
      if (targetId === 'view-studium' && window.calendarObj) {
        setTimeout(() => window.calendarObj.updateSize(), 100);
      }
    });
  });
}

// Live Uhr (Deutsche Zeit / 24h Format)
function initClock() {
  const clockEl = document.getElementById('telemetry-time');
  setInterval(() => {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }, 1000);
}

function getPastelColor(hexColor) {
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  return `rgb(${Math.round(r * 0.15 + 255 * 0.85)}, ${Math.round(g * 0.15 + 255 * 0.85)}, ${Math.round(b * 0.15 + 255 * 0.85)})`;
}

/* Großer Stundenplan im deutschen Format */
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: 'de',
    timeZone: 'Europe/Berlin',
    initialView: 'timeGridWeek',
    hiddenDays: [0, 6],
    slotMinTime: '08:00:00',
    slotMaxTime: '19:00:00',
    slotDuration: '00:30:00',
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    headerToolbar: false,
    allDaySlot: false,
    events: '/api/events',
    eventDidMount: function(info) {
      const type = info.event.extendedProps.type;
      const baseColor = info.event.extendedProps.color || '#e10600';
      if (type === 'labor' || type === 'tutorium') {
        info.el.style.backgroundColor = getPastelColor(baseColor);
        info.el.style.borderColor = baseColor;
        info.el.style.color = '#121418';
      } else {
        info.el.style.backgroundColor = baseColor;
        info.el.style.borderColor = baseColor;
        info.el.style.color = '#ffffff';
      }
    }
  });
  calendar.render();
  window.calendarObj = calendar;
}

async function loadHabits() {
  try {
    const res = await fetch('/api/habits');
    const habits = await res.json();
    const container = document.getElementById('habits-container');
    if (container) {
      container.innerHTML = habits.map(h => `
        <div class="habit-card"><span>${h.name}</span><input type="checkbox"></div>
      `).join('');
    }
  } catch (err) { console.error(err); }
}

/* TRACKERS & INTERACTIVE MODULES */
const trackerConfigs = {
  mood: { name: "Mood & Energy Flow", colors: { '1': '#aa1111', '2': '#ff8c00', '3': '#ffb800', '4': '#2ed573', '5': '#1e90ff' }, labels: ['01 Rest', '02 Low', '03 Balanced', '04 Good', '05 Radiant'] },
  weather: { name: "Weather & Seasons", colors: { '1': '#74b9ff', '2': '#00cec9', '3': '#ffeaa7', '4': '#fdcb6e', '5': '#6c5ce7' }, labels: ['Rainy', 'Cloudy', 'Sunny', 'Hot', 'Stormy'] },
  health: { name: "Health & Body Mind", colors: { '1': '#e74c3c', '2': '#e67e22', '3': '#f1c40f', '4': '#2ecc71', '5': '#1abc9c' }, labels: ['Pain/Sick', 'Fatigued', 'Okay', 'Strong', 'Vital'] },
  focus: { name: "Productivity & Focus", colors: { '1': '#d63031', '2': '#fd79a8', '3': '#a29bfe', '4': '#0984e3', '5': '#00b894' }, labels: ['Procrastinated', 'Low Focus', 'Normal', 'Deep Work', 'Flow State'] },
  sleep: { name: "Sleep & Rest", colors: { '1': '#2d3436', '2': '#636e72', '3': '#b2bec3', '4': '#0984e3', '5': '#6c5ce7' }, labels: ['< 5h', '5-6h', '6-7h', '7-8h', '8h+ / Rested'] },
  movement: { name: "Movement & Fitness", colors: { '1': '#b2bec3', '2': '#74b9ff', '3': '#55efc4', '4': '#ffeaa7', '5': '#ff7675' }, labels: ['Rest Day', 'Walk', 'Yoga/Stretch', 'Run', 'Gym Session'] },
  connection: { name: "Social & Connection", colors: { '1': '#fd79a8', '2': '#e84393', '3': '#6c5ce7', '4': '#00cec9', '5': '#fdcb6e' }, labels: ['Solo Time', 'Partner', 'Friends', 'Family', 'Community'] },
  nourishment: { name: "Nourishment & Water", colors: { '1': '#ff7675', '2': '#ffeaa7', '3': '#74b9ff', '4': '#55efc4', '5': '#00b894' }, labels: ['Low Water', 'Balanced', 'Hydrated', 'No-Sugar', 'Clean Eating'] }
};

function initTrackers() {
  const select = document.getElementById('tracker-type-select');
  if (!select) return;
  select.addEventListener('change', () => renderTracker(select.value));
  renderTracker('mood');
}

function renderTracker(type) {
  const config = trackerConfigs[type];
  const container = document.getElementById('interactive-tracker-container');
  const legendDisplay = document.getElementById('tracker-legend-display');
  if (!container || !config) return;

  legendDisplay.innerHTML = config.labels.map((lbl, idx) => `
    <span class="legend-item" style="--c: ${config.colors[idx + 1]}">${lbl}</span>
  `).join('');

  const savedData = JSON.parse(localStorage.getItem(`tracker_${type}`) || '{}');
  const months = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];

  let svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 820" width="100%">`;

  months.forEach((m, idx) => {
    svgHtml += `<text x="${112 + idx * 52}" y="20" font-size="10" fill="#444" font-weight="bold" text-anchor="middle">${m}</text>`;
  });

  for (let day = 1; day <= 31; day++) {
    const y = 30 + (day - 1) * 24;
    svgHtml += `<text x="75" y="${y + 15}" font-size="9" fill="#777" text-anchor="end">${day < 10 ? '0' + day : day}</text>`;

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const x = 90 + mIdx * 52;
      const key = `${mIdx + 1}-${day}`;
      const lvl = savedData[key] || 0;
      const fill = lvl ? config.colors[lvl] : 'none';

      svgHtml += `
        <rect class="interactive-cell" data-key="${key}" data-level="${lvl}"
              x="${x}" y="${y}" width="44" height="20" rx="3"
              fill="${fill}" stroke="#ccc" stroke-width="0.6" />
      `;
    }
  }
  svgHtml += `</svg>`;
  container.innerHTML = svgHtml;

  container.querySelectorAll('.interactive-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const key = e.target.getAttribute('data-key');
      let lvl = parseInt(e.target.getAttribute('data-level') || '0');
      lvl = (lvl + 1) % 6;
      e.target.setAttribute('data-level', lvl);
      e.target.setAttribute('fill', lvl === 0 ? 'none' : config.colors[lvl]);
      savedData[key] = lvl;
      localStorage.setItem(`tracker_${type}`, JSON.stringify(savedData));
    });
  });
}

function initBookshelf() {
  const container = document.getElementById('bookshelf-container');
  if (!container) return;
  const savedBooks = JSON.parse(localStorage.getItem('bookshelfData') || '[]');

  function renderBooks() {
    container.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const book = savedBooks[i] || { title: 'Book ' + (i + 1), read: false };
      const bookEl = document.createElement('div');
      bookEl.className = 'book-spine';
      bookEl.style.height = (70 + (i % 4) * 12) + 'px';
      bookEl.style.backgroundColor = book.read ? '#e10600' : '#2a2e39';
      bookEl.textContent = book.title;
      bookEl.addEventListener('click', () => {
        const newTitle = prompt('Buchtitel eingeben:', book.title);
        if (newTitle !== null) {
          book.title = newTitle;
          book.read = !book.read;
          savedBooks[i] = book;
          localStorage.setItem('bookshelfData', JSON.stringify(savedBooks));
          renderBooks();
        }
      });
      container.appendChild(bookEl);
    }
  }
  renderBooks();
}

function initFinance() {
  const miniGrid = document.getElementById('no-spend-grid');
  const savingsGrid = document.getElementById('savings-challenge-container');
  if (!miniGrid || !savingsGrid) return;

  const savedNoSpend = JSON.parse(localStorage.getItem('noSpendData') || '{}');
  miniGrid.innerHTML = '';
  for (let i = 1; i <= 31; i++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'mini-day';
    dayEl.textContent = i;
    if (savedNoSpend[i]) dayEl.style.backgroundColor = '#00b894';
    dayEl.addEventListener('click', () => {
      savedNoSpend[i] = !savedNoSpend[i];
      localStorage.setItem('noSpendData', JSON.stringify(savedNoSpend));
      dayEl.style.backgroundColor = savedNoSpend[i] ? '#00b894' : '#1e222b';
    });
    miniGrid.appendChild(dayEl);
  }

  const savedSavings = JSON.parse(localStorage.getItem('savingsData') || '{}');
  savingsGrid.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const item = document.createElement('div');
    item.className = 'savings-item';
    item.textContent = `${i * 100}€`;
    if (savedSavings[i]) item.style.backgroundColor = '#ffb800', item.style.color = '#121418';
    item.addEventListener('click', () => {
      savedSavings[i] = !savedSavings[i];
      localStorage.setItem('savingsData', JSON.stringify(savedSavings));
      item.style.backgroundColor = savedSavings[i] ? '#ffb800' : '#1e222b';
      item.style.color = savedSavings[i] ? '#121418' : '#fff';
    });
    savingsGrid.appendChild(item);
  }
}

function initBingo() {
  const container = document.getElementById('bingo-grid');
  if (!container) return;
  const bingoItems = [
    'Spaziergang', 'Digital Detoxing', '8h Schlaf', 'Meditation', 'Lieblingsessen',
    'Buch lesen', 'Pflanzen gießen', 'Dehnen', 'Wasser trinken', '10k Schritte',
    'Kein Zucker', 'Frische Luft', 'FREE SPACE', 'Musik hören', 'Sonne tanken',
    'Tee trinken', 'Journaling', 'Freunde anrufen', 'Früh schlafen', 'Ordnung machen',
    'Dankbarkeit', 'Podcast hören', 'Skincare', 'Me-Time', 'Lächeln'
  ];
  const savedBingo = JSON.parse(localStorage.getItem('bingoData') || '{}');

  container.innerHTML = '';
  bingoItems.forEach((item, idx) => {
    const cell = document.createElement('div');
    cell.className = 'bingo-cell';
    cell.textContent = item;
    if (savedBingo[idx]) cell.style.backgroundColor = '#e10600';
    cell.addEventListener('click', () => {
      savedBingo[idx] = !savedBingo[idx];
      localStorage.setItem('bingoData', JSON.stringify(savedBingo));
      cell.style.backgroundColor = savedBingo[idx] ? '#e10600' : '#1e222b';
    });
    container.appendChild(cell);
  });
}

function initProjectProgress() {
  const sliders = document.querySelectorAll('.project-slider');
  sliders.forEach(slider => {
    const proj = slider.getAttribute('data-proj');
    slider.value = localStorage.getItem(`proj_${proj}`) || 0;
    slider.addEventListener('input', (e) => {
      localStorage.setItem(`proj_${proj}`, e.target.value);
    });
  });
}

const monthData = [
  { name: 'JANUAR // WINTER SOLSTICE', art: '❄️ 🌙 🌿' },
  { name: 'FEBRUAR // DEEP FROST', art: '🕯️ ✨ 🪴' },
  { name: 'MÄRZ // BLOOMING BEGINNINGS', art: '🌱 🌸 🍃' },
  { name: 'APRIL // SPRING EQUINOX', art: '🌷 ☀️ 🪺' },
  { name: 'MAI // FLORAL FLOW', art: '🌺 🐝 🌿' },
  { name: 'JUNI // SUMMER SOLSTICE', art: '☀️ 🌊 🪷' },
  { name: 'JULI // HIGH SUMMER', art: '🏖️ 🌻 🌙' },
  { name: 'AUGUST // STARRY NIGHTS', art: '🌌 🌾 🪵' },
  { name: 'SEPTEMBER // AUTUMN EQUINOX', art: '🍂 🍁 🪵' },
  { name: 'OKTOBER // HARVEST MOON', art: '🎃 📜 🌖' },
  { name: 'NOVEMBER // FOGGY DAYS', art: '🌧️ ☕ 🌲' },
  { name: 'DEZEMBER // WINTER NIGHTS', art: '✨ ❄️ 🌲' }
];

function initReflectionAndDividers() {
  let currentMonth = 0;
  const titleEl = document.getElementById('divider-title');
  const artEl = document.getElementById('divider-art');
  
  const successInput = document.getElementById('reflect-success');
  const gratitudeInput = document.getElementById('reflect-gratitude');
  const lessonInput = document.getElementById('reflect-lesson');
  const yearInput = document.getElementById('year-review-text');

  function loadReflection(m) {
    currentMonth = m;
    if (titleEl) titleEl.textContent = monthData[m].name;
    if (artEl) artEl.innerHTML = `<span style="font-size:2.5rem;">${monthData[m].art}</span>`;
    
    const data = JSON.parse(localStorage.getItem(`reflect_${m}`) || '{}');
    if (successInput) successInput.value = data.success || '';
    if (gratitudeInput) gratitudeInput.value = data.gratitude || '';
    if (lessonInput) lessonInput.value = data.lesson || '';
  }

  function saveReflection() {
    const data = {
      success: successInput ? successInput.value : '',
      gratitude: gratitudeInput ? gratitudeInput.value : '',
      lesson: lessonInput ? lessonInput.value : ''
    };
    localStorage.setItem(`reflect_${currentMonth}`, JSON.stringify(data));
  }

  [successInput, gratitudeInput, lessonInput].forEach(el => {
    if (el) el.addEventListener('input', saveReflection);
  });

  if (yearInput) {
    yearInput.value = localStorage.getItem('year_review') || '';
    yearInput.addEventListener('input', (e) => localStorage.setItem('year_review', e.target.value));
  }

  document.querySelectorAll('.btn-month').forEach(btn => {
    btn.addEventListener('click', (e) => loadReflection(parseInt(e.target.getAttribute('data-m'))));
  });

  loadReflection(0);
}