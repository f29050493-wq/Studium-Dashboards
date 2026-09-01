document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initClock();
  initCalendar();
  initMonthCalendar();
  loadCourses();
  loadHabits();
  
  // Self-Care Module
  initTrackers();
  initBookshelf();
  initBingo();
  initProjectProgress();

  // Kurs hinzufügen
  const addCourseForm = document.getElementById('add-course-form');
  if (addCourseForm) {
    addCourseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const courseObj = {
        id: 'c_' + Date.now(),
        title: document.getElementById('course-title').value,
        type: document.getElementById('course-type').value,
        dayOfWeek: parseInt(document.getElementById('course-day').value),
        startTime: document.getElementById('course-start').value,
        endTime: document.getElementById('course-end').value,
        color: document.getElementById('course-color').value
      };

      try {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(courseObj)
        });
      } catch (err) {}

      const localCourses = JSON.parse(localStorage.getItem('userCourses') || '[]');
      localCourses.push(courseObj);
      localStorage.setItem('userCourses', JSON.stringify(localCourses));

      addCourseForm.reset();
      if (window.calendarObj) window.calendarObj.refetchEvents();
      loadCourses();
    });
  }

  // Habit hinzufügen
  const addHabitForm = document.getElementById('add-habit-form');
  if (addHabitForm) {
    addHabitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('habit-name');
      const name = input.value.trim();
      if (!name) return;

      const habitObj = { id: 'h_' + Date.now(), name };

      try {
        await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habitObj)
        });
      } catch (err) {}

      const localHabits = JSON.parse(localStorage.getItem('userHabits') || '[]');
      localHabits.push(habitObj);
      localStorage.setItem('userHabits', JSON.stringify(localHabits));

      input.value = '';
      loadHabits();
    });
  }

  // Termin hinzufügen
  const addAppForm = document.getElementById('add-appointment-form');
  if (addAppForm) {
    addAppForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('app-title').value;
      const date = document.getElementById('app-date').value;
      const color = document.getElementById('app-color').value;

      if (window.monthCalendarObj) {
        window.monthCalendarObj.addEvent({
          id: 'app_' + Date.now(),
          title,
          start: date,
          allDay: true,
          backgroundColor: color,
          borderColor: color
        });
        addAppForm.reset();
      }
    });
  }
});

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

      if (targetId === 'view-studium') {
        setTimeout(() => {
          if (window.calendarObj) window.calendarObj.updateSize();
          if (window.monthCalendarObj) window.monthCalendarObj.updateSize();
        }, 100);
      }
    });
  });
}

function initClock() {
  const clockEl = document.getElementById('telemetry-time');
  setInterval(() => {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }, 1000);
}

/* Großer Wochenstundenplan */
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
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    headerToolbar: false,
    allDaySlot: false,
    events: async function(fetchInfo, successCallback) {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const events = await res.json();
          successCallback(events);
          return;
        }
      } catch (err) {}
      const local = JSON.parse(localStorage.getItem('userCourses') || '[]');
      successCallback(local);
    },
    eventDidMount: function(info) {
      const baseColor = info.event.extendedProps.color || '#00897b';
      info.el.style.backgroundColor = baseColor;
      info.el.style.borderColor = baseColor;
      info.el.style.color = '#ffffff';
      info.el.style.borderRadius = '6px';
    }
  });
  calendar.render();
  window.calendarObj = calendar;
}

/* Monats-Kalender */
function initMonthCalendar() {
  const container = document.getElementById('month-calendar');
  if (!container) return;

  const monthCalendar = new FullCalendar.Calendar(container, {
    locale: 'de',
    timeZone: 'Europe/Berlin',
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    editable: true,
    events: JSON.parse(localStorage.getItem('userAppointments') || '[]'),
    eventClick: function(info) {
      info.event.remove();
    },
    eventChange: saveAppointments,
    eventAdd: saveAppointments,
    eventRemove: saveAppointments
  });

  monthCalendar.render();
  window.monthCalendarObj = monthCalendar;
}

function saveAppointments() {
  if (!window.monthCalendarObj) return;
  const events = window.monthCalendarObj.getEvents().map(e => ({
    id: e.id,
    title: e.title,
    start: e.startStr,
    backgroundColor: e.backgroundColor,
    borderColor: e.borderColor
  }));
  localStorage.setItem('userAppointments', JSON.stringify(events));
}

/* Kurse laden & direkt löschen */
async function loadCourses() {
  const container = document.getElementById('courses-list');
  if (!container) return;

  let courses = [];
  try {
    const res = await fetch('/api/events');
    if (res.ok) courses = await res.json();
    else throw new Error();
  } catch (err) {
    courses = JSON.parse(localStorage.getItem('userCourses') || '[]');
  }

  if (courses.length === 0) {
    container.innerHTML = '<p class="subtext">Keine Kurse eingetragen.</p>';
    return;
  }

  container.innerHTML = courses.map(c => {
    const id = c._id || c.id;
    return `
      <div class="item-card" style="--card-c: ${c.color || '#00897b'}">
        <span>${c.title}</span>
        <button class="btn-delete" onclick="deleteCourse('${id}')" title="Kurs löschen">🗑️</button>
      </div>
    `;
  }).join('');
}

async function deleteCourse(id) {
  try { await fetch(`/api/events/${id}`, { method: 'DELETE' }); } catch (err) {}
  let local = JSON.parse(localStorage.getItem('userCourses') || '[]');
  local = local.filter(c => (c._id || c.id) !== id);
  localStorage.setItem('userCourses', JSON.stringify(local));

  if (window.calendarObj) window.calendarObj.refetchEvents();
  loadCourses();
}

/* Habits laden & direkt löschen */
async function loadHabits() {
  const container = document.getElementById('habits-container');
  if (!container) return;

  let habits = [];
  try {
    const res = await fetch('/api/habits');
    if (res.ok) habits = await res.json();
    else throw new Error();
  } catch (err) {
    habits = JSON.parse(localStorage.getItem('userHabits') || '[]');
  }

  if (habits.length === 0) {
    container.innerHTML = '<p class="subtext">Keine Habits eingetragen.</p>';
    return;
  }

  container.innerHTML = habits.map(h => {
    const id = h._id || h.id;
    return `
      <div class="item-card" style="--card-c: #80cbd3">
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox">
          <span>${h.name}</span>
        </div>
        <button class="btn-delete" onclick="deleteHabit('${id}')" title="Habit löschen">🗑️</button>
      </div>
    `;
  }).join('');
}

async function deleteHabit(id) {
  try { await fetch(`/api/habits/${id}`, { method: 'DELETE' }); } catch (err) {}
  let local = JSON.parse(localStorage.getItem('userHabits') || '[]');
  local = local.filter(h => (h._id || h.id) !== id);
  localStorage.setItem('userHabits', JSON.stringify(local));

  loadHabits();
}

/* TRACKERS & SELF CARE */
const trackerConfigs = {
  mood: { name: "Mood & Energy Flow", colors: { '1': '#e0f2f1', '2': '#b2dfdb', '3': '#80cbd3', '4': '#4db6ac', '5': '#00897b' }, labels: ['Rest', 'Low', 'Balanced', 'Good', 'Radiant'] },
  weather: { name: "Weather & Seasons", colors: { '1': '#b3e5fc', '2': '#81d4fa', '3': '#4fc3f7', '4': '#ffe082', '5': '#ffb74d' }, labels: ['Rainy', 'Cloudy', 'Sunny', 'Hot', 'Stormy'] },
  health: { name: "Health & Body Mind", colors: { '1': '#ffcdd2', '2': '#f8bbd0', '3': '#e1bee7', '4': '#c8e6c9', '5': '#a5d6a7' }, labels: ['Pain/Sick', 'Fatigued', 'Okay', 'Strong', 'Vital'] },
  focus: { name: "Productivity & Focus", colors: { '1': '#ffccbc', '2': '#ffe082', '3': '#80deea', '4': '#80cbd3', '5': '#00897b' }, labels: ['Procrastinated', 'Low Focus', 'Normal', 'Deep Work', 'Flow State'] },
  sleep: { name: "Sleep & Rest", colors: { '1': '#cfd8dc', '2': '#b0bec5', '3': '#90a4ae', '4': '#80cbd3', '5': '#00897b' }, labels: ['< 5h', '5-6h', '6-7h', '7-8h', '8h+ / Rested'] },
  movement: { name: "Movement & Fitness", colors: { '1': '#e0f2f1', '2': '#80cbd3', '3': '#4db6ac', '4': '#80deea', '5': '#00897b' }, labels: ['Rest Day', 'Walk', 'Yoga/Stretch', 'Run', 'Gym Session'] },
  connection: { name: "Social & Connection", colors: { '1': '#f8bbd0', '2': '#f48fb1', '3': '#ce93d8', '4': '#80cbd3', '5': '#00897b' }, labels: ['Solo Time', 'Partner', 'Friends', 'Family', 'Community'] },
  nourishment: { name: "Nourishment & Water", colors: { '1': '#ffccbc', '2': '#ffe082', '3': '#80cbd3', '4': '#4db6ac', '5': '#00897b' }, labels: ['Low Water', 'Balanced', 'Hydrated', 'No-Sugar', 'Clean Eating'] }
};

function initTrackers() {
  const select = document.getElementById('tracker-type-select');
  if (!select) return;
  select.addEventListener('change', () => renderTracker(select.value));
  renderTracker('mood');

  document.addEventListener('click', (e) => {
    const popup = document.getElementById('tracker-popup-menu');
    if (popup && !popup.contains(e.target) && !e.target.classList.contains('interactive-cell')) {
      popup.classList.add('hidden');
    }
  });
}

function renderTracker(type) {
  const config = trackerConfigs[type];
  const container = document.getElementById('interactive-tracker-container');
  const legendDisplay = document.getElementById('tracker-legend-display');
  const popup = document.getElementById('tracker-popup-menu');
  if (!container || !config) return;

  legendDisplay.innerHTML = config.labels.map((lbl, idx) => `
    <span class="legend-item" style="--c: ${config.colors[idx + 1]}">${lbl}</span>
  `).join('');

  const savedData = JSON.parse(localStorage.getItem(`tracker_${type}`) || '{}');
  const months = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];

  let svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 820" width="100%">`;

  months.forEach((m, idx) => {
    svgHtml += `<text x="${112 + idx * 52}" y="20" font-size="10" fill="#607d8b" font-weight="bold" text-anchor="middle">${m}</text>`;
  });

  for (let day = 1; day <= 31; day++) {
    const y = 30 + (day - 1) * 24;
    svgHtml += `<text x="75" y="${y + 15}" font-size="9" fill="#90a4ae" text-anchor="end">${day < 10 ? '0' + day : day}</text>`;

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const x = 90 + mIdx * 52;
      const key = `${mIdx + 1}-${day}`;
      const lvl = savedData[key] || 0;
      const fill = lvl ? config.colors[lvl] : '#ffffff';

      svgHtml += `
        <rect class="interactive-cell" data-key="${key}" data-level="${lvl}"
              x="${x}" y="${y}" width="44" height="20" rx="4"
              fill="${fill}" stroke="#b2dfdb" stroke-width="0.8" />
      `;
    }
  }
  svgHtml += `</svg>`;
  container.innerHTML = svgHtml;

  container.querySelectorAll('.interactive-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetCell = e.target;
      const key = targetCell.getAttribute('data-key');

      let menuHtml = config.labels.map((lbl, idx) => {
        const levelNum = idx + 1;
        const color = config.colors[levelNum];
        return `
          <button class="tracker-menu-btn" style="--btn-color: ${color}" data-level="${levelNum}">
            ${lbl}
          </button>
        `;
      }).join('');

      menuHtml += `<button class="tracker-menu-btn" style="--btn-color: #b0bec5" data-level="0">🗑️ Feld zurücksetzen</button>`;

      popup.innerHTML = menuHtml;

      const parentRect = popup.parentElement.getBoundingClientRect();
      popup.style.left = `${e.clientX - parentRect.left + 10}px`;
      popup.style.top = `${e.clientY - parentRect.top + 10}px`;
      popup.classList.remove('hidden');

      popup.querySelectorAll('.tracker-menu-btn').forEach(btn => {
        btn.onclick = () => {
          const selectedLvl = parseInt(btn.getAttribute('data-level'));
          targetCell.setAttribute('data-level', selectedLvl);
          targetCell.setAttribute('fill', selectedLvl === 0 ? '#ffffff' : config.colors[selectedLvl]);

          savedData[key] = selectedLvl;
          localStorage.setItem(`tracker_${type}`, JSON.stringify(savedData));

          popup.classList.add('hidden');
        };
      });
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
      const book = savedBooks[i] || { title: 'Buch ' + (i + 1), read: false };
      const bookEl = document.createElement('div');
      bookEl.className = 'book-spine';
      bookEl.style.height = (80 + (i % 4) * 14) + 'px';
      bookEl.style.backgroundColor = book.read ? '#00897b' : '#ffffff';
      bookEl.style.color = book.read ? '#ffffff' : '#2c3e50';
      bookEl.textContent = book.title;
      bookEl.addEventListener('click', () => {
        const newTitle = prompt('Buchtitel eingeben (leer lassen zum Zurücksetzen):', book.title);
        if (newTitle !== null) {
          book.title = newTitle.trim() === '' ? 'Buch ' + (i + 1) : newTitle;
          book.read = newTitle.trim() !== '';
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
    if (savedBingo[idx]) {
      cell.style.backgroundColor = '#80cbd3';
      cell.style.color = '#ffffff';
    }
    cell.addEventListener('click', () => {
      savedBingo[idx] = !savedBingo[idx];
      localStorage.setItem('bingoData', JSON.stringify(savedBingo));
      cell.style.backgroundColor = savedBingo[idx] ? '#80cbd3' : '#ffffff';
      cell.style.color = savedBingo[idx] ? '#ffffff' : '#2c3e50';
    });
    container.appendChild(cell);
  });
}

function initProjectProgress() {
  const container = document.getElementById('project-list');
  const addBtn = document.getElementById('add-project-btn');
  if (!container) return;

  const defaultProjects = [
    { id: 'f1art', name: 'Acryl-Gemälde / F1 Art', val: 0 },
    { id: 'crochet', name: 'Amigurumi Häkel-Projekt', val: 0 },
    { id: 'arduino', name: 'Arduino Microcontroller Code', val: 0 }
  ];

  let projects = JSON.parse(localStorage.getItem('customProjects') || JSON.stringify(defaultProjects));

  function renderProjects() {
    container.innerHTML = '';
    projects.forEach((proj, idx) => {
      const item = document.createElement('div');
      item.className = 'project-item';
      item.innerHTML = `
        <div class="project-header">
          <span>${proj.name}</span>
          <div class="project-meta">
            <span id="val-${idx}">${proj.val}%</span>
            <button class="btn-delete" data-idx="${idx}" title="Projekt löschen">🗑️</button>
          </div>
        </div>
        <input type="range" min="0" max="100" value="${proj.val}" data-idx="${idx}">
      `;

      item.querySelector('input[type="range"]').addEventListener('input', (e) => {
        const newVal = e.target.value;
        projects[idx].val = newVal;
        document.getElementById(`val-${idx}`).textContent = `${newVal}%`;
        localStorage.setItem('customProjects', JSON.stringify(projects));
      });

      item.querySelector('.btn-delete').addEventListener('click', () => {
        projects.splice(idx, 1);
        localStorage.setItem('customProjects', JSON.stringify(projects));
        renderProjects();
      });

      container.appendChild(item);
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = prompt('Name des neuen Projekts:');
      if (name) {
        projects.push({ id: 'proj_' + Date.now(), name, val: 0 });
        localStorage.setItem('customProjects', JSON.stringify(projects));
        renderProjects();
      }
    });
  }

  renderProjects();
}