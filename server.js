const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// In-Memory Speicher für Kurse
let events = [
  {
    title: 'Sensorik & Messtechnik (VL)',
    type: 'vorlesung',
    daysOfWeek: [1], // Montag
    startTime: '08:00',
    endTime: '09:30',
    color: '#e10600'
  },
  {
    title: 'Sensorik Labor',
    type: 'labor',
    daysOfWeek: [1], // Montag
    startTime: '10:00',
    endTime: '11:30',
    color: '#e10600'
  }
];

let habits = [
  { name: 'Formel 1 / WEC News lesen' },
  { name: 'Vorlesungsskript wiederholen' },
  { name: 'Arduino-Projekt testen' }
];

// Events abrufen
app.get('/api/events', (req, res) => {
  res.json(events);
});

// Neuer Kurs hinzufügen
app.post('/api/events', (req, res) => {
  const { title, type, dayOfWeek, startTime, endTime, color } = req.body;
  const newEvent = {
    title: `${title} (${type.toUpperCase()})`,
    type,
    daysOfWeek: [dayOfWeek],
    startTime,
    endTime,
    color
  };
  events.push(newEvent);
  res.status(201).json(newEvent);
});

// Habits abrufen
app.get('/api/habits', (req, res) => {
  res.json(habits);
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});