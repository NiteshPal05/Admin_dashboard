import crypto from 'crypto';

const secret = process.env.JWT_SECRET || 'local-dev-secret';

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded.padEnd(Math.ceil(padded.length / 4) * 4, '=');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function parseExpiresIn(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value || '1d').trim();
  const match = text.match(/^(\d+)([smhd])?$/i);
  if (!match) {
    return 24 * 60 * 60;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24
  };

  return amount * multipliers[unit];
}

function signRaw(input) {
  return crypto
    .createHmac('sha256', secret)
    .update(input)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signToken(user) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const expiresInSeconds = parseExpiresIn(process.env.JWT_EXPIRES_IN || '1d');
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signRaw(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = signRaw(`${encodedHeader}.${encodedPayload}`);
  if (signature !== expectedSignature) {
    throw new Error('Invalid token');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}
