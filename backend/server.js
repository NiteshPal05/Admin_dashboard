import 'dotenv/config';
import http from 'http';
import { z } from 'zod';
import { signToken, verifyToken } from './src/utils/token.js';
import { connectDb } from './src/config/db.js';
import { seedDatabase } from './src/data/seed.js';
import { createAdmin, findAdminByEmail, findAdminById, getDashboard, updateDashboard, listUsers, createUser, updateUser, deleteUser } from './src/data/repository.js';

const port = Number(process.env.PORT || 5001);
const host = process.env.HOST || '0.0.0.0';
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.string().min(2),
  status: z.enum(['Active', 'Inactive'])
});

function normalizeOrigin(origin) {
  return origin?.trim().replace(/\/+$/, '');
}

function applyCors(req, res) {
  const origin = normalizeOrigin(req.headers.origin);
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function getAuthToken(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function sanitizeAdmin(account) {
  if (!account) {
    return null;
  }

  if (typeof account.toJSON === 'function') {
    const user = account.toJSON();
    delete user.password;
    return user;
  }

  const { password: _password, ...safeUser } = account;
  return safeUser;
}

function requireAuth(req) {
  const token = getAuthToken(req);
  if (!token) {
    return { ok: false, statusCode: 401, payload: { message: 'Missing authorization token' } };
  }

  try {
    const user = verifyToken(token);
    return { ok: true, user };
  } catch {
    return { ok: false, statusCode: 401, payload: { message: 'Invalid or expired token' } };
  }
}

function updateSummary(summary = []) {
  return summary.map((item) => {
    const nextValue = item.label === 'New sign ups' ? '1' : item.label === 'Subscriptions' ? '1' : item.label === 'Monthly users' ? '12' : '120';
    return { ...item, value: nextValue, change: '100%', tone: 'positive' };
  });
}

function updateSeries(values = [], nextValue = 1) {
  if (values.length === 0) {
    return [nextValue];
  }

  return [...values.slice(1), nextValue];
}

function getTrailingMonthLabels(count = 12) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return formatter.format(date);
  });
}

async function handleRequest(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `localhost:${port}`}`);
  const { pathname, searchParams } = url;

  try {
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/api/health') {
      if (req.method === 'HEAD') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end();
      } else {
        sendJson(res, 200, { status: 'ok', service: 'admin-dashboard-api' });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await readBody(req);
      const result = loginSchema.safeParse(body);
      if (!result.success) {
        sendJson(res, 422, { message: 'Enter a valid email and password' });
        return;
      }

      const { email, password } = result.data;
      const account = await findAdminByEmail(email);
      if (!account || account.password !== password) {
        sendJson(res, 401, { message: 'Invalid credentials' });
        return;
      }

      const user = sanitizeAdmin(account);
      sendJson(res, 200, {
        token: signToken(user),
        user
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await readBody(req);
      const result = registerSchema.safeParse(body);
      if (!result.success) {
        sendJson(res, 422, { message: 'Enter a valid name, email, and password' });
        return;
      }

      const { name, email, password } = result.data;
      const existing = await findAdminByEmail(email);
      if (existing) {
        sendJson(res, 409, { message: 'An admin with this email already exists' });
        return;
      }

      const admin = await createAdmin({
        name,
        email,
        password,
        role: 'Admin'
      });

      const user = sanitizeAdmin(admin);
      sendJson(res, 201, {
        token: signToken(user),
        user
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const auth = requireAuth(req);
      if (!auth.ok) {
        sendJson(res, auth.statusCode, auth.payload);
        return;
      }

      const account = await findAdminById(auth.user.id);
      if (!account) {
        sendJson(res, 404, { message: 'Account not found' });
        return;
      }

      sendJson(res, 200, { user: sanitizeAdmin(account) });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/dashboard') {
      const auth = requireAuth(req);
      if (!auth.ok) {
        sendJson(res, auth.statusCode, auth.payload);
        return;
      }

      const dashboard = await getDashboard();
      if (!dashboard) {
        sendJson(res, 404, { message: 'Dashboard data not found' });
        return;
      }

      sendJson(res, 200, typeof dashboard.toJSON === 'function' ? dashboard.toJSON() : dashboard);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/dashboard/reports') {
      const auth = requireAuth(req);
      if (!auth.ok) {
        sendJson(res, auth.statusCode, auth.payload);
        return;
      }

      const dashboard = await getDashboard();
      if (!dashboard) {
        sendJson(res, 404, { message: 'Dashboard data not found' });
        return;
      }

      const orders = Array.isArray(dashboard.orders) ? dashboard.orders : [];
      const nextNumber = 1000 + orders.length + 1;
      const amount = 100 + orders.length * 25;
      const report = {
        id: `#${nextNumber}`,
        date: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        status: 'Pending',
        total: `$${amount.toFixed(2)}`
      };

      dashboard.orders = [report, ...orders];
      dashboard.summary = updateSummary(dashboard.summary);
      dashboard.revenue = {
        ...dashboard.revenue,
        total: `$${amount.toFixed(2)}`,
        growth: '100%',
        labels: getTrailingMonthLabels(dashboard.revenue?.revenue?.length || 12),
        revenue: updateSeries(dashboard.revenue?.revenue, amount),
        expenses: updateSeries(dashboard.revenue?.expenses, Math.round(amount * 0.32))
      };
      dashboard.profit = {
        ...dashboard.profit,
        total: `$${Math.round(amount * 0.68).toFixed(2)}`,
        growth: '100%',
        bars: updateSeries(dashboard.profit?.bars, 68)
      };
      dashboard.sessions = {
        ...dashboard.sessions,
        total: '12',
        growth: '100%',
        points: updateSeries(dashboard.sessions?.points, 12)
      };
      dashboard.deviceUsers = [
        { label: 'Desktop users', value: 7, color: '#cb3cff' },
        { label: 'Phone app users', value: 3, color: '#9a91fb' },
        { label: 'Laptop users', value: 2, color: '#00c2ff' }
      ];
      dashboard.countries = [
        { label: 'India', value: 100, color: '#cb3cff' }
      ];

      const updated = await updateDashboard((doc) => {
        doc.orders = dashboard.orders;
        doc.summary = dashboard.summary;
        doc.revenue = dashboard.revenue;
        doc.profit = dashboard.profit;
        doc.sessions = dashboard.sessions;
        doc.deviceUsers = dashboard.deviceUsers;
        doc.countries = dashboard.countries;
      });

      sendJson(res, 201, typeof updated?.toJSON === 'function' ? updated.toJSON() : updated);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/users') {
      const auth = requireAuth(req);
      if (!auth.ok) {
        sendJson(res, auth.statusCode, auth.payload);
        return;
      }

      const search = String(searchParams.get('search') || '');
      const page = Math.max(Number(searchParams.get('page') || 1), 1);
      const limit = Math.max(Number(searchParams.get('limit') || 5), 1);
      sendJson(res, 200, await listUsers({ search, page, limit }));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/users') {
      const auth = requireAuth(req);
      if (!auth.ok) {
        sendJson(res, auth.statusCode, auth.payload);
        return;
      }

      const result = userSchema.safeParse(await readBody(req));
      if (!result.success) {
        sendJson(res, 422, { message: 'Please provide valid user details' });
        return;
      }

      const user = await createUser({
        ...result.data,
        createdDate: new Date().toISOString().slice(0, 10)
      });
      sendJson(res, 201, typeof user.toJSON === 'function' ? user.toJSON() : user);
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/users/')) {
      const auth = requireAuth(req);
      if (!auth.ok) {
        sendJson(res, auth.statusCode, auth.payload);
        return;
      }

      const id = pathname.split('/').pop();
      const result = userSchema.safeParse(await readBody(req));
      if (!result.success) {
        sendJson(res, 422, { message: 'Please provide valid user details' });
        return;
      }

      const updated = await updateUser(id, result.data);
      if (!updated) {
        sendJson(res, 404, { message: 'User not found' });
        return;
      }

      sendJson(res, 200, typeof updated.toJSON === 'function' ? updated.toJSON() : updated);
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/users/')) {
      const auth = requireAuth(req);
      if (!auth.ok) {
        sendJson(res, auth.statusCode, auth.payload);
        return;
      }

      const id = pathname.split('/').pop();
      const deleted = await deleteUser(id);
      if (!deleted) {
        sendJson(res, 404, { message: 'User not found' });
        return;
      }

      res.statusCode = 204;
      res.end();
      return;
    }

    sendJson(res, 404, { message: `Route ${req.method} ${pathname} not found` });
  } catch (err) {
    sendJson(res, err.status || 500, { message: err.message || 'Internal server error' });
  }
}

async function startServer() {
  await connectDb();
  await seedDatabase();

  const server = http.createServer(handleRequest);
  server.listen(port, host, () => {
    console.log(`API running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Change PORT in backend/.env or stop the process using that port.`);
      process.exit(1);
    }

    throw err;
  });
}

startServer().catch((err) => {
  console.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
