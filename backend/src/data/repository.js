import { getDb, ObjectId, isLocalMode } from '../config/db.js';
import {
  bootstrapLocalStore,
  createLocalAdmin,
  createLocalUser,
  deleteLocalUser,
  getLocalAdminByEmail,
  getLocalAdminById,
  getLocalDashboard,
  getLocalUsers,
  setLocalDashboard,
  updateLocalUser
} from './local-store.js';
import { dashboard as dashboardSeed, demoUsers, getAdminAccount } from './store.js';

function adminCollection() {
  return getDb().collection('admins');
}

function dashboardCollection() {
  return getDb().collection('dashboards');
}

function userCollection() {
  return getDb().collection('users');
}

function toPlain(doc, { dropKey = false } = {}) {
  if (!doc) {
    return null;
  }

  const { _id, __v, key, ...rest } = doc;
  return {
    id: _id?.toString?.() || String(_id),
    ...(dropKey ? rest : { key, ...rest }),
    ...(dropKey ? {} : {}),
    ...(rest.password ? { password: rest.password } : {})
  };
}

function toUserPlain(doc) {
  if (!doc) {
    return null;
  }

  const { _id, __v, ...rest } = doc;
  return {
    id: _id?.toString?.() || String(_id),
    ...rest
  };
}

function toDashboardPlain(doc) {
  if (!doc) {
    return null;
  }

  const { _id, __v, key, ...rest } = doc;
  return {
    id: _id?.toString?.() || String(_id),
    key,
    ...rest
  };
}

function normalizeId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

export async function bootstrapData() {
  if (isLocalMode()) {
    await bootstrapLocalStore();
    return;
  }

  if (process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  const account = getAdminAccount();
  await adminCollection().updateOne(
    { email: account.email },
    { $set: account },
    { upsert: true }
  );

  await dashboardCollection().updateOne(
    { key: 'main' },
    { $set: { key: 'main', ...dashboardSeed } },
    { upsert: true }
  );

  const count = await userCollection().countDocuments();
  if (count === 0) {
  await userCollection().insertMany(demoUsers.map(({ id: _id, ...user }) => user));
  }
}

export async function createAdmin(data) {
  if (isLocalMode()) {
    return createLocalAdmin(data);
  }

  const result = await adminCollection().insertOne(data);
  return {
    id: result.insertedId.toString(),
    ...data
  };
}

export async function findAdminByEmail(email) {
  if (isLocalMode()) {
    return getLocalAdminByEmail(email);
  }

  return toPlain(await adminCollection().findOne({ email: String(email).toLowerCase() }), { dropKey: false });
}

export async function findAdminById(id) {
  if (isLocalMode()) {
    return getLocalAdminById(id);
  }

  return toPlain(await adminCollection().findOne({ _id: normalizeId(id) }), { dropKey: false });
}

export async function getDashboard() {
  if (isLocalMode()) {
    return getLocalDashboard();
  }

  return toDashboardPlain(await dashboardCollection().findOne({ key: 'main' }));
}

export async function updateDashboard(updater) {
  if (isLocalMode()) {
    const current = await getLocalDashboard();
    if (!current) {
      return null;
    }

    const next = toDashboardPlain(current);
    updater(next);
    await setLocalDashboard(next);
    return next;
  }

  const current = await dashboardCollection().findOne({ key: 'main' });
  if (!current) {
    return null;
  }

  const next = toDashboardPlain(current);
  updater(next);
  const { id, ...payload } = next;
  await dashboardCollection().updateOne(
    { key: 'main' },
    { $set: payload },
    { upsert: true }
  );
  return next;
}

export async function listUsers({ search = '', page = 1, limit = 5 } = {}) {
  if (isLocalMode()) {
    return getLocalUsers({ search, page, limit });
  }

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

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 5, 1);
  const [rows, total] = await Promise.all([
    userCollection().find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray(),
    userCollection().countDocuments(query)
  ]);

  return {
    users: rows.map(toUserPlain),
    total,
    page: safePage,
    limit: safeLimit
  };
}

export async function createUser(data) {
  if (isLocalMode()) {
    return createLocalUser(data);
  }

  const result = await userCollection().insertOne(data);
  return {
    id: result.insertedId.toString(),
    ...data
  };
}

export async function updateUser(id, data) {
  if (isLocalMode()) {
    return updateLocalUser(id, data);
  }

  const result = await userCollection().findOneAndUpdate(
    { _id: normalizeId(id) },
    { $set: data },
    { returnDocument: 'after' }
  );

  return toUserPlain(result.value);
}

export async function deleteUser(id) {
  if (isLocalMode()) {
    return deleteLocalUser(id);
  }

  const result = await userCollection().deleteOne({ _id: normalizeId(id) });
  return result.deletedCount > 0;
}
