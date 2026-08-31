// filepath: src/utils/corsErrorHandler.ts
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware final que captura cualquier error de CORS lanzado por el middleware
 * de cors y responde 403 con un JSON en lugar del HTML por defecto de Express.
 *
 * Registrarlo DESPUES de todos los routers.
 */
export const corsErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err && /CORS/i.test(err.message)) {
    res.status(403).json({ error: 'Origen no permitido por la politica CORS' });
    return;
  }
  next(err);
};
