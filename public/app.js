document.addEventListener('DOMContentLoaded', () => {

  // --- 1. UHRZEIT ANZEIGE ---
  function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE');
    const timeElem = document.getElementById('telemetry-time');
    if (timeElem) timeElem.textContent = timeStr;
  }
  setInterval(updateTime, 1000);
  updateTime();

  // --- 2. NAVIGATION ZWISCHEN SEITEN ---
  const navButtons = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.dashboard-view');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      
      navButtons.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add('active');

      // Falls Kalender gerendert werden muss nach Tab-Wechsel
      if (targetId === 'view-dashboard-studium' && window.calendar) {
        window.calendar.render();
      }
    });
  });

  // --- LOCAL STORAGE HELPERS ---
  const loadData = (key, fallback) => JSON.parse(localStorage.getItem(key)) || fallback;
  const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  // --- 3. FULLCALENDAR STUNDENPLAN ---
  const calendarEl = document.getElementById('calendar');
  let savedCourses = loadData('my_dashboard_courses', []);

  window.calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    locale: 'de',
    firstDay: 1, // Montag
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,timeGridDay'
    },
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
    hiddenDays: [0, 6], // Sa & So ausblenden (optional)
    events: savedCourses.flatMap(courseToEvents)
  });

  window.calendar.render();

  // Wandelt ein Kurs-Objekt in ein wiederkehrendes FullCalendar-Event um
  function courseToEvents(course) {
    return [{
      id: course.id,
      title: course.type ? `${course.title} (${course.type})` : course.title,
      daysOfWeek: [parseInt(course.day)],
      startTime: course.start,
      endTime: course.end,
      backgroundColor: course.color, // WICHTIG: Hier wird die individuelle Farbe gesetzt!
      borderColor: course.color,
      textColor: '#ffffff'
    }];
  }

  // Kurse verwalten & Liste aktualisieren
  const addCourseForm = document.getElementById('add-course-form');
  const coursesListEl = document.getElementById('courses-list');

  function renderCoursesList() {
    coursesListEl.innerHTML = '';
    savedCourses.forEach(course => {
      const item = document.createElement('div');
      item.className = 'item-card';
      item.style.setProperty('--card-c', course.color);
      item.innerHTML = `
        <div>
          <strong>${course.title}</strong> ${course.type ? `(${course.type})` : ''}<br>
          <small>${getDayName(course.day)} ${course.start} - ${course.end}</small>
        </div>
        <button class="btn-delete" onclick="deleteCourse('${course.id}')">✕</button>
      `;
      coursesListEl.appendChild(item);
    });
  }

  function getDayName(dayNum) {
    const days = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return days[dayNum] || '';
  }

  addCourseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newCourse = {
      id: 'course_' + Date.now(),
      title: document.getElementById('course-title').value,
      type: document.getElementById('course-type').value,
      day: document.getElementById('course-day').value,
      start: document.getElementById('course-start').value,
      end: document.getElementById('course-end').value,
      color: document.getElementById('course-color').value
    };

    savedCourses.push(newCourse);
    saveData('my_dashboard_courses', savedCourses);

    // Event zum Kalender hinzufügen
    courseToEvents(newCourse).forEach(evt => window.calendar.addEvent(evt));

    renderCoursesList();
    addCourseForm.reset();
  });

  window.deleteCourse = function(id) {
    savedCourses = savedCourses.filter(c => c.id !== id);
    saveData('my_dashboard_courses', savedCourses);

    // Event aus dem Kalender entfernen
    const calEvent = window.calendar.getEventById(id);
    if (calEvent) calEvent.remove();

    renderCoursesList();
  };

  renderCoursesList();

  // --- 4. HABITS WIDGET ---
  let habits = loadData('my_dashboard_habits', [
    { id: '1', name: 'Wasser trinken', done: false },
    { id: '2', name: '30 Min. Lesen', done: true }
  ]);

  const habitForm = document.getElementById('add-habit-form');
  const habitsContainer = document.getElementById('habits-container');

  function renderHabits() {
    habitsContainer.innerHTML = '';
    habits.forEach(h => {
      const el = document.createElement('div');
      el.className = 'item-card';
      el.innerHTML = `
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" ${h.done ? 'checked' : ''} onchange="toggleHabit('${h.id}')">
          <span style="${h.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${h.name}</span>
        </label>
        <button class="btn-delete" onclick="deleteHabit('${h.id}')">✕</button>
      `;
      habitsContainer.appendChild(el);
    });
  }

  habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('habit-name');
    habits.push({ id: 'h_' + Date.now(), name: nameInput.value, done: false });
    saveData('my_dashboard_habits', habits);
    renderHabits();
    nameInput.value = '';
  });

  window.toggleHabit = function(id) {
    habits = habits.map(h => h.id === id ? { ...h, done: !h.done } : h);
    saveData('my_dashboard_habits', habits);
    renderHabits();
  };

  window.deleteHabit = function(id) {
    habits = habits.filter(h => h.id !== id);
    saveData('my_dashboard_habits', habits);
    renderHabits();
  };

  renderHabits();

  // --- 5. TERMINE WIDGET ---
  let appointments = loadData('my_dashboard_appointments', []);

  const appointmentForm = document.getElementById('add-appointment-form');
  const appointmentsList = document.getElementById('appointments-list');

  function renderAppointments() {
    appointmentsList.innerHTML = '';
    appointments.forEach(app => {
      const el = document.createElement('div');
      el.className = 'item-card';
      el.innerHTML = `
        <div>
          <strong>${app.title}</strong><br>
          <small>${app.date}</small>
        </div>
        <button class="btn-delete" onclick="deleteAppointment('${app.id}')">✕</button>
      `;
      appointmentsList.appendChild(el);
    });
  }

  appointmentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('app-title').value;
    const date = document.getElementById('app-date').value;

    appointments.push({ id: 'app_' + Date.now(), title, date });
    saveData('my_dashboard_appointments', appointments);
    renderAppointments();

    appointmentForm.reset();
  });

  window.deleteAppointment = function(id) {
    appointments = appointments.filter(a => a.id !== id);
    saveData('my_dashboard_appointments', appointments);
    renderAppointments();
  };

  renderAppointments();

  // --- 6. PIXEL TRACKER ---
  const trackerTypeSelect = document.getElementById('tracker-type-select');
  const legendContainer = document.getElementById('tracker-legend-display');
  const trackerGridContainer = document.getElementById('interactive-tracker-container');
  const popupMenu = document.getElementById('tracker-popup-menu');

  const trackerConfigs = {
    mood: {
      labels: ['Sehr gut', 'Gut', 'Neutral', 'Schlecht', 'Stress'],
      colors: ['#4caf50', '#8bc34a', '#ffeb3b', '#ff9800', '#f44336']
    },
    weather: {
      labels: ['Sonnig', 'Bewölkt', 'Regen', 'Schnee', 'Windig'],
      colors: ['#fbc02d', '#90a4ae', '#0288d1', '#e0e0e0', '#78909c']
    },
    health: {
      labels: ['Fit', 'Müde', 'Leicht Unwohl', 'Krank', 'Erholung'],
      colors: ['#2ea44f', '#64b5f6', '#ffb74d', '#e53935', '#ba68c8']
    },
    focus: {
      labels: ['Hoher Fokus', 'Normal', 'Ablenkung', 'Keine Lust', 'Pause'],
      colors: ['#00897b', '#4dd0e1', '#ffb74d', '#e53935', '#9e9e9e']
    },
    sleep: {
      labels: ['8h+ Ruhig', '6-8h Gut', '<6h Unruhig', 'Wenig Schlaf', 'Sehr Schlecht'],
      colors: ['#3f51b5', '#5c6bc0', '#9fa8da', '#ff9800', '#f44336']
    },
    movement: {
      labels: ['Workout', 'Spaziergang', 'Dehnen/Yoga', 'Ruhetag', 'Intensiv Sport'],
      colors: ['#4caf50', '#8bc34a', '#81c784', '#cfd8dc', '#2e7d32']
    },
    connection: {
      labels: ['Freunde/Familie', 'Deep Talk', 'Allein-Zeit', 'Party/Event', 'Wenig Kontakt'],
      colors: ['#e91e63', '#f06292', '#ba68c8', '#ff4081', '#9e9e9e']
    },
    nourishment: {
      labels: ['Gesund & Viel Wasser', 'Gut', 'Fast Food', 'Wenig Trinken', 'Ausgewogen'],
      colors: ['#26a69a', '#80cbc4', '#ff7043', '#ffa726', '#aed581']
    }
  };

  let trackerData = loadData('my_pixel_tracker_data', {});

  function renderTracker() {
    const type = trackerTypeSelect.value;
    const config = trackerConfigs[type];

    // Legende bauen
    legendContainer.innerHTML = '';
    config.labels.forEach((label, idx) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.style.setProperty('--c', config.colors[idx]);
      item.textContent = label;
      legendContainer.appendChild(item);
    });

    // Raster bauen (30 Tage x 12 Monate als Beispiel)
    trackerGridContainer.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(31, 1fr)';
    grid.style.gap = '4px';

    for (let day = 1; day <= 31; day++) {
      const key = `${type}_${day}`;
      const pixel = document.createElement('div');
      pixel.className = 'tracker-pixel';
      pixel.style.aspectRatio = '1';
      pixel.style.borderRadius = '4px';
      pixel.style.cursor = 'pointer';
      pixel.style.border = '1px solid var(--card-border)';

      const val = trackerData[key];
      pixel.style.backgroundColor = val !== undefined ? config.colors[val] : '#ffffff';

      pixel.addEventListener('click', (e) => {
        openPopupMenu(e, key, config);
      });

      grid.appendChild(pixel);
    }

    trackerGridContainer.appendChild(grid);
  }

  function openPopupMenu(e, key, config) {
    popupMenu.innerHTML = '';
    popupMenu.classList.remove('hidden');
    popupMenu.style.left = `${e.clientX}px`;
    popupMenu.style.top = `${e.clientY}px`;

    config.labels.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tracker-menu-btn';
      btn.style.setProperty('--btn-color', config.colors[idx]);
      btn.textContent = label;
      btn.addEventListener('click', () => {
        trackerData[key] = idx;
        saveData('my_pixel_tracker_data', trackerData);
        popupMenu.classList.add('hidden');
        renderTracker();
      });
      popupMenu.appendChild(btn);
    });
  }

  document.addEventListener('click', (e) => {
    if (!popupMenu.contains(e.target) && !e.target.classList.contains('tracker-pixel')) {
      popupMenu.classList.add('hidden');
    }
  });

  trackerTypeSelect.addEventListener('change', renderTracker);
  renderTracker();

  // --- 7. BÜCHERREGAL ---
  let books = loadData('my_bookshelf_data', [
    { id: '1', title: 'Buch A', color: '#ff7675' },
    { id: '2', title: 'Buch B', color: '#74b9ff' },
    { id: '3', title: 'Buch C', color: '#55efc4' }
  ]);

  const bookshelfContainer = document.getElementById('bookshelf-container');

  function renderBookshelf() {
    bookshelfContainer.innerHTML = '';
    books.forEach(book => {
      const spine = document.createElement('div');
      spine.className = 'book-spine';
      spine.style.backgroundColor = book.color;
      spine.textContent = book.title;
      spine.title = book.title;
      spine.addEventListener('click', () => {
        const newTitle = prompt('Buchtitel ändern:', book.title);
        if (newTitle !== null) {
          book.title = newTitle;
          saveData('my_bookshelf_data', books);
          renderBookshelf();
        }
      });
      bookshelfContainer.appendChild(spine);
    });
  }
  renderBookshelf();

  // --- 8. SELF-CARE BINGO ---
  let bingoState = loadData('my_bingo_data', Array(25).fill(false));
  const bingoTasks = [
    'Spaziergang', 'Meditation', 'Wasser getrunken', 'Sonne genossen', 'Lesen',
    'Kein Social Media', 'Gesund gekocht', 'Früh schlafen', 'Dehnen', 'Musik hören',
    'Freund anrufen', 'Zimmer aufgeräumt', 'FREE SPACE', 'Tee trinken', 'Journaling',
    'Hobby Zeit', 'Skincare', 'Me-Time', 'Lachen', 'Spaziergang 2',
    'Ziele aufgeschrieben', 'Kein Koffein', 'Frische Luft', 'Dankbar sein', 'Entspannen'
  ];

  const bingoGrid = document.getElementById('bingo-grid');

  function renderBingo() {
    bingoGrid.innerHTML = '';
    bingoTasks.forEach((task, idx) => {
      const cell = document.createElement('div');
      cell.className = 'bingo-cell';
      if (bingoState[idx]) cell.style.backgroundColor = '#a5d6a7';
      cell.textContent = task;
      cell.addEventListener('click', () => {
        bingoState[idx] = !bingoState[idx];
        saveData('my_bingo_data', bingoState);
        renderBingo();
      });
      bingoGrid.appendChild(cell);
    });
  }
  renderBingo();

  // --- 9. PROJEKTE ---
  let projects = loadData('my_projects_data', [
    { id: 'p1', name: 'Bachelorarbeit', progress: 40 },
    { id: 'p2', name: 'Website Redesign', progress: 75 }
  ]);

  const projectList = document.getElementById('project-list');
  const addProjectBtn = document.getElementById('add-project-btn');

  function renderProjects() {
    projectList.innerHTML = '';
    projects.forEach(p => {
      const el = document.createElement('div');
      el.className = 'project-item';
      el.innerHTML = `
        <div class="project-header">
          <span>${p.name}</span>
          <span>${p.progress}%</span>
        </div>
        <input type="range" min="0" max="100" value="${p.progress}" onchange="updateProjectProgress('${p.id}', this.value)">
      `;
      projectList.appendChild(el);
    });
  }

  window.updateProjectProgress = function(id, val) {
    projects = projects.map(p => p.id === id ? { ...p, progress: parseInt(val) } : p);
    saveData('my_projects_data', projects);
    renderProjects();
  };

  addProjectBtn.addEventListener('click', () => {
    const name = prompt('Projektname:');
    if (name) {
      projects.push({ id: 'p_' + Date.now(), name, progress: 0 });
      saveData('my_projects_data', projects);
      renderProjects();
    }
  });

  renderProjects();

});