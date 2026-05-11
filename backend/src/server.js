import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import { connectDb } from './config/db.js';
import { seedDatabase } from './data/seed.js';

const app = express();
const port = process.env.PORT || 5001;

function normalizeOrigin(origin) {
  return origin?.trim().replace(/\/+$/, '');
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'admin-dashboard-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

async function startServer() {
  await connectDb();
  await seedDatabase();

  const server = app.listen(port, () => {
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
