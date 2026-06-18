import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

const router = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

/**
 * POST /api/auth/login — login del administrador.
 * Verifica contra la tabla AdminUser (contraseñas hasheadas con bcrypt).
 * Si todavía no hay ningún admin en la base (instalación nueva sin seed),
 * acepta las credenciales de .env como respaldo para no quedar bloqueado.
 */
router.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });

  const email = parsed.data.email.toLowerCase();
  const { password } = parsed.data;

  const user = await prisma.adminUser.findUnique({ where: { email } });

  if (user) {
    if (!user.active) return res.status(403).json({ error: 'Cuenta deshabilitada' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, { expiresIn: '8h' });
    return res.json({ token, email: user.email, name: user.name });
  }

  // Respaldo: no hay admins en la base todavía → valida contra .env
  const adminCount = await prisma.adminUser.count();
  if (adminCount === 0 && email === env.adminEmail.toLowerCase() && password === env.adminPassword) {
    const token = jwt.sign({ id: 'env', email }, env.jwtSecret, { expiresIn: '8h' });
    return res.json({ token, email, name: 'Administrador' });
  }

  return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
});

export default router;
