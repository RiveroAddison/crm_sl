import { Router } from 'express';
import { create, list, updateStatus } from '../controllers/pedidos.controller.js';

const router = Router();

router.get('/', list);
router.post('/', create);
router.patch('/:id/estado', updateStatus);

export default router;

