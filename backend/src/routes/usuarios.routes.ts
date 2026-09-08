import { Router } from 'express';
import { list, listVendedoresByEmpresa, listVendedoresByRubro, get, create, update, remove } from '../controllers/usuarios.controller.js';

const router = Router();

router.get('/', list);
router.get('/vendedores-empresa', listVendedoresByEmpresa);
router.get('/vendedores-rubro', listVendedoresByRubro);
router.get('/:id', get);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
