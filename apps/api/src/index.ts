import Fastify, { FastifyInstance } from 'fastify';
import corsPlugin from './plugins/cors';
import rateLimitPlugin from './plugins/rateLimit';
import jwtPlugin from './plugins/jwt';
import authRoutes from './routes/auth';
import samplesRoutes from './routes/samples';
import dispatchRoutes from './routes/dispatch';
import storageRoutes from './routes/storage';
import rfidRoutes from './routes/rfid';
import transferRoutes from './routes/transfers';
import notificationsRoutes from './routes/notifications';
import { applyPragmas } from './db/pragmas';
import fastifyStatic from '@fastify/static';
import path from 'path';

// Setup basic server
const server: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

async function start() {
  try {
    // 1. apply pragmatic config to sqlite db
    await applyPragmas();

    // 2. Register core plugins
    await server.register(corsPlugin);
    await server.register(rateLimitPlugin);
    await server.register(jwtPlugin);

    // Register static file serving for frontend
    server.register(fastifyStatic, {
      root: path.join(__dirname, '..', '..', 'web', 'dist'),
      prefix: '/',
    });

    // 3. Register route modules
    server.register(authRoutes, { prefix: '/api/v1/auth' });
    server.register(samplesRoutes, { prefix: '/api/v1/samples' });
    server.register(dispatchRoutes, { prefix: '/api/v1/dispatch' });
    server.register(storageRoutes, { prefix: '/api/v1/storage' });
    server.register(rfidRoutes, { prefix: '/api/v1/rfid' });
    server.register(transferRoutes, { prefix: '/api/v1/transfers' });
    server.register(notificationsRoutes, { prefix: '/api/v1/notifications' });

    // Health check endpoint
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Fallback handler for SPA routing
    server.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/auth/')) {
        reply.code(404).send({ error: 'Not Found', message: `Route ${request.method}:${request.url} not found` });
      } else {
        reply.sendFile('index.html');
      }
    });

    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    server.log.info(`Server listening at http://${host}:${port}`);
    server.log.info('Available API routes:');
    console.log(server.printRoutes());
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Global error handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // process.exit(1); // Removed to prevent server crash during dev
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // process.exit(1); // Removed to prevent server crash during dev
});

start();
