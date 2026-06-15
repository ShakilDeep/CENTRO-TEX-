import { FastifyInstance } from 'fastify';
import sampleLifecycleService from '../services/sampleLifecycleService';
import { createSampleSchema, merchandiserReceiveSchema, disposeSampleSchema } from '../middleware/validation';
import { AccessJwtPayload } from '../types/jwt';
import { prisma } from '../lib/prisma';

export default async function samplesRoutes(fastify: FastifyInstance) {
  // Create sample
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireDispatchOrMerchandiserOrAdmin],
    schema: { body: createSampleSchema }
  }, async (request, reply) => {
    try {
      const user = request.user as AccessJwtPayload;
      const { buyer_id, sample_type, description, photo_url, sender_origin, receiver_name,
              purpose, factory_id, assigned_merchandiser_id } = request.body as any;

      // Dispatch role must always specify a target merchandiser
      if (user.role === 'DISPATCH' && !assigned_merchandiser_id) {
        return reply.code(400).send({ error: 'Bad Request', message: 'assigned_merchandiser_id is required for Dispatch role' });
      }

      if (assigned_merchandiser_id) {
        const merch = await prisma.users.findUnique({ where: { id: assigned_merchandiser_id } });
        if (!merch || merch.role !== 'MERCHANDISER') {
          return reply.code(400).send({ error: 'Bad Request', message: 'Assigned user must be a merchandiser' });
        }
      }

      const sample = await sampleLifecycleService.createSample({
        buyer_id,
        sample_type,
        description,
        photo_url,
        sender_origin,
        receiver_name,
        purpose,
        factory_id,
        assigned_merchandiser_id,
        created_by: user.id,
        device_id: (request.headers['x-device-id'] as string) || undefined
      });

      return { message: 'Sample created successfully', data: sample };
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

  // ERP master-data dropdowns — must be declared before /:id to avoid param capture
  fastify.get('/buyers', {
    preHandler: [fastify.authenticate]
  }, async (_request, reply) => {
    try {
      const buyers = await prisma.buyers.findMany({ where: { is_active: true } });
      return { data: buyers };
    } catch (error: any) {
      reply.code(400).send({ error: 'Failed to fetch buyers', message: error.message });
    }
  });

  fastify.get('/factories', {
    preHandler: [fastify.authenticate]
  }, async (_request, reply) => {
    try {
      const factories = await prisma.factories.findMany({ where: { is_active: true } });
      return { data: factories };
    } catch (error: any) {
      reply.code(400).send({ error: 'Failed to fetch factories', message: error.message });
    }
  });

  fastify.get('/merchandisers', {
    preHandler: [fastify.authenticate]
  }, async (_request, reply) => {
    try {
      const merchandisers = await prisma.users.findMany({ where: { role: 'MERCHANDISER', is_active: true } });
      return { data: merchandisers };
    } catch (error: any) {
      reply.code(400).send({ error: 'Failed to fetch merchandisers', message: error.message });
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

  // Encode RFID (New)
  fastify.post('/:id/encode', {
    preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin],
    schema: {
      body: {
        type: 'object',
        required: ['rfid_epc'],
        properties: {
          rfid_epc: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as AccessJwtPayload;
      const { id } = request.params as { id: string };
      const { rfid_epc } = request.body as { rfid_epc: string };
      const deviceId = (request.headers['x-device-id'] as string) || undefined;

      const sample = await sampleLifecycleService.encodeRfid(id, user.id, rfid_epc, deviceId);

      return {
        message: 'RFID tag encoded successfully',
        data: sample
      };
    } catch (error: any) {
      reply.code(400).send({ error: 'Bad Request', message: error.message });
    }
  });
}
