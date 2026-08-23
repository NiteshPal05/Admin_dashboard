import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dashboard, demoUsers, getAdminAccount } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', '.data');
const dataFile = path.join(dataDir, 'local-db.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultState() {
  const primaryAdmin = { id: 'admin-local', ...getAdminAccount() };
  return {
    admin: primaryAdmin,
    admins: [primaryAdmin],
    dashboard: { id: 'dashboard-main', key: 'main', ...clone(dashboard) },
    users: clone(demoUsers),
    meta: { nextUserId: demoUsers.length + 1, nextAdminId: 2 }
  };
}

async function ensureDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readState() {
  try {
    const raw = await readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    const defaults = defaultState();
    const admins = Array.isArray(parsed.admins)
      ? parsed.admins
      : parsed.admin
        ? [parsed.admin]
        : defaults.admins;
    return {
      ...defaults,
      ...parsed,
      admin: { ...defaults.admin, ...(parsed.admin || admins[0] || {}) },
      admins: admins.length > 0
        ? admins.map((admin, index) => ({
            ...(index === 0 ? defaults.admin : {}),
            ...admin
          }))
        : defaults.admins,
      dashboard: { ...defaults.dashboard, ...(parsed.dashboard || {}) },
      users: Array.isArray(parsed.users) ? parsed.users : defaults.users,
      meta: { ...defaults.meta, ...(parsed.meta || {}) }
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      const state = defaultState();
      await writeState(state);
      return state;
    }

    throw err;
  }
}

async function writeState(state) {
  await ensureDir();
  await writeFile(dataFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase();
}

function sortUsers(users) {
  return [...users].sort((left, right) => {
    const leftDate = new Date(left.createdDate || left.createdAt || 0).getTime();
    const rightDate = new Date(right.createdDate || right.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
}

async function mutate(mutator) {
  const state = await readState();
  const nextState = await mutator(state);
  await writeState(nextState);
  return nextState;
}

export async function bootstrapLocalStore() {
  const state = await readState();
  const defaults = defaultState();
  const demoEmails = new Set(demoUsers.map((user) => normalizeEmail(user.email)));

  state.admins = Array.isArray(state.admins) && state.admins.length > 0 ? state.admins : defaults.admins;
  state.admin = { ...defaults.admin, ...(state.admins[0] || state.admin || {}) };
  state.dashboard = { ...defaults.dashboard, ...state.dashboard };
  state.meta = { ...defaults.meta, ...state.meta };
  state.meta.nextAdminId = Math.max(Number(state.meta.nextAdminId) || 1, state.admins.length + 1);
  state.users = Array.isArray(state.users) ? state.users : [];

  if (process.env.SEED_DEMO_DATA === 'true') {
    const existing = new Set(state.users.map((user) => normalizeEmail(user.email)));
    for (const user of demoUsers) {
      if (!existing.has(normalizeEmail(user.email))) {
        state.users.push(clone(user));
      }
    }
  } else if (process.env.CLEAR_DEMO_DATA !== 'false') {
    state.users = state.users.filter((user) => !demoEmails.has(normalizeEmail(user.email)));
  }

  await writeState(state);
  return state;
}

export async function getLocalAdminByEmail(email) {
  const state = await readState();
  const match = (state.admins || []).find((admin) => normalizeEmail(admin.email) === normalizeEmail(email));
  return match ? clone(match) : null;
}

export async function getLocalAdminById(id) {
  const state = await readState();
  const match = (state.admins || []).find((admin) => admin.id === id);
  return match ? clone(match) : null;
}

export async function createLocalAdmin(data) {
  let createdAdmin = null;

  await mutate((state) => {
    const email = normalizeEmail(data.email);
    const existing = (state.admins || []).some((admin) => normalizeEmail(admin.email) === email);
    if (existing) {
      const error = new Error('Email already exists');
      error.code = 11000;
      throw error;
    }

    const nextId = Number.parseInt(String(state.meta?.nextAdminId || 1), 10) || 1;
    state.meta = { ...state.meta, nextAdminId: nextId + 1 };
    createdAdmin = {
      id: `admin-${nextId}`,
      ...clone(data),
      email
    };
    state.admins = [createdAdmin, ...(state.admins || [])];
    state.admin = state.admins[0];
    return state;
  });

  return createdAdmin;
}

export async function getLocalDashboard() {
  const state = await readState();
  return clone(state.dashboard);
}

export async function setLocalDashboard(nextDashboard) {
  return mutate((state) => {
    state.dashboard = {
      ...state.dashboard,
      ...clone(nextDashboard),
      id: state.dashboard.id || 'dashboard-main',
      key: 'main'
    };
    return state;
  });
}

export async function getLocalUsers({ search = '', page = 1, limit = 5 } = {}) {
  const state = await readState();
  const needle = normalizeSearch(search);
  const filtered = needle
    ? state.users.filter((user) => {
        return [user.name, user.email, user.role, user.status].some((value) => normalizeSearch(value).includes(needle));
      })
    : [...state.users];

  const ordered = sortUsers(filtered);
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 5, 1);
  const start = (safePage - 1) * safeLimit;

  return {
    users: clone(ordered.slice(start, start + safeLimit)),
    total: ordered.length,
    page: safePage,
    limit: safeLimit
  };
}

export async function createLocalUser(data) {
  let createdUser = null;

  await mutate((state) => {
    const email = normalizeEmail(data.email);
    if (state.users.some((user) => normalizeEmail(user.email) === email)) {
      const error = new Error('Email already exists');
      error.code = 11000;
      throw error;
    }

    const nextId = Number.parseInt(String(state.meta?.nextUserId || 1), 10) || 1;
    state.meta = { ...state.meta, nextUserId: nextId + 1 };
    createdUser = {
      id: `u-${nextId}`,
      ...clone(data),
      email
    };
    state.users = [createdUser, ...state.users];
    return state;
  });

  return createdUser;
}

export async function updateLocalUser(id, data) {
  let updatedUser = null;

  await mutate((state) => {
    const index = state.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return state;
    }

    const email = normalizeEmail(data.email);
    const duplicate = state.users.find((user) => user.id !== id && normalizeEmail(user.email) === email);
    if (duplicate) {
      const error = new Error('Email already exists');
      error.code = 11000;
      throw error;
    }

    updatedUser = {
      ...state.users[index],
      ...clone(data),
      email
    };
    state.users[index] = updatedUser;
    return state;
  });

  return updatedUser;
}

export async function deleteLocalUser(id) {
  let deleted = false;

  await mutate((state) => {
    deleted = state.users.some((user) => user.id === id);
    state.users = state.users.filter((user) => user.id !== id);
    return state;
  });

  return deleted;
}
