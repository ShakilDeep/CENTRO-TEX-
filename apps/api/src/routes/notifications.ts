import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { AccessJwtPayload } from '../types/jwt';

export default async function notificationsRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', fastify.authenticate);

    // GET /api/v1/notifications
    fastify.get('/', async (request, reply) => {
        const user = request.user as AccessJwtPayload;
        try {
            const notifications = await prisma.notifications.findMany({
                where: { user_id: user.id },
                orderBy: { created_at: 'desc' },
                take: 50
            });
            return reply.send({ success: true, data: notifications });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, error: 'Failed to fetch notifications' });
        }
    });

    // GET /api/v1/notifications/unread-count
    fastify.get('/unread-count', async (request, reply) => {
        const user = request.user as AccessJwtPayload;
        try {
            const count = await prisma.notifications.count({
                where: { user_id: user.id, is_read: false }
            });
            return reply.send({ success: true, data: { count } });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, error: 'Failed to count notifications' });
        }
    });

    // PUT /api/v1/notifications/read-all  (must be before /:id/read to avoid param collision)
    fastify.put('/read-all', async (request, reply) => {
        const user = request.user as AccessJwtPayload;
        try {
            await prisma.notifications.updateMany({
                where: { user_id: user.id, is_read: false },
                data: { is_read: true, read_at: new Date() }
            });
            return reply.send({ success: true });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, error: 'Failed to mark all as read' });
        }
    });

    // PUT /api/v1/notifications/:id/read
    fastify.put('/:id/read', async (request, reply) => {
        const user = request.user as AccessJwtPayload;
        const { id } = request.params as { id: string };
        try {
            const notification = await prisma.notifications.findUnique({ where: { id } });
            if (!notification || notification.user_id !== user.id) {
                return reply.status(404).send({ success: false, error: 'Notification not found' });
            }
            const updated = await prisma.notifications.update({
                where: { id },
                data: { is_read: true, read_at: new Date() }
            });
            return reply.send({ success: true, data: updated });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, error: 'Failed to update notification' });
        }
    });
}

