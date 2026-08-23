import { z } from 'zod';
import { signToken } from '../utils/token.js';
import { requireAuth } from '../middleware/auth.js';
import { findAdminByEmail, findAdminById } from '../data/repository.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

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

export function registerAuthRoutes(app) {
  app.post('/api/auth/login', async (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({ message: 'Enter a valid email and password' });
    }

    try {
      const { email, password } = result.data;
      const account = await findAdminByEmail(email);
      if (!account || account.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = sanitizeAdmin(account);
      res.json({ token: signToken(user), user });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/auth/me', requireAuth, async (req, res, next) => {
    try {
      const account = await findAdminById(req.user.id);
      if (!account) {
        return res.status(404).json({ message: 'Account not found' });
      }

      res.json({ user: sanitizeAdmin(account) });
    } catch (err) {
      next(err);
    }
  });
}
