import { FastifyInstance } from 'fastify';
import sampleLifecycleService from '../services/sampleLifecycleService';
import { initiateTransferSchema } from '../middleware/validation';
import { AccessJwtPayload } from '../types/jwt';

export default async function transferRoutes(fastify: FastifyInstance) {
    // Initiate transfer
    fastify.post('/initiate/:id', {
        preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin],
        schema: { body: initiateTransferSchema }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const { rfid_epc, to_user_id, reason } = request.body as { rfid_epc: string; to_user_id: string; reason: string };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const transfer = await sampleLifecycleService.initiateTransfer(id, user.id, to_user_id, rfid_epc, reason, deviceId);

            return {
                message: 'Transfer initiated, waiting for approval',
                data: transfer
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // Accept transfer
    fastify.post('/accept/:id', {
        preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin]
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string }; // This is transferId
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const sample = await sampleLifecycleService.acceptTransfer(id, user.id, deviceId);

            return {
                message: 'Transfer accepted',
                data: sample
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // Reject transfer
    fastify.post('/reject/:id', {
        preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin]
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string }; // transferId
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const sample = await sampleLifecycleService.rejectTransfer(id, user.id, deviceId);

            return {
                message: 'Transfer rejected',
                data: sample
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // List pending transfers (for current user or admin)
    fastify.get('/pending', {
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        const user = request.user as AccessJwtPayload;
        const { prisma } = require('../lib/prisma');

        let whereClause: any = { status: 'PENDING' };

        // Admin sees all, merchandiser sees only transfers directed to them
        if (user.role !== 'ADMIN') {
            whereClause.to_user_id = user.id;
        }

        const transfers = await prisma.sampleTransfers.findMany({
            where: whereClause,
            include: {
                sample: { select: { sample_id: true, sample_type: true, description: true } },
                from_user: { select: { name: true, email: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        return { data: transfers };
    });
}
