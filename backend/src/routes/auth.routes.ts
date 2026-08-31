import { Router } from 'express';
import { login, me, selectContext, logout, refresh } from '../controllers/auth.controller.js';
import { authRateLimiter } from '../utils/index.js';

const router = Router();

// Rate limit estricto en endpoints sensibles (login, refresh, context)
router.post('/login', authRateLimiter, login);
router.post('/context', authRateLimiter, selectContext);
router.post('/refresh', authRateLimiter, refresh);
router.get('/me', me);
router.post('/logout', logout);

export default router;


