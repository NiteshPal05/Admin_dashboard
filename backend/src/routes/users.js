import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.string().min(2),
  status: z.enum(['Active', 'Inactive'])
});

router.get('/', requireAuth, async (req, res, next) => {
  const search = String(req.query.search || '').toLowerCase();
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.max(Number(req.query.limit || 5), 1);
  const query = search
    ? {
        $or: [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { role: new RegExp(search, 'i') },
          { status: new RegExp(search, 'i') }
        ]
      }
    : {};

  try {
    const [rows, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      users: rows.map((user) => user.toJSON()),
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ message: 'Please provide valid user details' });
  }

  try {
    const user = await User.create({
      ...result.data,
      createdDate: new Date().toISOString().slice(0, 10)
    });
    res.status(201).json(user.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    next(err);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ message: 'Please provide valid user details' });
  }

  try {
    const updated = await User.findByIdAndUpdate(req.params.id, result.data, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updated.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
