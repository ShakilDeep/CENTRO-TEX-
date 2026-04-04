import { FastifyInstance } from 'fastify';
import sampleLifecycleService from '../services/sampleLifecycleService';
import { initiateTransferSchema } from '../middleware/validation';
import { AccessJwtPayload } from '../types/jwt';

export default async function transferRoutes(fastify: FastifyInstance) {

    // ─── Initiate transfer (push from current user to another user) ───────────
    fastify.post('/initiate/:id', {
        preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin],
        schema: { body: initiateTransferSchema }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const { rfid_epc, to_user_id, reason } = request.body as {
                rfid_epc?: string;
                to_user_id: string;
                reason: string;
            };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const transfer = await sampleLifecycleService.initiateTransfer(
                id, user.id, to_user_id, rfid_epc, reason, deviceId
            );

            return { message: 'Transfer initiated, waiting for approval', data: transfer };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // ─── Accept incoming transfer (recipient accepts) ─────────────────────────
    fastify.post('/accept/:id', {
        preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin]
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const sample = await sampleLifecycleService.acceptTransfer(id, user.id, deviceId);

            return { message: 'Transfer accepted', data: sample };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // ─── Reject incoming transfer (recipient declines) ────────────────────────
    fastify.post('/reject/:id', {
        preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin]
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const sample = await sampleLifecycleService.rejectTransfer(id, user.id, deviceId);

            return { message: 'Transfer rejected', data: sample };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // ─── List INCOMING pending transfers (transfers TO the current user) ───────
    fastify.get('/pending', {
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { prisma } = require('../lib/prisma');

            let whereClause: any = { status: 'PENDING' };

            // Admin sees all; Merchandiser/Locator see only their incoming transfers
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
        } catch (error: any) {
            reply.code(400).send({ error: 'Failed to fetch pending transfers', message: error.message });
        }
    });

    // ─── Pull Request Transfer ─────────────────────────────────────────────────
    // A Locator or Merchandiser requests a sample from its current owner.
    // Creates a PENDING transfer FROM owner TO requester.
    // The owner then sees it in /outgoing-pending and must confirm (Yes/No).
    fastify.post('/pull-request/:sampleId', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['reason'],
                properties: {
                    reason: { type: 'string', minLength: 1 }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { sampleId } = request.params as { sampleId: string };
            const { reason } = request.body as { reason: string };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const transfer = await sampleLifecycleService.pullRequestTransfer(
                sampleId, user.id, reason, deviceId
            );

            return {
                message: 'Pull request sent. The sample owner will be notified to confirm.',
                data: transfer
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // ─── Outgoing Pending Transfers ───────────────────────────────────────────
    // Returns transfers where the current user IS the FROM user (sample owner).
    // The Merchandiser sees these to understand who is requesting their samples.
    // Powering the "Received — Yes or No?" popup in the Merchandiser journey.
    fastify.get('/outgoing-pending', {
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { prisma } = require('../lib/prisma');

            const transfers = await prisma.sampleTransfers.findMany({
                where: {
                    from_user_id: user.id,
                    status: 'PENDING'
                },
                include: {
                    sample: {
                        select: {
                            id: true,
                            sample_id: true,
                            sample_type: true,
                            description: true,
                            current_status: true,
                            rfid_epc: true
                        }
                    },
                    to_user: { select: { name: true, email: true, role: true } }
                },
                orderBy: { created_at: 'desc' }
            });

            return { data: transfers };
        } catch (error: any) {
            reply.code(400).send({
                error: 'Failed to fetch outgoing pending transfers',
                message: error.message
            });
        }
    });

    // ─── Confirm Handover ─────────────────────────────────────────────────────
    // The sample owner responds to a pull request.
    // confirmed=true  → sample ownership moves to the requester ("Received = Yes")
    // confirmed=false → request is declined, sample stays with owner ("Received = No")
    fastify.post('/confirm-handover/:transferId', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['confirmed'],
                properties: {
                    confirmed: { type: 'boolean' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { transferId } = request.params as { transferId: string };
            const { confirmed } = request.body as { confirmed: boolean };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const result = await sampleLifecycleService.confirmHandover(
                transferId, user.id, confirmed, deviceId
            );

            return {
                message: confirmed ? 'Handover confirmed. Sample transferred.' : 'Handover declined.',
                data: result
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });
}
