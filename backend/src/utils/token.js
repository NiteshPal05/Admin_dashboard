import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'local-dev-secret';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret);
}
