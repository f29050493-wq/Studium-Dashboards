const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Zentrale Daten-Speicher
let courses = [
  { id: 'c1', name: 'Sensortechnik', color: '#1d4ed8', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400' },
  { id: 'c2', name: 'Regelungstechnik', color: '#15803d', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400' },
  { id: 'c3', name: 'Informatik & Coding', color: '#b91c1c', img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400' }
];

let events = [
  { id: 'e1', title: 'Sensortechnik - Vorlesung', start: '2026-10-12T08:00:00', end: '2026-10-12T09:30:00', type: 'vorlesung', color: '#1d4ed8' },
  { id: 'e2', title: 'Sensortechnik - Labor', start: '2026-10-14T10:00:00', end: '2026-10-14T12:00:00', type: 'labor', color: '#1d4ed8' },
  { id: 'e3', title: 'Regelungstechnik - Tutorium', start: '2026-10-15T14:00:00', end: '2026-10-15T15:30:00', type: 'tutorium', color: '#15803d' },
  { id: 'e4', title: 'Mathe - Lerngruppe', start: '2026-10-16T16:00:00', end: '2026-10-16T18:00:00', type: 'sonstiges', color: '#7e22ce' }
];

let habits = [
  { id: 'h1', name: 'Vorlesung nachbereiten' },
  { id: 'h2', name: '30 Min. Mathe rechnen' },
  { id: 'h3', name: 'Sport / Bewegung' }
];

// API Endpunkte
app.get('/api/courses', (req, res) => res.json(courses));
app.get('/api/events', (req, res) => res.json(events));
app.get('/api/habits', (req, res) => res.json(habits));

app.listen(PORT, () => {
  console.log(`Dashboard läuft unter http://localhost:${PORT}`);
});