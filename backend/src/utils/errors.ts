// src/utils/errors.ts
// Helpers para sanitizar mensajes de error antes de enviarlos al cliente.

// Mensajes de error de negocio conocidos (seguros para mostrar al usuario)
const BUSINESS_ERROR_PATTERNS = [
  'Lead no encontrado',
  'Prospecto no encontrado',
  'Pedido no encontrado',
  'Empresa no encontrada',
  'Usuario no encontrado',
  'No tienes permiso',
  'No autorizado',
  'Sin acceso',
  'El lead ya fue aprobado',
  'El lead fue rechazado',
  'El lead debe estar',
  'Oportunidad convertida no encontrada',
  'El cliente no coincide',
  'Cuenta comercial',
  'La empresa tiene registros',
  'No fue posible',
  'Usuario o contrasena incorrectos',
  'Sesion invalida',
  'Sesion expirada',
  'Refresh token',
  'Token',
  'demasiadas solicitudes',
  'Datos invalidos',
  'Formato invalido',
  'requerido',
  'obligatorio',
  'rubro',
  'motivo',
  'Calibri',
];

// Patrones que NUNCA deben mostrarse al cliente (internos de Prisma/MSSQL)
const INTERNAL_ERROR_PATTERNS = [
  'Prisma',
  'prisma',
  'SQL',
  'sql',
  'mssql',
  'MSSQL',
  'ConnectionError',
  'Failed to connect',
  'ETIMEOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'Foreign key',
  'Unique constraint',
  'Column',
  'Table',
  'Database',
  'database',
  'query',
  'Query',
  'INSERT',
  'UPDATE',
  'DELETE',
  'SELECT',
  'constraint',
  'violat',
];

/**
 * Determina si un mensaje de error es seguro para mostrar al cliente.
 * Retorna true si el mensaje es un error de negocio conocido.
 */
function isBusinessError(message: string): boolean {
  return BUSINESS_ERROR_PATTERNS.some((p) => message.includes(p));
}

/**
 * Determina si un mensaje contiene información interna sensible.
 */
function containsInternalInfo(message: string): boolean {
  return INTERNAL_ERROR_PATTERNS.some((p) => message.includes(p));
}

/**
 * Sanitiza un error para enviarlo al cliente.
 * - Si es un error de negocio conocido, lo retorna tal cual.
 * - Si contiene información interna, retorna un mensaje genérico.
 * - Para otros errores, retorna un mensaje genérico seguro.
 *
 * @param cause - El error capturado en el catch
 * @param fallback - Mensaje por defecto si no se puede sanitizar
 * @returns Mensaje seguro para el cliente
 */
export function sanitizeError(cause: unknown, fallback: string): string {
  if (!(cause instanceof Error)) return fallback;

  const message = cause.message;

  // Si es un error de negocio conocido, es seguro mostrarlo
  if (isBusinessError(message)) return message;

  // Si contiene información interna, nunca mostrarlo
  if (containsInternalInfo(message)) return fallback;

  // Para otros errores, retornar genérico por seguridad
  return fallback;
}

/**
 * Determina el HTTP status basado en el tipo de error de negocio.
 * Solo aplica para errores de negocio conocidos; para todo lo demás retorna 500.
 */
export function errorStatus(message: string): number {
  if (message.includes('no encontrado') || message.includes('No encontrado')) return 404;
  if (message.includes('Cuenta comercial') || message.includes('coincide') || message.includes('empresa activa')) return 409;
  if (message.includes('CALIFICADO') || message.includes('APROBADO')) return 409;
  if (message.includes('permiso') || message.includes('autorizado')) return 403;
  if (message.includes('incorrectos') || message.includes('invalido') || message.includes('inválido')) return 401;
  return 500;
}
