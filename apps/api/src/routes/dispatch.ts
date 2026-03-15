import { FastifyInstance } from 'fastify';
import sampleLifecycleService from '../services/sampleLifecycleService';
import { dispatchReceiveSchema } from '../middleware/validation';
import { AccessJwtPayload } from '../types/jwt';

export default async function dispatchRoutes(fastify: FastifyInstance) {
    // Get pending samples to receive
    fastify.get('/pending', {
        preHandler: [fastify.authenticate, fastify.requireDispatchOrAdmin]
    }, async (request, reply) => {
        // For proper DI, we'll actually just call service or use direct query
        // Let's use direct query to bypass complex service layer for simple list
        const { prisma } = require('../lib/prisma');
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

    // Receive sample and assign RFID tag
    fastify.post('/receive/:id', {
        preHandler: [fastify.authenticate, fastify.requireDispatchOrAdmin],
        schema: { body: dispatchReceiveSchema }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const { sender, rfid_epc } = request.body as { sender: string; rfid_epc: string };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const sample = await sampleLifecycleService.dispatchReceive(id, user.id, rfid_epc, sender, deviceId);

            return {
                message: 'Sample received and tagged successfully',
                data: sample
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });
}
