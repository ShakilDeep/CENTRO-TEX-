import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest } from 'fastify';

console.log('=== RATE LIMIT.TS FILE LOADED ===');

const rateLimitConfig = {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request: FastifyRequest) => {
    const user = request.user as { sub: string } | undefined;
    if (user && user.sub) {
      return `user_${user.sub}`;
    }
    return request.ip;
  },
  errorResponseBuilder: function (request: FastifyRequest, context: any) {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded, please try again later.',
      remainingTime: context.after || context.ttl || 60000
    };
  },
  skipOnError: false
};

export default fp(async function rateLimitPlugin(fastify: FastifyInstance) {
  console.log('=== RATE LIMIT PLUGIN LOADING ===');
  console.log('max:', rateLimitConfig.max);
  console.log('timeWindow:', rateLimitConfig.timeWindow);

  await fastify.register(rateLimit, rateLimitConfig);
  console.log('=== RATE LIMIT REGISTERED SUCCESSFULLY ===');

  fastify.addHook('onRequest', async (request, reply) => {
    const user = request.user as { sub: string } | undefined;
    const rateLimitKey = user && user.sub ? `user_${user.sub}` : request.ip;
    request.log.info({ rateLimitKey }, 'Rate limit key generated');
  });

  fastify.log.info({
    maxRequests: rateLimitConfig.max,
    timeWindow: rateLimitConfig.timeWindow,
    message: 'Rate limit plugin registered successfully'
  });
}, {
  name: 'rate-limit-plugin',
  dependencies: []
});
