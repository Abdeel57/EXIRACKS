import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthedRequest extends Request {
  admin?: { email: string };
}

/** Protege rutas /admin: exige un Bearer token JWT válido. */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { email: string };
    req.admin = { email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
