let calendar;

// Rechnet jede Hex-Hauptfarbe automatisch in einen hellen Pastellton um
function getPastelColor(hexColor) {
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);

  // 85% Weiß-Anteil für sanfte Pastelltöne
  r = Math.round(r * 0.15 + 255 * 0.85);
  g = Math.round(g * 0.15 + 255 * 0.85);
  b = Math.round(b * 0.15 + 255 * 0.85);

  return `rgb(${r}, ${g}, ${b})`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadCourses();
  initCalendar();
  loadHabits();
});

// Tab Wechsel
function showTab(tabId, btn) {
  document.querySelectorAll('.tab-page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');

  if (tabId === 'calendar-tab' && calendar) {
    setTimeout(() => calendar.render(), 50);
  }
}

// Fächer laden & anzeigen
async function loadCourses() {
  const res = await fetch('/api/courses');
  const courses = await res.json();
  const container = document.getElementById('course-list');

  container.innerHTML = courses.map(course => {
    const pastel = getPastelColor(course.color);
    return `
      <div class="course-card" style="--course-color: ${course.color}; --pastel-color: ${pastel}">
        <img src="${course.img}" alt="${course.name}" class="course-img">
        <div class="course-body">
          <h3>${course.name}</h3>
          <div class="badge-group">
            <span class="badge badge-vl">Vorlesung</span>
            <span class="badge badge-pastel">Labor / Tutorium</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Kalender Initialisierung mit Pastell-Logik
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'de',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: '/api/events',
    eventDidMount: function(info) {
      const type = info.event.extendedProps.type;
      const baseColor = info.event.extendedProps.color || info.event.backgroundColor || '#0284c7';

      if (type === 'labor' || type === 'tutorium') {
        // Automatische Pastell-Farbe für Labore & Tutorien
        const pastel = getPastelColor(baseColor);
        info.el.style.backgroundColor = pastel;
        info.el.style.borderColor = baseColor;
        info.el.style.color = '#0f172a';
      } else {
        // Kräftige Hauptfarbe für Vorlesungen
        info.el.style.backgroundColor = baseColor;
        info.el.style.borderColor = baseColor;
        info.el.style.color = '#ffffff';
      }
    }
  });
}

// Habits laden
async function loadHabits() {
  const res = await fetch('/api/habits');
  const habits = await res.json();
  const container = document.getElementById('habit-list');

  container.innerHTML = habits.map(h => `
    <div class="habit-card">
      <span>${h.name}</span>
      <input type="checkbox">
    </div>
  `).join('');
}