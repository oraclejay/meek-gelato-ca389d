const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let idCounter = 1;

app.post('/api/bookings', (req, res) => {
  const body = req.body || {};
  // basic validation
  const required = ['customer', 'type', 'pickup', 'destination'];
  for (const r of required) {
    if (!body[r]) return res.status(400).json({ error: `${r} is required` });
  }
  // ensure pickup and destination have lat/lng and name
  if (!body.pickup.name || typeof body.pickup.lat !== 'number' || typeof body.pickup.lng !== 'number') {
    return res.status(400).json({ error: 'pickup must include name, lat, lng' });
  }
  if (!body.destination.name || typeof body.destination.lat !== 'number' || typeof body.destination.lng !== 'number') {
    return res.status(400).json({ error: 'destination must include name, lat, lng' });
  }

  const booking = {
    id: idCounter++,
    status: 'booked',
    createdAt: new Date().toISOString(),
    driverAssigned: 'Kumar',
    ...body,
  };

  console.log('Received booking:', booking);

  res.status(201).json(booking);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Mock API server listening on http://localhost:${port}`));
