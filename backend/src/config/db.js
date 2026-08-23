import { MongoClient, ObjectId } from 'mongodb';

let client = null;
let db = null;
let mode = 'atlas';

function getDatabaseName(uri) {
  const explicitName = process.env.MONGODB_DB;
  if (explicitName) {
    return explicitName;
  }

  try {
    const parsed = new URL(uri);
    return parsed.pathname.replace(/^\//, '') || undefined;
  } catch {
    return undefined;
  }
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    mode = 'local';
    console.warn('MONGODB_URI is missing, using the local datastore for localhost development');
    return null;
  }

  if (db) {
    return db;
  }

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  try {
    await client.connect();
    db = client.db(getDatabaseName(uri));
    mode = 'atlas';
    console.log('MongoDB connected');
    return db;
  } catch (err) {
    mode = 'local';
    client = null;
    db = null;
    console.warn(`MongoDB Atlas unavailable, using local datastore instead: ${err.message}`);
    return null;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database connection has not been initialized');
  }

  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
  }

  client = null;
  db = null;
}

export function isLocalMode() {
  return mode === 'local';
}

export { ObjectId };
