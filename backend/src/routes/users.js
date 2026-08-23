import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { createUser, deleteUser, listUsers, updateUser } from '../data/repository.js';

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.string().min(2),
  status: z.enum(['Active', 'Inactive'])
});

export function registerUserRoutes(app) {
  app.get('/api/users', requireAuth, async (req, res, next) => {
    try {
      const search = String(req.query.search || '');
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 5), 1);
      res.json(await listUsers({ search, page, limit }));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/users', requireAuth, async (req, res, next) => {
    const result = userSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({ message: 'Please provide valid user details' });
    }

    try {
      const user = await createUser({
        ...result.data,
        createdDate: new Date().toISOString().slice(0, 10)
      });
      res.status(201).json(typeof user.toJSON === 'function' ? user.toJSON() : user);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      next(err);
    }
  });

  app.put('/api/users/:id', requireAuth, async (req, res, next) => {
    const result = userSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({ message: 'Please provide valid user details' });
    }

    try {
      const updated = await updateUser(req.params.id, result.data);
      if (!updated) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(typeof updated.toJSON === 'function' ? updated.toJSON() : updated);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      next(err);
    }
  });

  app.delete('/api/users/:id', requireAuth, async (req, res, next) => {
    try {
      const deleted = await deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });
}
