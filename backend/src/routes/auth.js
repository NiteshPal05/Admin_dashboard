import { Router } from 'express';
import { z } from 'zod';
import { signToken } from '../utils/token.js';
import { requireAuth } from '../middleware/auth.js';
import { Admin } from '../models/Admin.js';

const router = Router();
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post('/login', async (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ message: 'Enter a valid email and password' });
  }

  try {
    const { email, password } = result.data;
    const account = await Admin.findOne({ email: email.toLowerCase() });
    if (!account || account.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = account.toJSON();
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const account = await Admin.findById(req.user.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ user: account.toJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
