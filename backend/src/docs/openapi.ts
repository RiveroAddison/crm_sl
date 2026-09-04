const response = (description = 'Operación exitosa') => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
});

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
});

const jsonBody = (schema: Record<string, unknown>) => ({
  required: true,
  content: { 'application/json': { schema } }
});

const idParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const protectedResponses = { '401': errorResponse('No autenticado'), '500': errorResponse('Error interno del servidor') };
const adminResponses = { '401': errorResponse('No autenticado'), '403': errorResponse('Se requiere rol MASTER o ADMIN'), '500': errorResponse('Error interno del servidor') };

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'CRM SL API',
    version: '1.0.0',
    description: 'API REST multiempresa para gestión comercial, visitas, pedidos y sincronización con Profit Plus.'
  },
  servers: [{ url: 'http://localhost:4500', description: 'Servidor local' }],
  tags: [
    { name: 'Autenticación', description: 'Inicio, selección de empresa y sesión' },
    { name: 'Dashboard', description: 'Resumen comercial de la empresa activa' },
    { name: 'Leads', description: 'Gestión y conversión de leads' },
    { name: 'Cuentas comerciales', description: 'Organizaciones externas del ciclo comercial' },
    { name: 'Pedidos', description: 'Pedidos y estados de facturación' },
    { name: 'Prospectos', description: 'Oportunidades comerciales' },
    { name: 'Visitas', description: 'Planificación y check-in de visitas' },
    { name: 'Usuarios', description: 'Administración de usuarios y accesos' },
    { name: 'Empresas', description: 'Administración de empresas y conexión Profit' },
    { name: 'Profit', description: 'Sincronización con Profit Plus' }
  ],
  paths: {
    '/api/auth/login': { post: { tags: ['Autenticación'], summary: 'Inicia sesión', operationId: 'login', requestBody: jsonBody({ $ref: '#/components/schemas/LoginRequest' }), responses: { '200': response('Credenciales válidas'), '400': errorResponse('Formato de credenciales inválido'), '401': errorResponse('Credenciales incorrectas'), '403': errorResponse('Sin empresas activas'), '500': errorResponse('No fue posible iniciar sesión') } } },
    '/api/auth/context': { post: { tags: ['Autenticación'], summary: 'Selecciona la empresa activa', operationId: 'selectContext', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/SelectContextRequest' }), responses: { '200': response('Sesión creada'), '400': errorResponse('Contexto inválido'), '401': errorResponse('Token pre-autenticación expirado'), '403': errorResponse('Sin acceso a la empresa'), '500': errorResponse('Error interno') } } },
    '/api/auth/me': { get: { tags: ['Autenticación'], summary: 'Obtiene la sesión actual', operationId: 'getCurrentUser', security: [{ sessionCookie: [] }], responses: { '200': response(), '401': errorResponse('Sesión inválida o expirada'), '403': errorResponse('Sin acceso a la empresa activa') } } },
    '/api/auth/logout': { post: { tags: ['Autenticación'], summary: 'Cierra la sesión', operationId: 'logout', responses: { '200': response() } } },
    '/api/dashboard': { get: { tags: ['Dashboard'], summary: 'Obtiene métricas y clientes', operationId: 'getDashboard', security: [{ sessionCookie: [] }], responses: { '200': response(), ...protectedResponses } } },
    '/api/leads': {
      get: { tags: ['Leads'], summary: 'Lista leads de la empresa activa', operationId: 'listLeads', security: [{ sessionCookie: [] }], responses: { '200': response(), ...protectedResponses } },
      post: { tags: ['Leads'], summary: 'Crea un lead', operationId: 'createLead', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/LeadRequest' }), responses: { '201': response(), '400': errorResponse('Lead inválido'), ...protectedResponses } }
    },
    '/api/leads/{id}': {
      patch: { tags: ['Leads'], summary: 'Actualiza parcialmente un lead', operationId: 'updateLead', security: [{ sessionCookie: [] }], parameters: [idParameter], requestBody: jsonBody({ $ref: '#/components/schemas/LeadPatchRequest' }), responses: { '200': response(), '400': errorResponse('Lead inválido'), '404': errorResponse('Lead no encontrado'), '409': errorResponse('El lead no puede modificarse en su estado actual'), ...protectedResponses } },
      delete: { tags: ['Leads'], summary: 'Elimina un lead', operationId: 'deleteLead', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '404': errorResponse('Lead no encontrado'), ...protectedResponses } }
    },
    '/api/leads/{id}/convert': { post: { tags: ['Leads'], summary: 'Convierte un lead en oportunidad', operationId: 'convertLead', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '201': response(), '404': errorResponse('Lead no encontrado'), '409': errorResponse('El lead no está calificado'), ...protectedResponses } } },
      '/api/empresas-clientes': {
        get: { tags: ['Cuentas comerciales'], summary: 'Lista cuentas comerciales activas', operationId: 'listCommercialAccounts', security: [{ sessionCookie: [] }], responses: { '200': response(), ...protectedResponses } },
        post: { tags: ['Cuentas comerciales'], summary: 'Crea una cuenta comercial', operationId: 'createCommercialAccount', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/CommercialAccountRequest' }), responses: { '201': response(), '400': errorResponse('Datos inválidos'), '409': errorResponse('Cuenta comercial duplicada'), ...protectedResponses } }
      },
      '/api/empresas-clientes/{id}': {
        get: { tags: ['Cuentas comerciales'], summary: 'Obtiene una cuenta comercial', operationId: 'getCommercialAccount', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '404': errorResponse('Cuenta comercial no encontrada'), ...protectedResponses } },
        put: { tags: ['Cuentas comerciales'], summary: 'Actualiza una cuenta comercial', operationId: 'updateCommercialAccount', security: [{ sessionCookie: [] }], parameters: [idParameter], requestBody: jsonBody({ $ref: '#/components/schemas/CommercialAccountRequest' }), responses: { '200': response(), '400': errorResponse('Datos inválidos'), '404': errorResponse('Cuenta comercial no encontrada'), ...protectedResponses } },
        delete: { tags: ['Cuentas comerciales'], summary: 'Desactiva una cuenta comercial', operationId: 'deleteCommercialAccount', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '404': errorResponse('Cuenta comercial no encontrada'), ...protectedResponses } }
      },
    '/api/pedidos': {
      get: { tags: ['Pedidos'], summary: 'Lista pedidos', operationId: 'listOrders', security: [{ sessionCookie: [] }], responses: { '200': response(), ...protectedResponses } },
      post: { tags: ['Pedidos'], summary: 'Crea un pedido', operationId: 'createOrder', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/OrderRequest' }), responses: { '201': response(), '400': errorResponse('Pedido inválido'), ...protectedResponses } }
    },
    '/api/pedidos/{id}/estado': { patch: { tags: ['Pedidos'], summary: 'Actualiza el estado de un pedido', operationId: 'updateOrderStatus', security: [{ sessionCookie: [] }], parameters: [idParameter], requestBody: jsonBody({ $ref: '#/components/schemas/OrderStatusRequest' }), responses: { '200': response(), '400': errorResponse('Estado inválido'), '404': errorResponse('Pedido no encontrado'), ...protectedResponses } } },
    '/api/prospectos': {
      get: { tags: ['Prospectos'], summary: 'Lista prospectos', operationId: 'listProspects', security: [{ sessionCookie: [] }], responses: { '200': response(), ...protectedResponses } },
      post: { tags: ['Prospectos'], summary: 'Crea un prospecto', operationId: 'createProspect', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/ProspectRequest' }), responses: { '201': response(), '400': errorResponse('Prospecto inválido'), ...protectedResponses } }
    },
    '/api/prospectos/{id}/etapa': { patch: { tags: ['Prospectos'], summary: 'Cambia la etapa de un prospecto', operationId: 'updateProspectStage', security: [{ sessionCookie: [] }], parameters: [idParameter], requestBody: jsonBody({ $ref: '#/components/schemas/StageRequest' }), responses: { '200': response(), '400': errorResponse('Etapa inválida'), '404': errorResponse('Prospecto no encontrado'), ...protectedResponses } } },
    '/api/prospectos/{id}': { delete: { tags: ['Prospectos'], summary: 'Elimina un prospecto', operationId: 'deleteProspect', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '404': errorResponse('Prospecto no encontrado'), ...protectedResponses } } },
    '/api/visitas': { get: { tags: ['Visitas'], summary: 'Lista visitas', operationId: 'listVisits', security: [{ sessionCookie: [] }], responses: { '200': response(), ...protectedResponses } } },
    '/api/visitas/checkin': { post: { tags: ['Visitas'], summary: 'Registra un check-in GPS', operationId: 'registerCheckIn', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/CheckInRequest' }), responses: { '201': response(), '400': errorResponse('Check-in inválido'), '404': errorResponse('Cliente no encontrado'), ...protectedResponses } } },
    '/api/usuarios': {
      get: { tags: ['Usuarios'], summary: 'Lista usuarios', operationId: 'listUsers', security: [{ sessionCookie: [] }], responses: { '200': response(), ...adminResponses } },
      post: { tags: ['Usuarios'], summary: 'Crea un usuario', operationId: 'createUser', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/UserRequest' }), responses: { '201': response(), '400': errorResponse('Datos inválidos o correo duplicado'), ...adminResponses } }
    },
    '/api/usuarios/{id}': {
      get: { tags: ['Usuarios'], summary: 'Obtiene un usuario', operationId: 'getUser', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '404': errorResponse('Usuario no encontrado'), ...adminResponses } },
      put: { tags: ['Usuarios'], summary: 'Actualiza un usuario', operationId: 'updateUser', security: [{ sessionCookie: [] }], parameters: [idParameter], requestBody: jsonBody({ $ref: '#/components/schemas/UserUpdateRequest' }), responses: { '200': response(), '400': errorResponse('Datos inválidos o correo duplicado'), '404': errorResponse('Usuario no encontrado'), ...adminResponses } },
      delete: { tags: ['Usuarios'], summary: 'Elimina o desactiva un usuario', operationId: 'deleteUser', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '400': errorResponse('No puede eliminarse a sí mismo'), '404': errorResponse('Usuario no encontrado'), ...adminResponses } }
    },
    '/api/empresas': {
      get: { tags: ['Empresas'], summary: 'Lista empresas', operationId: 'listCompanies', security: [{ sessionCookie: [] }], responses: { '200': response(), ...adminResponses } },
      post: { tags: ['Empresas'], summary: 'Crea una empresa', operationId: 'createCompany', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/CompanyRequest' }), responses: { '201': response(), '400': errorResponse('Datos inválidos'), ...adminResponses } }
    },
    '/api/empresas/{id}': {
      get: { tags: ['Empresas'], summary: 'Obtiene una empresa', operationId: 'getCompany', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '404': errorResponse('Empresa no encontrada'), ...adminResponses } },
      put: { tags: ['Empresas'], summary: 'Actualiza una empresa', operationId: 'updateCompany', security: [{ sessionCookie: [] }], parameters: [idParameter], requestBody: jsonBody({ $ref: '#/components/schemas/CompanyRequest' }), responses: { '200': response(), '400': errorResponse('Datos inválidos'), '404': errorResponse('Empresa no encontrada'), ...adminResponses } },
      delete: { tags: ['Empresas'], summary: 'Elimina o desactiva una empresa', operationId: 'deleteCompany', security: [{ sessionCookie: [] }], parameters: [idParameter], responses: { '200': response(), '404': errorResponse('Empresa no encontrada'), ...adminResponses } }
    },
    '/api/empresas/test-connection': { post: { tags: ['Empresas'], summary: 'Prueba una conexión MSSQL de Profit', operationId: 'testProfitConnection', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/ProfitConnectionRequest' }), responses: { '200': response('Resultado de la conexión'), '400': errorResponse('Faltan parámetros de conexión'), ...adminResponses } } },
    '/api/profit/sync/test': { post: { tags: ['Profit'], summary: 'Diagnóstico de conexión con Profit (sin escritura)', operationId: 'profitTestConnection', security: [{ sessionCookie: [] }], requestBody: jsonBody({ type: 'object', required: ['empresaId'], properties: { empresaId: { type: 'string', format: 'uuid' } } }), responses: { '200': response('Diagnóstico exitoso'), '404': errorResponse('Empresa no encontrada'), ...adminResponses } } },
    '/api/profit/sync/sellers': { post: { tags: ['Profit'], summary: 'Sincroniza vendedores desde Profit', operationId: 'syncSellers', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/SyncRequest' }), responses: { '200': response(), '404': errorResponse('Empresa no encontrada o inactiva'), ...adminResponses } } },
    '/api/profit/sync/clientes': { post: { tags: ['Profit'], summary: 'Sincroniza clientes desde Profit', operationId: 'syncClients', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/SyncRequest' }), responses: { '200': response(), '404': errorResponse('Empresa no encontrada o inactiva'), ...adminResponses } } },
    '/api/profit/sync/ventas': { post: { tags: ['Profit'], summary: 'Sincroniza ventas (últimos 9 meses) desde Profit', operationId: 'syncSales', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/SyncRequest' }), responses: { '200': response(), '404': errorResponse('Empresa no encontrada o inactiva'), ...adminResponses } } },
    '/api/profit/sync/all': { post: { tags: ['Profit'], summary: 'Sincroniza vendedores, clientes y ventas desde Profit', operationId: 'syncAll', security: [{ sessionCookie: [] }], requestBody: jsonBody({ $ref: '#/components/schemas/SyncRequest' }), responses: { '200': response(), '404': errorResponse('Empresa no encontrada o inactiva'), ...adminResponses } } },
    '/api/profit/status': { get: { tags: ['Profit'], summary: 'Consulta el estado de sincronización', operationId: 'getProfitStatus', security: [{ sessionCookie: [] }], responses: { '200': response(), ...adminResponses } } }
  },
  components: {
    securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'crm_session', description: 'Cookie HTTP-only establecida por POST /api/auth/context.' } },
    schemas: {
      ApiResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { nullable: true, description: 'Payload de la operación' }, error: { type: 'string', example: '' } }, required: ['success', 'data', 'error'] },
      ErrorResponse: { type: 'object', properties: { success: { type: 'boolean', example: false }, data: { nullable: true, example: null }, error: { type: 'string', example: 'No autenticado' } }, required: ['success', 'data', 'error'] },
      LoginRequest: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email', maxLength: 100 }, password: { type: 'string', minLength: 1, maxLength: 100, format: 'password' } } },
      SelectContextRequest: { type: 'object', required: ['empresaId'], properties: { empresaId: { type: 'string', format: 'uuid' } } },
      LeadRequest: { type: 'object', required: ['nombreContacto', 'empresaNombre', 'fuente'], properties: { nombreContacto: { type: 'string', minLength: 2 }, empresaNombre: { type: 'string', minLength: 2 }, rif: { type: 'string', pattern: '^[JVEGjveg]-[0-9]{8,9}-[0-9]$' }, email: { type: 'string', format: 'email' }, telefono: { type: 'string' }, fuente: { type: 'string', enum: ['REDES', 'WEB', 'LLAMADA', 'REFERIDO'] }, estadoCalificacion: { type: 'string', enum: ['NUEVO', 'CALIFICADO', 'DESCARTADO'] }, presupuesto: { type: 'number', minimum: 0 }, necesidad: { type: 'string' }, autoridad: { type: 'string' }, tiempo: { type: 'string' }, vendedorId: { type: 'string', format: 'uuid' }, cuentaComercialId: { type: 'string', format: 'uuid' }, empresaClienteId: { type: 'string', format: 'uuid', deprecated: true } } },
      LeadPatchRequest: { type: 'object', description: 'Todos los campos son opcionales.', allOf: [{ $ref: '#/components/schemas/LeadRequest' }] },
      CommercialAccountRequest: { type: 'object', required: ['nombre'], properties: { nombre: { type: 'string', minLength: 1 }, rif: { type: 'string', pattern: '^[JVEGjveg]-[0-9]{8,9}-[0-9]$' }, direccion: { type: 'string' }, telefono: { type: 'string' }, email: { type: 'string', format: 'email' } } },
      OrderRequest: { type: 'object', required: ['detalles'], properties: { clienteEmpresaId: { type: 'string', format: 'uuid' }, oportunidadId: { type: 'string', format: 'uuid' }, cuentaComercialId: { type: 'string', format: 'uuid' }, empresaClienteId: { type: 'string', format: 'uuid', deprecated: true }, detalles: { type: 'array', minItems: 1, items: { type: 'object', required: ['producto', 'cantidad', 'precioUnitario'], properties: { producto: { type: 'string', minLength: 1 }, cantidad: { type: 'integer', exclusiveMinimum: 0 }, precioUnitario: { type: 'number', minimum: 0 } } } } }, description: 'Debe indicar clienteEmpresaId u oportunidadId.' },
      OrderStatusRequest: { type: 'object', required: ['estado'], properties: { estado: { type: 'string', enum: ['PENDIENTE', 'APROBADO', 'FACTURADO', 'ANULADO'] } } },
      ProspectRequest: { type: 'object', required: ['razonSocial', 'rif', 'titulo', 'valorEstimado', 'fechaContacto', 'vendedorNombre'], properties: { razonSocial: { type: 'string', minLength: 2 }, rif: { type: 'string', pattern: '^[JVEGjveg]-[0-9]{8,9}-[0-9]$' }, titulo: { type: 'string', minLength: 3 }, etapa: { type: 'string', enum: ['NUEVO', 'NEGOCIACION', 'CONVERTIDO', 'RECHAZADO'], default: 'NUEVO' }, valorEstimado: { type: 'number', minimum: 0 }, fechaContacto: { type: 'string', example: '2026-08-28' }, vendedorNombre: { type: 'string', minLength: 1 }, cuentaComercialId: { type: 'string', format: 'uuid' }, empresaClienteId: { type: 'string', format: 'uuid', deprecated: true } } },
      StageRequest: { type: 'object', required: ['etapa'], properties: { etapa: { type: 'string', enum: ['NUEVO', 'NEGOCIACION', 'CONVERTIDO', 'RECHAZADO'] } } },
      CheckInRequest: { type: 'object', required: ['rif', 'clienteRazonSocial', 'semana', 'dia', 'latitud', 'longitud'], properties: { rif: { type: 'string', pattern: '^[JVEGjveg]-[0-9]{8,9}-[0-9]$' }, clienteRazonSocial: { type: 'string', minLength: 1 }, semana: { type: 'integer', minimum: 1, maximum: 4 }, dia: { type: 'string', minLength: 1 }, latitud: { type: 'number', minimum: -90, maximum: 90 }, longitud: { type: 'number', minimum: -180, maximum: 180 }, comentario: { type: 'string', maxLength: 500 } } },
      UserCompany: { type: 'object', required: ['empresaId', 'rol'], properties: { empresaId: { type: 'string', format: 'uuid' }, rol: { type: 'string', enum: ['MASTER', 'ADMIN', 'VENDEDOR'] } } },
      UserRequest: { type: 'object', required: ['nombre', 'email', 'password'], properties: { nombre: { type: 'string', minLength: 1, maxLength: 100 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6, maxLength: 100, format: 'password' }, activo: { type: 'boolean', default: true }, empresas: { type: 'array', items: { $ref: '#/components/schemas/UserCompany' } } } },
      UserUpdateRequest: { type: 'object', required: ['nombre', 'email', 'activo'], properties: { nombre: { type: 'string', minLength: 1, maxLength: 100 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6, maxLength: 100, nullable: true }, activo: { type: 'boolean' }, empresas: { type: 'array', items: { $ref: '#/components/schemas/UserCompany' } } } },
      CompanyRequest: { type: 'object', required: ['nombre'], properties: { nombre: { type: 'string', minLength: 1, maxLength: 100 }, profitDbHost: { type: 'string', nullable: true }, profitDbName: { type: 'string', nullable: true }, profitDbUser: { type: 'string', nullable: true }, profitDbPassword: { type: 'string', nullable: true, format: 'password' }, activo: { type: 'boolean', default: true } } },
      ProfitConnectionRequest: { type: 'object', required: ['host', 'name', 'user', 'password'], properties: { host: { type: 'string' }, name: { type: 'string' }, user: { type: 'string' }, password: { type: 'string', format: 'password' } } },
      SyncRequest: { type: 'object', properties: { empresaId: { type: 'string', format: 'uuid', description: 'Si se omite, sincroniza todas las empresas activas.' } } }
    }
  }
} as const;