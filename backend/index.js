const express = require('express');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

app.use(express.json());

const users = []; // In-memory store for users, replace with a database in a real application

// Helper function to generate tokens
function generateTokens(user) {
  const accessToken = jwt.sign({ name: user.username }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ name: user.username }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// Middleware to verify access token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// User registration
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = { username: req.body.username, password: hashedPassword };
    users.push(user);
    res.status(201).send('User registered');
  } catch {
    res.status(500).send();
  }
});

// User login
app.post('/login', async (req, res) => {
  const user = users.find(user => user.username === req.body.username);
  if (user == null) {
    return res.status(400).send('Cannot find user');
  }
  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      const tokens = generateTokens(user);
      res.json(tokens);
    } else {
      res.status(401).send('Not Allowed');
    }
  } catch {
    res.status(500).send();
  }
});

// Token refresh
app.post('/token', (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = jwt.sign({ name: user.name }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken: accessToken });
  });
});

// Protected route example
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

app.get('/', (req, res) => {
  res.send('Hello from Node.js backend!');
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
