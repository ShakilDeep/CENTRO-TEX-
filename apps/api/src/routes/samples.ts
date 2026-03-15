import { FastifyInstance } from 'fastify';
import sampleLifecycleService from '../services/sampleLifecycleService';
import { createSampleSchema, merchandiserReceiveSchema, disposeSampleSchema } from '../middleware/validation';
import { AccessJwtPayload } from '../types/jwt';
import { prisma } from '../lib/prisma';

export default async function samplesRoutes(fastify: FastifyInstance) {
  // Create sample
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin],
    schema: { body: createSampleSchema }
  }, async (request, reply) => {
    try {
      const user = request.user as AccessJwtPayload;
      const { buyer_id, sample_type, description, photo_url } = request.body as any;

      const sample = await sampleLifecycleService.createSample({
        buyer_id,
        sample_type,
        description,
        photo_url,
        created_by: user.id,
        device_id: (request.headers['x-device-id'] as string) || undefined
      });

      return {
        message: 'Sample created successfully',
        data: sample
      };
    } catch (error: any) {
      reply.code(400).send({ error: 'Bad Request', message: error.message });
    }
  });

  // List samples
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = request.user as AccessJwtPayload;
      const samples = await sampleLifecycleService.listSamples(user.id, user.role, request.query);
      return { data: samples };
    } catch (error: any) {
      reply.code(400).send({ error: 'Failed to fetch samples', message: error.message });
    }
  });

  // Get active buyers
  fastify.get('/buyers', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const buyers = await prisma.buyers.findMany({ where: { is_active: true } });
      return { data: buyers };
    } catch (error: any) {
      reply.code(400).send({ error: 'Failed to fetch buyers', message: error.message });
    }
  });

  // Get sample by ID
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const sample = await sampleLifecycleService.getSample(id);

      if (!sample) {
        return reply.code(404).send({ error: 'Not Found', message: 'Sample not found' });
      }

      return { data: sample };
    } catch (error: any) {
      reply.code(400).send({ error: 'Failed to fetch sample', message: error.message });
    }
  });

  // Merchandiser Receive
  fastify.post('/:id/receive', {
    preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin],
    schema: { body: merchandiserReceiveSchema }
  }, async (request, reply) => {
    try {
      const user = request.user as AccessJwtPayload;
      const { id } = request.params as { id: string };
      const { rfid_epc } = request.body as { rfid_epc: string };
      const deviceId = (request.headers['x-device-id'] as string) || undefined;

      const sample = await sampleLifecycleService.merchandiserReceive(id, user.id, rfid_epc, deviceId);

      return {
        message: 'Sample received successfully',
        data: sample
      };
    } catch (error: any) {
      reply.code(400).send({ error: 'Bad Request', message: error.message });
    }
  });

  // Dispose Sample
  fastify.post('/:id/dispose', {
    preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin],
    schema: { body: disposeSampleSchema }
  }, async (request, reply) => {
    try {
      const user = request.user as AccessJwtPayload;
      const { id } = request.params as { id: string };
      const { rfid_epc, reason, comment } = request.body as { rfid_epc: string, reason: string, comment?: string };
      const deviceId = (request.headers['x-device-id'] as string) || undefined;

      const sample = await sampleLifecycleService.disposeSample(id, user.id, rfid_epc, reason, comment, deviceId);

      return {
        message: 'Sample disposed successfully',
        data: sample
      };
    } catch (error: any) {
      reply.code(400).send({ error: 'Bad Request', message: error.message });
    }
  });

  // Get sample movement history
  fastify.get('/:id/movements', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const movements = await sampleLifecycleService.getSampleMovements(id);
      return { data: movements };
    } catch (error: any) {
      reply.code(400).send({ error: 'Failed to fetch movements', message: error.message });
    }
  });
}
