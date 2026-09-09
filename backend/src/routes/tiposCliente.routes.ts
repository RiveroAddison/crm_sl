import { Router } from 'express';
import { list, create, update, remove } from '../controllers/tiposCliente.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, list);
router.post('/', requireAuth, create);
router.patch('/:id', requireAuth, update);
router.delete('/:id', requireAuth, remove);

export default router;
