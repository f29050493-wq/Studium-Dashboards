/* ==========================================================================
   HAUPT-SKRIPT (public/app.js) - VOLLSTÄNDIGE VERSION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCalendar();
  loadCourses();
  loadHabits();
  initCourseForm();
  initHabitForm();
  initInteractiveTracker();
  initBookshelf();
  initBingo();
  initProjects();
});

/* ==========================================================================
   1. NAVIGATION (TABS WECHSELN)
   ========================================================================== */
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.dashboard-view');

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');

      navBtns.forEach((b) => b.classList.remove('active'));
      views.forEach((v) => v.classList.remove('active'));

      btn.classList.add('active');
      const activeContainer = document.getElementById(`${targetView}-view`);
      if (activeContainer) {
        activeContainer.classList.add('active');
      }

      // Kalender neu berechnen, wenn der Stundenplan-Tab geöffnet wird
      if (targetView === 'stundenplan' && window.calendarObj) {
        setTimeout(() => {
          window.calendarObj.updateSize();
        }, 100);
      }
    });
  });
}

/* ==========================================================================
   2. STUNDENPLAN / KALENDER (FULLCALENDAR INTEGRATION)
   ========================================================================== */
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl || typeof FullCalendar === 'undefined') return;

  window.calendarObj = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,timeGridDay'
    },
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
    locale: 'de',
    firstDay: 1, // Montag
    events: async function (info, successCallback, failureCallback) {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const events = await res.json();
          successCallback(events);
        } else {
          throw new Error('API-Fehler');
        }
      } catch (err) {
        // Fallback auf LocalStorage
        const localCourses = JSON.parse(localStorage.getItem('userCourses') || '[]');
        const formattedEvents = localCourses.map((c) => ({
          id: c.id || c._id,
          title: c.title,
          daysOfWeek: c.day ? [parseInt(c.day)] : [1],
          startTime: c.startTime,
          endTime: c.endTime,
          backgroundColor: c.color || '#00897b',
          borderColor: c.color || '#00897b'
        }));
        successCallback(formattedEvents);
      }
    }
  });

  window.calendarObj.render();
}

/* ==========================================================================
   3. KURSE VERWALTEN (LADEN, ERSTELLEN, ROBUSTES LÖSCHEN)
   ========================================================================== */
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

  container.innerHTML = '';

  if (!courses || courses.length === 0) {
    container.innerHTML = '<p class="subtext">Keine Kurse eingetragen.</p>';
    return;
  }

  courses.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.setProperty('--card-c', c.color || '#00897b');

    card.innerHTML = `
      <div style="flex: 1;">
        <strong>${c.title}</strong>
        <span class="sub-info">${c.startTime || ''} - ${c.endTime || ''}</span>
      </div>
      <button class="btn-delete" title="Kurs löschen">🗑️</button>
    `;

    // Lösch-Funktionalität
    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const itemId = c._id || c.id;
        if (itemId) {
          try {
            await fetch(`/api/events/${itemId}`, { method: 'DELETE' });
          } catch (err) {
            console.warn('Backend DELETE nicht erreichbar:', err);
          }
        }

        // Lokal bereinigen
        let local = JSON.parse(localStorage.getItem('userCourses') || '[]');
        local = local.filter((course) => {
          const matchesId = (course._id && course._id === c._id) || (course.id && course.id === c.id);
          const matchesContent = course.title === c.title && course.startTime === c.startTime;
          return !matchesId && !matchesContent;
        });
        localStorage.setItem('userCourses', JSON.stringify(local));

        // UI & Kalender aktualisieren
        if (window.calendarObj) window.calendarObj.refetchEvents();
        loadCourses();
      });
    }

    container.appendChild(card);
  });
}

function initCourseForm() {
  const form = document.getElementById('appointment-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleEl = document.getElementById('course-title');
    const dayEl = document.getElementById('course-day');
    const startEl = document.getElementById('course-start');
    const endEl = document.getElementById('course-end');
    const colorEl = document.getElementById('course-color');

    if (!titleEl || !startEl || !endEl) return;

    const newCourse = {
      id: Date.now().toString(),
      title: titleEl.value,
      day: dayEl ? dayEl.value : "1",
      startTime: startEl.value,
      endTime: endEl.value,
      color: colorEl ? colorEl.value : '#00897b',
      daysOfWeek: [parseInt(dayEl ? dayEl.value : "1")]
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      const local = JSON.parse(localStorage.getItem('userCourses') || '[]');
      local.push(newCourse);
      localStorage.setItem('userCourses', JSON.stringify(local));
    }

    form.reset();
    if (window.calendarObj) window.calendarObj.refetchEvents();
    loadCourses();
  });
}

/* ==========================================================================
   4. HABITS VERWALTEN (LADEN, ERSTELLEN, ROBUSTES LÖSCHEN)
   ========================================================================== */
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

  container.innerHTML = '';

  if (!habits || habits.length === 0) {
    container.innerHTML = '<p class="subtext">Keine Habits eingetragen.</p>';
    return;
  }

  habits.forEach((h) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.setProperty('--card-c', '#80cbd3');

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
        <input type="checkbox" ${h.completed ? 'checked' : ''}>
        <span>${h.name}</span>
      </div>
      <button class="btn-delete" title="Habit löschen">🗑️</button>
    `;

    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const itemId = h._id || h.id;
        if (itemId) {
          try {
            await fetch(`/api/habits/${itemId}`, { method: 'DELETE' });
          } catch (err) {
            console.warn('Backend DELETE nicht erreichbar:', err);
          }
        }

        // Lokal bereinigen
        let local = JSON.parse(localStorage.getItem('userHabits') || '[]');
        local = local.filter((habit) => {
          const matchesId = (habit._id && habit._id === h._id) || (habit.id && habit.id === h.id);
          const matchesName = habit.name === h.name;
          return !matchesId && !matchesName;
        });
        localStorage.setItem('userHabits', JSON.stringify(local));

        loadHabits();
      });
    }

    container.appendChild(card);
  });
}

function initHabitForm() {
  const form = document.getElementById('habit-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('habit-input');
    if (!input || !input.value.trim()) return;

    const newHabit = {
      id: Date.now().toString(),
      name: input.value.trim(),
      completed: false
    };

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit)
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      const local = JSON.parse(localStorage.getItem('userHabits') || '[]');
      local.push(newHabit);
      localStorage.setItem('userHabits', JSON.stringify(local));
    }

    input.value = '';
    loadHabits();
  });
}

/* ==========================================================================
   5. SELF-CARE / PIXEL-GRID TRACKER
   ========================================================================== */
function initInteractiveTracker() {
  const container = document.getElementById('interactive-tracker-container');
  if (!container) return;

  if (container.children.length === 0) {
    let svgHTML = `<svg width="100%" height="60" viewBox="0 0 600 50">`;
    for (let i = 0; i < 30; i++) {
      const x = i * 19 + 5;
      svgHTML += `<rect x="${x}" y="10" width="15" height="30" rx="3" fill="#e0f2f1" stroke="#b2dfdb" class="interactive-cell" data-day="${i+1}"></rect>`;
    }
    svgHTML += `</svg>`;
    container.innerHTML = svgHTML;
  }

  const cells = container.querySelectorAll('.interactive-cell');
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      const currentColor = cell.getAttribute('fill');
      if (currentColor === '#e0f2f1') {
        cell.setAttribute('fill', '#00897b');
      } else if (currentColor === '#00897b') {
        cell.setAttribute('fill', '#e57373');
      } else {
        cell.setAttribute('fill', '#e0f2f1');
      }
    });
  });
}

/* ==========================================================================
   6. BÜCHERREGAL (BOOKSHELF)
   ========================================================================== */
function initBookshelf() {
  const bookshelf = document.querySelector('.bookshelf');
  if (!bookshelf) return;

  const spines = bookshelf.querySelectorAll('.book-spine');
  spines.forEach((spine) => {
    spine.addEventListener('click', () => {
      const currentBg = spine.style.backgroundColor;
      if (!currentBg || currentBg === 'rgb(255, 255, 255)' || currentBg === 'ffffff') {
        spine.style.backgroundColor = '#80cbd3';
        spine.style.color = '#004d40';
      } else {
        spine.style.backgroundColor = '#ffffff';
        spine.style.color = 'var(--text-main)';
      }
    });
  });
}

/* ==========================================================================
   7. BINGO
   ========================================================================== */
function initBingo() {
  const bingoCells = document.querySelectorAll('.bingo-cell');
  bingoCells.forEach((cell) => {
    cell.addEventListener('click', () => {
      cell.classList.toggle('active');
      if (cell.classList.contains('active')) {
        cell.style.backgroundColor = '#e0f2f1';
        cell.style.borderColor = '#00897b';
        cell.style.color = '#00897b';
      } else {
        cell.style.backgroundColor = '#ffffff';
        cell.style.borderColor = 'var(--border-color)';
        cell.style.color = 'var(--text-main)';
      }
    });
  });
}

/* ==========================================================================
   8. PROJEKTE
   ========================================================================== */
function initProjects() {
  const projectItems = document.querySelectorAll('.project-item');
  projectItems.forEach((item) => {
    // Zusätzliche Interaktivität falls erforderlich
  });
}