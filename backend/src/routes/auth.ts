import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';

const router = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

/** POST /api/auth/login — login del administrador (credenciales en .env). */
router.post('/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });

  const { email, password } = parsed.data;
  if (email !== env.adminEmail || password !== env.adminPassword) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }

  const token = jwt.sign({ email }, env.jwtSecret, { expiresIn: '8h' });
  res.json({ token, email });
});

export default router;
