import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/** GET /api/assets/:id — sirve una imagen subida desde el panel. Público. */
router.get('/assets/:id', async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
  if (!asset) return res.status(404).json({ error: 'Imagen no encontrada' });
  res.setHeader('Content-Type', asset.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(Buffer.from(asset.data));
});

export default router;
