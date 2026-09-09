import { Router } from 'express';
import { create, list, updateStatus } from '../controllers/pedidos.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, list);
router.post('/', requireAuth, create);
router.patch('/:id/estado', requireAuth, updateStatus);

export default router;

