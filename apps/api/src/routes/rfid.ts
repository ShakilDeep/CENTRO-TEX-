import { FastifyInstance } from 'fastify';
import { AccessJwtPayload } from '../types/jwt';

export default async function rfidRoutes(fastify: FastifyInstance) {
    // Validate RFID manually endpoint
    fastify.post('/validate', {
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const { epc } = request.body as { epc: string };
            const { prisma } = require('../lib/prisma');

            const tag = await prisma.rfidTags.findUnique({
                where: { epc },
                include: { current_sample: true }
            });

            if (!tag) {
                return { valid: true, status: 'UNKNOWN', message: 'Tag can be registered' };
            }

            return {
                valid: tag.status === 'AVAILABLE',
                status: tag.status,
                current_sample: tag.current_sample?.sample_id || null,
                message: tag.status === 'ACTIVE' ? 'Tag already active on another sample' : 'Tag available'
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // List all registered tags
    fastify.get('/tags', {
        preHandler: [fastify.authenticate, fastify.requireAdmin]
    }, async (request, reply) => {
        const { prisma } = require('../lib/prisma');
        const tags = await prisma.rfidTags.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                current_sample: { select: { sample_id: true } }
            }
        });
        return { data: tags };
    });

    // Create a new tag manually
    fastify.post('/tags', {
        preHandler: [fastify.authenticate, fastify.requireAdmin]
    }, async (request, reply) => {
        try {
            const { prisma } = require('../lib/prisma');
            const { epc, status = 'AVAILABLE' } = request.body as { epc: string, status?: string };
            const tag = await prisma.rfidTags.create({
                data: { epc, status }
            });
            return { data: tag, message: 'Tag provisioned successfully' };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // Disable/Change status of tag
    fastify.patch('/tags/:epc', {
        preHandler: [fastify.authenticate, fastify.requireAdmin]
    }, async (request, reply) => {
        try {
            const { prisma } = require('../lib/prisma');
            const { epc } = request.params as { epc: string };
            const { status } = request.body as { status: string }; // 'AVAILABLE' | 'DISABLED'
            const tag = await prisma.rfidTags.update({
                where: { epc },
                data: { status }
            });
            return { data: tag, message: 'Tag status updated' };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });
}
