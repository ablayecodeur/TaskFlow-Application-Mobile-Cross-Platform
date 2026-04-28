#!/usr/bin/env node
/**
 * Mock REST API server — remplace le vrai backend pendant le développement.
 * Lance avec : node scripts/mock-server.js
 * Endpoints : POST /v1/auth/login|register|refresh|logout, GET/POST/PATCH/DELETE /v1/tasks
 */

const http = require('http');
const crypto = require('crypto');

const PORT = 3001;
const SECRET = 'dev-jwt-secret-taskflow';

// ─── In-memory stores ──────────────────────────────────────────────────────

const users = new Map();
const tasks = new Map();
const tokens = new Map(); // refreshToken -> userId

// Seed one demo user
const demoId = 'user-demo-001';
users.set('demo@taskflow.dev', {
  id: demoId,
  email: 'demo@taskflow.dev',
  name: 'Ablaye Diallo',
  password: hashPassword('Demo1234!'),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Seed demo tasks
['Configurer CI/CD', 'Revoir la PR #42', 'Écrire les tests unitaires'].forEach((title, i) => {
  const id = `task-seed-${i}`;
  tasks.set(id, {
    id,
    userId: demoId,
    title,
    description: `Description de la tâche : ${title}`,
    priority: ['high', 'medium', 'urgent'][i],
    status: 'pending',
    dueDate: new Date(Date.now() + (i + 1) * 86400000).toISOString().split('T')[0],
    completedAt: null,
    tags: ['dev', 'taskflow'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function hashPassword(pw) {
  return crypto.createHmac('sha256', SECRET).update(pw).digest('hex');
}

function makeTokens(userId) {
  const accessToken = Buffer.from(JSON.stringify({
    sub: userId, exp: Date.now() + 15 * 60 * 1000, iat: Date.now(),
  })).toString('base64');
  const refreshToken = crypto.randomBytes(32).toString('hex');
  tokens.set(refreshToken, userId);
  return { accessToken, refreshToken, expiresIn: 900 };
}

function getUserFromToken(req) {
  const auth = req.headers.authorization ?? '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  });
  res.end(JSON.stringify({ data, message: 'ok' }));
}

function sendError(res, status, message, code = 'ERROR') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ message, code, status }));
}

// ─── Router ────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = req.url.replace('/v1', '');
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' });
    return res.end();
  }

  console.log(`${method} ${url}`);

  // ── Auth routes ────────────────────────────────────────────────────────

  if (url === '/auth/login' && method === 'POST') {
    const { email, password } = await readBody(req);
    const user = users.get(email);
    if (!user || user.password !== hashPassword(password))
      return sendError(res, 401, 'Email ou mot de passe incorrect', 'INVALID_CREDENTIALS');
    const tkns = makeTokens(user.id);
    return send(res, 200, {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt },
      tokens: tkns,
    });
  }

  if (url === '/auth/register' && method === 'POST') {
    const { name, email, password } = await readBody(req);
    if (users.has(email)) return sendError(res, 409, 'Email déjà utilisé', 'EMAIL_TAKEN');
    const id = `user-${Date.now()}`;
    const now = new Date().toISOString();
    const user = { id, email, name, password: hashPassword(password), createdAt: now, updatedAt: now };
    users.set(email, user);
    const tkns = makeTokens(id);
    return send(res, 201, {
      user: { id, email, name, createdAt: now, updatedAt: now },
      tokens: tkns,
    });
  }

  if (url === '/auth/refresh' && method === 'POST') {
    const { refreshToken } = await readBody(req);
    const userId = tokens.get(refreshToken);
    if (!userId) return sendError(res, 401, 'Token invalide', 'INVALID_TOKEN');
    tokens.delete(refreshToken);
    return send(res, 200, makeTokens(userId));
  }

  if (url === '/auth/logout' && method === 'POST') {
    const { refreshToken } = await readBody(req);
    tokens.delete(refreshToken);
    return send(res, 200, null);
  }

  if (url === '/auth/me' && method === 'GET') {
    const userId = getUserFromToken(req);
    if (!userId) return sendError(res, 401, 'Non authentifié', 'UNAUTHORIZED');
    const user = [...users.values()].find((u) => u.id === userId);
    if (!user) return sendError(res, 404, 'Utilisateur introuvable', 'NOT_FOUND');
    return send(res, 200, { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt });
  }

  // ── Task routes ────────────────────────────────────────────────────────

  if (url === '/tasks' && method === 'GET') {
    const userId = getUserFromToken(req);
    if (!userId) return sendError(res, 401, 'Non authentifié', 'UNAUTHORIZED');
    const userTasks = [...tasks.values()].filter((t) => t.userId === userId);
    return send(res, 200, userTasks);
  }

  if (url === '/tasks' && method === 'POST') {
    const userId = getUserFromToken(req);
    if (!userId) return sendError(res, 401, 'Non authentifié', 'UNAUTHORIZED');
    const body = await readBody(req);
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const task = {
      id, userId,
      title: body.title,
      description: body.description ?? null,
      priority: body.priority ?? 'medium',
      status: 'pending',
      dueDate: body.dueDate ?? null,
      completedAt: null,
      tags: body.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    tasks.set(id, task);
    return send(res, 201, task);
  }

  const taskMatch = url.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const taskId = taskMatch[1];
    const userId = getUserFromToken(req);
    if (!userId) return sendError(res, 401, 'Non authentifié', 'UNAUTHORIZED');
    const task = tasks.get(taskId);
    if (!task || task.userId !== userId)
      return sendError(res, 404, 'Tâche introuvable', 'NOT_FOUND');

    if (method === 'PATCH') {
      const body = await readBody(req);
      const updated = {
        ...task, ...body,
        updatedAt: new Date().toISOString(),
        completedAt: body.status === 'completed' ? new Date().toISOString() : task.completedAt,
      };
      tasks.set(taskId, updated);
      return send(res, 200, updated);
    }

    if (method === 'DELETE') {
      tasks.delete(taskId);
      return send(res, 200, null);
    }
  }

  sendError(res, 404, 'Route introuvable', 'NOT_FOUND');
});

server.listen(PORT, () => {
  console.log(`\n🚀 Mock API server démarré sur http://localhost:${PORT}/v1`);
  console.log(`\n📋 Compte demo :`);
  console.log(`   Email    : demo@taskflow.dev`);
  console.log(`   Password : Demo1234!\n`);
  console.log(`Routes disponibles :`);
  console.log(`  POST   /v1/auth/login`);
  console.log(`  POST   /v1/auth/register`);
  console.log(`  POST   /v1/auth/refresh`);
  console.log(`  GET    /v1/auth/me`);
  console.log(`  GET    /v1/tasks`);
  console.log(`  POST   /v1/tasks`);
  console.log(`  PATCH  /v1/tasks/:id`);
  console.log(`  DELETE /v1/tasks/:id\n`);
});
