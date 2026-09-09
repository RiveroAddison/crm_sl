import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { normalizeNombre, normalizeRif } from '../services/cuentasComerciales.service.js';
import { requireAuth } from '../middleware/auth.js';
import type { RequestContext } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

const router = Router();

const empresaClienteSchema = z.object({
  nombre: z.string().min(1).max(100),
  rif: z.string().regex(/^[JVEGjveg]-[0-9]{8,9}-[0-9]$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const context = req.context as RequestContext;
    const items = await prisma.cuentaComercial.findMany({
      where: { empresaId: context.tenantId, activo: true },
      orderBy: { nombre: 'asc' },
    });
    return res.json({ success: true, data: items, error: '' });
  } catch (err) {
    logger.error({ err }, '[empresasClientes] Error');
    return res.status(500).json({ success: false, data: null, error: 'No fue posible cargar las empresas clientes' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const context = req.context as RequestContext;
    const item = await prisma.cuentaComercial.findFirst({
      where: { id: String(req.params.id), empresaId: context.tenantId, activo: true },
    });
    if (!item) return res.status(404).json({ success: false, data: null, error: 'Empresa cliente no encontrada' });
    return res.json({ success: true, data: item, error: '' });
  } catch (err) {
    logger.error({ err }, '[empresasClientes] Error');
    return res.status(500).json({ success: false, data: null, error: 'No fue posible obtener la empresa cliente' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = empresaClienteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = req.context as RequestContext;
    const candidates = await prisma.cuentaComercial.findMany({ where: { empresaId: context.tenantId, activo: true } });
    const existing = candidates.find((item) => normalizeNombre(item.nombre) === normalizeNombre(parsed.data.nombre));
    if (existing) return res.status(409).json({ success: false, data: null, error: 'Ya existe una empresa cliente con ese nombre' });
    if (parsed.data.rif) {
      const rifMatches = await prisma.cuentaComercial.findMany({ where: { empresaId: context.tenantId, activo: true } });
      if (rifMatches.some((item) => normalizeRif(item.rif) === normalizeRif(parsed.data.rif))) return res.status(409).json({ success: false, data: null, error: 'Ya existe una cuenta comercial con ese RIF' });
    }
    const item = await prisma.cuentaComercial.create({
      data: {
        empresaId: context.tenantId,
        nombre: parsed.data.nombre.trim().replace(/\s+/g, ' '),
        rif: normalizeRif(parsed.data.rif),
        email: parsed.data.email || null,
        telefono: parsed.data.telefono || null,
        direccion: parsed.data.direccion || null,
      },
    });
    return res.status(201).json({ success: true, data: item, error: '' });
  } catch (err) {
    logger.error({ err }, '[empresasClientes] Error');
    return res.status(500).json({ success: false, data: null, error: 'No fue posible crear la empresa cliente' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const parsed = empresaClienteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, data: null, error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const context = req.context as RequestContext;
    const existing = await prisma.cuentaComercial.findFirst({
      where: { id: String(req.params.id), empresaId: context.tenantId },
    });
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Empresa cliente no encontrada' });
    const nameMatches = await prisma.cuentaComercial.findMany({ where: { empresaId: context.tenantId, activo: true } });
    if (nameMatches.some((item) => item.id !== existing.id && normalizeNombre(item.nombre) === normalizeNombre(parsed.data.nombre))) return res.status(409).json({ success: false, data: null, error: 'Ya existe una cuenta comercial con ese nombre' });
    if (parsed.data.rif) {
      const duplicate = nameMatches.find((item) => item.id !== existing.id && normalizeRif(item.rif) === normalizeRif(parsed.data.rif));
      if (duplicate) return res.status(409).json({ success: false, data: null, error: 'Ya existe una cuenta comercial con ese RIF' });
    }
    const item = await prisma.cuentaComercial.update({
      where: { id: existing.id },
      data: {
        nombre: parsed.data.nombre.trim().replace(/\s+/g, ' '),
        rif: normalizeRif(parsed.data.rif),
        email: parsed.data.email || null,
        telefono: parsed.data.telefono || null,
        direccion: parsed.data.direccion || null,
      },
    });
    return res.json({ success: true, data: item, error: '' });
  } catch (err) {
    logger.error({ err }, '[empresasClientes] Error');
    return res.status(500).json({ success: false, data: null, error: 'No fue posible actualizar la empresa cliente' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const context = req.context as RequestContext;
    const existing = await prisma.cuentaComercial.findFirst({
      where: { id: String(req.params.id), empresaId: context.tenantId },
    });
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Empresa cliente no encontrada' });
    await prisma.cuentaComercial.update({ where: { id: existing.id }, data: { activo: false } });
    return res.json({ success: true, data: { id: existing.id }, error: '' });
  } catch (err) {
    logger.error({ err }, '[empresasClientes] Error');
    return res.status(500).json({ success: false, data: null, error: 'No fue posible eliminar la empresa cliente' });
  }
});

export default router;
