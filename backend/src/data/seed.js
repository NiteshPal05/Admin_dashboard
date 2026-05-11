import { Admin } from '../models/Admin.js';
import { Dashboard } from '../models/Dashboard.js';
import { User } from '../models/User.js';
import { dashboard, demoUsers, getAdminAccount } from './store.js';

export async function seedDatabase() {
  const account = getAdminAccount();
  const admin = await Admin.findOne().sort({ createdAt: 1 });
  if (admin) {
    admin.set(account);
    await admin.save();
  } else {
    await Admin.create(account);
  }

  await Dashboard.updateOne(
    { key: 'main' },
    { $set: { key: 'main', ...dashboard } },
    { upsert: true }
  );

  if (process.env.SEED_DEMO_DATA === 'true') {
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany(demoUsers.map(({ id: _id, ...user }) => user));
    }
  } else if (process.env.CLEAR_DEMO_DATA !== 'false') {
    await User.deleteMany({ email: { $in: demoUsers.map((user) => user.email) } });
  }
}
