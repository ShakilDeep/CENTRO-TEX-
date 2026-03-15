import { FastifyInstance } from 'fastify';
import sampleLifecycleService from '../services/sampleLifecycleService';
import { storeSampleSchema } from '../middleware/validation';
import { AccessJwtPayload } from '../types/jwt';

export default async function storageRoutes(fastify: FastifyInstance) {
    // Store a sample
    fastify.post('/store/:id', {
        preHandler: [fastify.authenticate, fastify.requireMerchandiserOrAdmin],
        schema: { body: storeSampleSchema }
    }, async (request, reply) => {
        try {
            const user = request.user as AccessJwtPayload;
            const { id } = request.params as { id: string };
            const { rfid_epc, location_id } = request.body as { rfid_epc: string; location_id: string };
            const deviceId = (request.headers['x-device-id'] as string) || undefined;

            const sample = await sampleLifecycleService.storeSample(id, user.id, rfid_epc, location_id, deviceId);

            return {
                message: 'Sample stored successfully',
                data: sample
            };
        } catch (error: any) {
            reply.code(400).send({ error: 'Bad Request', message: error.message });
        }
    });

    // Suggest a storage location
    fastify.get('/suggest', {
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        const { sampleType } = request.query as { sampleType?: string };
        const { prisma } = require('../lib/prisma');

        const allLocs = await prisma.storageLocations.findMany({
            where: { is_active: true },
            orderBy: [{ rack: 'asc' }, { shelf: 'asc' }, { bin_id: 'asc' }]
        });

        const availableLocs = allLocs.filter((l: any) => l.current_count < l.max_capacity);

        let loc = availableLocs.find((l: any) => l.sample_type_affinity === sampleType);

        if (!loc) {
            loc = availableLocs[0] || null;
        }

        return { data: loc };
    });

    // Get all storage locations with availability
    fastify.get('/locations', {
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        const { prisma } = require('../lib/prisma');
        const locs = await prisma.storageLocations.findMany({
            orderBy: [{ rack: 'asc' }, { shelf: 'asc' }, { bin_id: 'asc' }],
            include: {
                samples: {
                    where: {
                        current_status: 'IN_STORAGE'
                    },
                    include: {
                        buyer: true,
                        creator: true
                    }
                }
            }
        });
        return { data: locs };
    });

    // Create new location
    fastify.post('/locations', {
        preHandler: [fastify.authenticate, fastify.requireAdmin]
    }, async (request, reply) => {
        try {
            const { rack, shelf, bin_id, max_capacity, sample_type_affinity } = request.body as any;
            const { prisma } = require('../lib/prisma');

            const existingLocsCount = await prisma.storageLocations.count();

            const location = await prisma.storageLocations.create({
                data: {
                    id: String(existingLocsCount + 1),
                    rack,
                    shelf,
                    bin_id,
                    max_capacity: Number(max_capacity),
                    current_count: 0,
                    sample_type_affinity,
                    is_active: true
                }
            });
            return { message: 'Location created successfully', data: location };
        } catch (error: any) {
            reply.code(400).send({ error: 'Creation Failed', message: error.message });
        }
    });

    // Update location details or deactivate
    fastify.patch('/locations/:id', {
        preHandler: [fastify.authenticate, fastify.requireAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const body = request.body as any;
            const { prisma } = require('../lib/prisma');

            if (body.max_capacity !== undefined) {
                body.max_capacity = Number(body.max_capacity);
            }

            const location = await prisma.storageLocations.update({
                where: { id },
                data: body
            });
            return { message: 'Location updated', data: location };
        } catch (error: any) {
            reply.code(400).send({ error: 'Update Failed', message: error.message });
        }
    });
}
