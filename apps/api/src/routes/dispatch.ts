import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import sampleLifecycleService from '../services/sampleLifecycleService';
import { dispatchReceiveSchema, reassignSampleSchema } from '../middleware/validation';
import { AccessJwtPayload } from '../types/jwt';

export default async function dispatchRoutes(fastify: FastifyInstance) {
    // List samples pending receipt at Dispatch
    fastify.get('/pending', {
        preHandler: [fastify.authenticate, fastify.requireDispatchOrAdmin]
    }, async (_request, _reply) => {
        const samples = await prisma.samples.findMany({
            where: { current_status: 'IN_TRANSIT_TO_DISPATCH' },
            include: {
                buyer: true,
                creator: { select: { id: true, name: true, email: true } }
            },
            orderBy: { created_at: 'asc' }
        });
        return { data: samples };
    });

    // Confirm physical receipt of a sample at Dispatch
    fastify.post('/receive/:id', {
        preHandler: [fastify.authenticate, fastify.requireDispatchOrAdmin],
        schema: { body: dispatchReceiveSchema }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const { sender, rfid_epc } = request.body as { sender: string; rfid_epc: string };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const sample = await sampleLifecycleService.dispatchReceive(
                id, user.id, rfid_epc, sender, deviceId
            );
            return { message: 'Sample received successfully', data: sample };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // ST-DISP-002: Reassign sample to a different merchandiser while at Dispatch
    fastify.patch('/:id/reassign', {
        preHandler: [fastify.authenticate, fastify.requireDispatchOrAdmin],
        schema: { body: reassignSampleSchema }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const { new_merchandiser_id } = request.body as { new_merchandiser_id: string };

            const sample = await sampleLifecycleService.reassignSample(
                id, user.id, new_merchandiser_id
            );
            return { message: 'Sample reassigned successfully', data: sample };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });
}
