import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'API RESTful de XBuReads',
      version: '2.0.0',
      description:
        'Documentación de la API de XBuReads. Plataforma social para amantes de la lectura.',
    },
    servers: [
      { url: 'http://localhost:9090', description: 'Servidor de desarrollo' },
      { url: 'https://api.xbureads.com', description: 'Servidor de producción' },
    ],
    tags: [
      { name: 'Auth', description: 'Login, logout, refresh y registro' },
      { name: 'Books', description: 'CRUD y búsqueda de libros' },
      { name: 'Users', description: 'Perfil, /me, eliminación de cuenta' },
      { name: 'Follow', description: 'Sistema de seguimiento entre usuarios' },
      { name: 'Feed', description: 'Feed de actividad social del usuario' },
      { name: 'BookStatus', description: 'Estado de lectura por libro' },
      { name: 'BookProgress', description: 'Progreso de lectura (página/CFI) por libro' },
      { name: 'Favorites', description: 'Favoritos del usuario' },
      { name: 'Collections', description: 'Colecciones personalizadas' },
      { name: 'Comments', description: 'Comentarios y reacciones' },
      { name: 'Notifications', description: 'Notificaciones in-app del usuario' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: '_secure_tk',
          description:
            'JWT de sesión firmado por Firebase Admin (httpOnly, 5 días de vigencia). Se setea automáticamente al hacer POST /api/auth/login. OpenAPI 3 obliga a usar el tipo apiKey para cualquier credencial en cookie, pero en realidad es un session token, no una API key.',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'ID token de Firebase enviado en el header Authorization. Alternativa a cookieAuth en algunos endpoints públicos (ej. GET /books/path/:pathUrl).',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Api-Key',
          description: 'API Key estática requerida en producción.',
        },
      },
      schemas: {
        Info: {
          type: 'object',
          properties: {
            totalBooks: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            nextPage: { type: 'integer', nullable: true },
            prevPage: { type: 'integer', nullable: true },
            nextPageLink: { type: 'string', nullable: true },
            prevPageLink: { type: 'string', nullable: true },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            authors: { type: 'array', items: { type: 'string' } },
            synopsis: { type: 'string' },
            category: { type: 'array', items: { type: 'string' } },
            sourceLink: { type: 'string' },
            language: { type: 'string' },
            year: { type: 'integer', minimum: 1800, maximum: 2050 },
            numberPages: { type: 'integer', minimum: 49 },
            format: { type: 'string' },
            pathUrl: { type: 'string' },
            image: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                public_id: { type: 'string' },
              },
            },
            kind: {
              type: 'string',
              enum: ['reference', 'original'],
              description:
                '`reference`: libro recomendado (link externo). `original`: libro propio con archivo subido.',
            },
            file: {
              type: 'object',
              nullable: true,
              description: 'Sólo para `kind = original`.',
              properties: {
                url: { type: 'string' },
                public_id: { type: 'string' },
                type: { type: 'string', enum: ['pdf', 'epub'] },
                size: { type: 'integer', description: 'Tamaño en bytes.' },
                pages: { type: 'integer', nullable: true },
              },
            },
            authorshipAccepted: {
              type: 'object',
              nullable: true,
              description: 'Aceptación de autoría registrada al subir un libro propio (audit log).',
              properties: {
                at: { type: 'string', format: 'date-time' },
                ip: { type: 'string', nullable: true },
              },
            },
            userId: { type: 'string' },
            views: { type: 'integer' },
            rating: { type: 'number', minimum: 0, maximum: 5 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        BookProgress: {
          type: 'object',
          properties: {
            position: {
              description: 'PDF: número de página (integer). EPUB: CFI (string).',
              oneOf: [{ type: 'integer' }, { type: 'string' }],
            },
            type: { type: 'string', enum: ['pdf', 'epub'] },
            percentage: { type: 'number', minimum: 0, maximum: 100, nullable: true },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        BookSummary: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            pathUrl: { type: 'string' },
            image: {
              type: 'object',
              properties: { url: { type: 'string' } },
            },
            authors: { type: 'array', items: { type: 'string' } },
            category: { type: 'array', items: { type: 'string' } },
            synopsis: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            uid: { type: 'string' },
            name: { type: 'string' },
            username: { type: 'string' },
            picture: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        UserSummary: {
          type: 'object',
          properties: {
            uid: { type: 'string' },
            username: { type: 'string' },
            name: { type: 'string' },
            picture: { type: 'string', nullable: true },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string', maxLength: 1500 },
            bookId: { type: 'string' },
            parentId: {
              type: 'string',
              nullable: true,
              description: 'Id del comentario raíz del hilo. Null si es top-level.',
            },
            replyToId: {
              type: 'string',
              nullable: true,
              description: 'Id de la respuesta puntual a la que se contesta (para UI anidada).',
            },
            repliesCount: {
              type: 'integer',
              description: 'Cantidad de respuestas. Solo válido en top-level.',
            },
            author: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                name: { type: 'string' },
                username: { type: 'string' },
                avatar: { type: 'string' },
              },
            },
            likesCount: { type: 'integer' },
            dislikesCount: { type: 'integer' },
            isEdited: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Collection: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', maxLength: 25 },
            books: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  bookId: { type: 'string' },
                  checked: { type: 'boolean' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FeedActivity: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['book', 'comment', 'status', 'follow', 'favorite', 'collection'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            actor: { $ref: '#/components/schemas/UserSummary' },
            book: { $ref: '#/components/schemas/BookSummary' },
            target: { $ref: '#/components/schemas/UserSummary' },
            comment: {
              type: 'object',
              properties: { id: { type: 'string' }, text: { type: 'string' } },
            },
            status: {
              type: 'string',
              enum: ['read', 'reading', 'want_to_read'],
            },
          },
        },
        FollowStats: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
              },
            },
            followersCount: { type: 'integer' },
            followingCount: { type: 'integer' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['follow', 'comment', 'rating', 'reaction', 'reply'],
            },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            rating: { type: 'integer', minimum: 1, maximum: 5, nullable: true },
            commentId: { type: 'string', nullable: true },
            reactionType: {
              type: 'string',
              enum: ['like', 'dislike'],
              nullable: true,
            },
            actor: { $ref: '#/components/schemas/UserSummary' },
            book: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                pathUrl: { type: 'string' },
                image: {
                  type: 'object',
                  properties: { url: { type: 'string' } },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                status: { type: 'integer' },
                message: { type: 'string' },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'object',
              properties: {
                status: { type: 'integer' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token inválido o ausente',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        BadRequest: {
          description: 'Solicitud inválida',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  apis: ['./src/api/routes/*.ts', './src/api/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
