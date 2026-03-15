import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async function corsPlugin(fastify: FastifyInstance) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:5173';

  const allowedOrigins = isDevelopment
    ? [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ]
    : [frontendUrl];

  const corsConfig = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-User-Email',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['X-User-ID', 'X-User-Role'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  await fastify.register(cors, corsConfig);

  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      request.log.warn({ origin, allowedOrigins }, 'CORS: Request from disallowed origin');
    }
  });

  fastify.log.info({
    environment: process.env.NODE_ENV || 'unknown',
    allowedOrigins,
    credentials: corsConfig.credentials
  }, 'CORS plugin registered successfully');
}, {
  name: 'cors-plugin',
  dependencies: []
});
