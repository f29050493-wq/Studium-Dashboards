document.addEventListener('DOMContentLoaded', () => {

  // --- LOCAL STORAGE HELPERS ---
  const loadData = (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error('Fehler beim Laden von ' + key, e);
      return fallback;
    }
  };
  const saveData = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Fehler beim Speichern von ' + key, e);
    }
  };

  // --- 1. UHRZEIT ANZEIGE ---
  function updateTime() {
    const timeElem = document.getElementById('telemetry-time');
    if (timeElem) {
      timeElem.textContent = new Date().toLocaleTimeString('de-DE');
    }
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

      if (targetId === 'view-dashboard-studium' && window.calendar) {
        setTimeout(() => window.calendar.render(), 50);
      }
    });
  });

  // --- 3. FULLCALENDAR INTEGRATION ---
  const calendarEl = document.getElementById('calendar');
  let savedCourses = loadData('my_dashboard_courses', []);
  let savedAppointments = loadData('my_dashboard_appointments', []);

  function courseToEvent(course) {
    return {
      id: course.id,
      title: course.type ? `${course.title} (${course.type})` : course.title,
      daysOfWeek: [parseInt(course.day)],
      startTime: course.start,
      endTime: course.end,
      backgroundColor: course.color || '#00897b',
      borderColor: course.color || '#00897b',
      textColor: '#ffffff'
    };
  }

  function appointmentToEvent(app) {
    const evt = {
      id: app.id,
      title: `📌 ${app.title}`,
      backgroundColor: app.color || '#3f51b5',
      borderColor: app.color || '#3f51b5',
      textColor: '#ffffff'
    };

    if (app.start && app.end) {
      evt.start = `${app.date}T${app.start}:00`;
      evt.end = `${app.date}T${app.end}:00`;
    } else {
      evt.start = app.date;
      evt.allDay = true;
    }

    return evt;
  }

  function getAllEvents() {
    return [
      ...savedCourses.map(courseToEvent),
      ...savedAppointments.map(appointmentToEvent)
    ];
  }

  if (calendarEl) {
    window.calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      locale: 'de',
      firstDay: 1,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay'
      },
      slotMinTime: '07:00:00',
      slotMaxTime: '21:00:00',
      allDaySlot: true,
      hiddenDays: [0, 6],
      events: getAllEvents()
    });
    window.calendar.render();
  }

  // --- KURSE VERWALTEN ---
  const addCourseForm = document.getElementById('add-course-form');
  const coursesListEl = document.getElementById('courses-list');

  function renderCoursesList() {
    if (!coursesListEl) return;
    coursesListEl.innerHTML = '';
    savedCourses.forEach(course => {
      const item = document.createElement('div');
      item.className = 'item-card';
      item.style.setProperty('--card-c', course.color || '#00897b');
      item.innerHTML = `
        <div>
          <strong>${course.title}</strong> ${course.type ? `(${course.type})` : ''}<br>
          <small>${getDayName(course.day)} ${course.start} - ${course.end}</small>
        </div>
        <button class="btn-delete" data-id="${course.id}">✕</button>
      `;
      item.querySelector('.btn-delete').addEventListener('click', () => deleteCourse(course.id));
      coursesListEl.appendChild(item);
    });
  }

  function getDayName(dayNum) {
    const days = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return days[dayNum] || '';
  }

  if (addCourseForm) {
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

      if (window.calendar) window.calendar.addEvent(courseToEvent(newCourse));
      renderCoursesList();
      addCourseForm.reset();
    });
  }

  function deleteCourse(id) {
    savedCourses = savedCourses.filter(c => c.id !== id);
    saveData('my_dashboard_courses', savedCourses);

    if (window.calendar) {
      const calEvent = window.calendar.getEventById(id);
      if (calEvent) calEvent.remove();
    }
    renderCoursesList();
  }

  renderCoursesList();

  // --- TERMINE VERWALTEN ---
  const appointmentForm = document.getElementById('add-appointment-form');
  const appointmentsList = document.getElementById('appointments-list');

  function renderAppointments() {
    if (!appointmentsList) return;
    appointmentsList.innerHTML = '';
    savedAppointments.forEach(app => {
      const el = document.createElement('div');
      el.className = 'item-card';
      el.style.setProperty('--card-c', app.color || '#3f51b5');
      
      const timeInfo = (app.start && app.end) ? ` ${app.start} - ${app.end}` : '';
      
      el.innerHTML = `
        <div>
          <strong>📌 ${app.title}</strong><br>
          <small>${app.date}${timeInfo}</small>
        </div>
        <button class="btn-delete" data-id="${app.id}">✕</button>
      `;
      el.querySelector('.btn-delete').addEventListener('click', () => deleteAppointment(app.id));
      appointmentsList.appendChild(el);
    });
  }

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newAppointment = {
        id: 'app_' + Date.now(),
        title: document.getElementById('app-title').value,
        date: document.getElementById('app-date').value,
        start: document.getElementById('app-start').value,
        end: document.getElementById('app-end').value,
        color: document.getElementById('app-color').value
      };

      savedAppointments.push(newAppointment);
      saveData('my_dashboard_appointments', savedAppointments);

      if (window.calendar) window.calendar.addEvent(appointmentToEvent(newAppointment));
      renderAppointments();
      appointmentForm.reset();
    });
  }

  function deleteAppointment(id) {
    savedAppointments = savedAppointments.filter(a => a.id !== id);
    saveData('my_dashboard_appointments', savedAppointments);

    if (window.calendar) {
      const calEvent = window.calendar.getEventById(id);
      if (calEvent) calEvent.remove();
    }
    renderAppointments();
  }

  renderAppointments();

  // --- HABITS WIDGET ---
  let habits = loadData('my_dashboard_habits', [
    { id: '1', name: 'Wasser trinken', done: false },
    { id: '2', name: '30 Min. Lesen', done: true }
  ]);

  const habitForm = document.getElementById('add-habit-form');
  const habitsContainer = document.getElementById('habits-container');

  function renderHabits() {
    if (!habitsContainer) return;
    habitsContainer.innerHTML = '';
    habits.forEach(h => {
      const el = document.createElement('div');
      el.className = 'item-card';
      el.innerHTML = `
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; width: 100%;">
          <input type="checkbox" ${h.done ? 'checked' : ''}>
          <span style="${h.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${h.name}</span>
        </label>
        <button class="btn-delete">✕</button>
      `;
      
      el.querySelector('input[type="checkbox"]').addEventListener('change', () => {
        h.done = !h.done;
        saveData('my_dashboard_habits', habits);
        renderHabits();
      });

      el.querySelector('.btn-delete').addEventListener('click', () => {
        habits = habits.filter(item => item.id !== h.id);
        saveData('my_dashboard_habits', habits);
        renderHabits();
      });

      habitsContainer.appendChild(el);
    });
  }

  if (habitForm) {
    habitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('habit-name');
      if (nameInput && nameInput.value.trim() !== '') {
        habits.push({ id: 'h_' + Date.now(), name: nameInput.value.trim(), done: false });
        saveData('my_dashboard_habits', habits);
        renderHabits();
        nameInput.value = '';
      }
    });
  }

  renderHabits();

  // --- PIXEL TRACKER MIT MONAT UND TAGEN ---
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

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let trackerData = loadData('my_pixel_tracker_data', {});

  function renderTracker() {
    if (!trackerTypeSelect || !trackerGridContainer || !legendContainer) return;

    const type = trackerTypeSelect.value || 'mood';
    const config = trackerConfigs[type] || trackerConfigs.mood;

    // Legende
    legendContainer.innerHTML = '';
    config.labels.forEach((label, idx) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.style.setProperty('--c', config.colors[idx]);
      item.textContent = label;
      legendContainer.appendChild(item);
    });

    trackerGridContainer.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tracker-wrapper';

    // Header mit Navigations-Buttons
    const header = document.createElement('div');
    header.className = 'tracker-header-nav';
    header.innerHTML = `
      <button class="tracker-nav-btn" id="prev-month-btn">‹</button>
      <span class="tracker-month-title">${monthNames[currentMonth]} ${currentYear}</span>
      <button class="tracker-nav-btn" id="next-month-btn">›</button>
    `;
    wrapper.appendChild(header);

    // Grid Container
    const grid = document.createElement('div');
    grid.className = 'pixel-grid';

    // Wochentage (Mo - So)
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    weekDays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'pixel-weekday';
      dayHeader.textContent = day;
      grid.appendChild(dayHeader);
    });

    // Berechnung Tage & Offset
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6;

    // Leere Felder vor dem 1. des Monats
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'pixel-empty';
      grid.appendChild(emptyCell);
    }

    // Tage des Monats
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${type}_${currentYear}_${currentMonth + 1}_${day}`;
      const pixel = document.createElement('div');
      pixel.className = 'tracker-pixel';

      const val = trackerData[key];
      if (val !== undefined) {
        pixel.style.backgroundColor = config.colors[val];
        pixel.classList.add('filled');
      }

      const label = document.createElement('span');
      label.className = 'pixel-day-number';
      label.textContent = day;
      pixel.appendChild(label);

      pixel.addEventListener('click', (e) => openPopupMenu(e, key, config));
      grid.appendChild(pixel);
    }

    wrapper.appendChild(grid);
    trackerGridContainer.appendChild(wrapper);

    // Monat wechseln Listener
    document.getElementById('prev-month-btn').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderTracker();
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderTracker();
    });
  }

  function openPopupMenu(e, key, config) {
    if (!popupMenu) return;
    popupMenu.innerHTML = '';
    popupMenu.classList.remove('hidden');

    const rect = trackerGridContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    popupMenu.style.left = `${Math.min(x, rect.width - 150)}px`;
    popupMenu.style.top = `${y + 10}px`;

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
    if (popupMenu && !popupMenu.contains(e.target) && !e.target.classList.contains('tracker-pixel')) {
      popupMenu.classList.add('hidden');
    }
  });

  if (trackerTypeSelect) {
    trackerTypeSelect.addEventListener('change', renderTracker);
    renderTracker();
  }

  // --- BÜCHERREGAL ---
  let books = loadData('my_bookshelf_data', [
    { id: '1', title: 'Buch A', color: '#ff7675' },
    { id: '2', title: 'Buch B', color: '#74b9ff' },
    { id: '3', title: 'Buch C', color: '#55efc4' }
  ]);

  const bookshelfContainer = document.getElementById('bookshelf-container');

  function renderBookshelf() {
    if (!bookshelfContainer) return;
    bookshelfContainer.innerHTML = '';
    books.forEach(book => {
      const spine = document.createElement('div');
      spine.className = 'book-spine';
      spine.style.backgroundColor = book.color;
      spine.textContent = book.title;
      spine.title = book.title;
      spine.addEventListener('click', () => {
        const newTitle = prompt('Buchtitel ändern:', book.title);
        if (newTitle !== null && newTitle.trim() !== '') {
          book.title = newTitle.trim();
          saveData('my_bookshelf_data', books);
          renderBookshelf();
        }
      });
      bookshelfContainer.appendChild(spine);
    });
  }
  renderBookshelf();

  // --- SELF-CARE BINGO ---
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
    if (!bingoGrid) return;
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

  // --- PROJEKTE ---
  let projects = loadData('my_projects_data', [
    { id: 'p1', name: 'Bachelorarbeit', progress: 0 },
    { id: 'p2', name: 'Website Redesign', progress: 75 }
  ]);

  const projectList = document.getElementById('project-list');
  const addProjectBtn = document.getElementById('add-project-btn');

  function renderProjects() {
    if (!projectList) return;
    projectList.innerHTML = '';
    projects.forEach(p => {
      const el = document.createElement('div');
      el.className = 'project-item';
      el.innerHTML = `
        <div class="project-header">
          <span>${p.name}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="progress-val">${p.progress}%</span>
            <button class="btn-delete-proj" style="background:none; border:none; cursor:pointer; color:var(--text-secondary); font-size: 0.85rem;">✕</button>
          </div>
        </div>
        <input type="range" min="0" max="100" value="${p.progress}">
      `;
      
      const rangeInput = el.querySelector('input[type="range"]');
      const progressVal = el.querySelector('.progress-val');
      const deleteBtn = el.querySelector('.btn-delete-proj');

      rangeInput.addEventListener('input', (e) => {
        p.progress = parseInt(e.target.value);
        progressVal.textContent = `${p.progress}%`;
        saveData('my_projects_data', projects);
      });

      deleteBtn.addEventListener('click', () => {
        projects = projects.filter(item => item.id !== p.id);
        saveData('my_projects_data', projects);
        renderProjects();
      });

      projectList.appendChild(el);
    });
  }

  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', () => {
      const name = prompt('Projektname:');
      if (name && name.trim() !== '') {
        projects.push({ id: 'p_' + Date.now(), name: name.trim(), progress: 0 });
        saveData('my_projects_data', projects);
        renderProjects();
      }
    });
  }

  renderProjects();

});