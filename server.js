const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let events = [];
let habits = [];

// --- EVENTS / KURSE API ---
app.get('/api/events', (req, res) => {
  res.json(events);
});

app.post('/api/events', (req, res) => {
  const newEvent = req.body;
  if (!newEvent.id && !newEvent._id) {
    newEvent.id = 'c_' + Date.now();
  }
  events.push(newEvent);
  res.status(201).json(newEvent);
});

app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  events = events.filter(e => (e._id || e.id) !== id);
  res.json({ success: true, message: 'Event gelöscht' });
});

// --- HABITS API ---
app.get('/api/habits', (req, res) => {
  res.json(habits);
});

app.post('/api/habits', (req, res) => {
  const newHabit = req.body;
  if (!newHabit.id && !newHabit._id) {
    newHabit.id = 'h_' + Date.now();
  }
  habits.push(newHabit);
  res.status(201).json(newHabit);
});

app.delete('/api/habits/:id', (req, res) => {
  const { id } = req.params;
  habits = habits.filter(h => (h._id || h.id) !== id);
  res.json({ success: true, message: 'Habit gelöscht' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});