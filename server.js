const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

(async () => {
  await db.read();
  db.data ||= { users: [], entries: [] };
  await db.write();
})();

function generateToken(user) {
  return jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password, email, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  await db.read();
  const existing = db.data.users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  db.data.users.push({ username, passwordHash, email: email || '', phone: phone || '' });
  await db.write();

  const token = generateToken({ username });
  res.json({ message: 'Registered', token });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken({ username });
  res.json({ message: 'Logged in', token });
});

app.post('/api/reset-password', async (req, res) => {
  const { username, credential, newPassword } = req.body;

  if (!username || !credential || !newPassword) {
    return res.status(400).json({ error: 'username, credential, and newPassword are required' });
  }

  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (credential !== user.email && credential !== user.phone) {
    return res.status(403).json({ error: 'Credential does not match' });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await db.write();

  res.json({ message: 'Password updated' });
});

app.get('/api/entries/:date', authenticate, async (req, res) => {
  const username = req.user.username;
  const date = req.params.date;

  await db.read();
  const record = db.data.entries.find(e => e.username === username && e.date === date);
  res.json(record || { date, time: '', title: '', content: '' });
});

app.post('/api/entries/:date', authenticate, async (req, res) => {
  const username = req.user.username;
  const date = req.params.date;
  const { time, title, content } = req.body;

  await db.read();
  const existing = db.data.entries.find(e => e.username === username && e.date === date);
  if (existing) {
    existing.time = time;
    existing.title = title;
    existing.content = content;
  } else {
    db.data.entries.push({ username, date, time, title, content });
  }
  await db.write();

  res.json({ message: 'Entry saved' });
});

app.get('/api/calendar', authenticate, async (req, res) => {
  const username = req.user.username;
  await db.read();
  const entries = db.data.entries.filter(e => e.username === username);
  const entryIndex = {};
  entries.forEach(e => { entryIndex[e.date] = true; });
  res.json({ entries: entryIndex });
});

app.get('/api/profile', authenticate, async (req, res) => {
  const username = req.user.username;
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ username: user.username, email: user.email, phone: user.phone });
});

app.post('/api/profile', authenticate, async (req, res) => {
  const username = req.user.username;
  const { email, phone } = req.body;
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'Not found' });

  user.email = email || user.email;
  user.phone = phone || user.phone;
  await db.write();

  res.json({ message: 'Profile updated' });
});

app.post('/api/change-password', authenticate, async (req, res) => {
  const username = req.user.username;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }

  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    return res.status(403).json({ error: 'Current password is incorrect' });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await db.write();

  res.json({ message: 'Password changed' });
});

app.listen(PORT, () => {
  console.log(`Diary backend running on http://localhost:${PORT}`);
});