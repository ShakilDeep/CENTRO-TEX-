import { prisma } from '../lib/prisma';
import sampleIdService from './sampleIdService';

export class SampleLifecycleService {
    /**
     * Generates sample, sets initial status to IN_TRANSIT_TO_DISPATCH
     */
    async createSample(data: {
        buyer_id: string;
        sample_type: string;
        description: string;
        photo_url?: string;
        created_by: string; // User ID
        device_id?: string;
    }) {
        const nextSampleId = await sampleIdService.generateSampleId();

        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.create({
                data: {
                    sample_id: nextSampleId,
                    buyer_id: data.buyer_id,
                    sample_type: data.sample_type,
                    description: data.description,
                    photo_url: data.photo_url,
                    created_by: data.created_by,
                    current_status: 'IN_TRANSIT_TO_DISPATCH',
                    current_owner_id: data.created_by,
                }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: sample.id,
                    user_id: data.created_by,
                    device_id: data.device_id,
                    action_type: 'CREATED',
                    previous_status: 'NONE',
                    new_status: 'IN_TRANSIT_TO_DISPATCH',
                }
            });

            return sample;
        });
    }

    // Get samples visible to the user
    async listSamples(userId: string, role: string, filters: any = {}) {
        const whereClause: any = { ...filters };

        // Merchandiser can only see their own OR transferred ones
        if (role === 'MERCHANDISER') {
            whereClause.OR = [
                { current_owner_id: userId },
                { created_by: userId }
            ];
        }

        return prisma.samples.findMany({
            where: whereClause,
            include: {
                buyer: true,
                current_owner: {
                    select: { id: true, name: true, email: true }
                },
                storage_location: true
            },
            orderBy: { updated_at: 'desc' }
        });
    }

    async getSample(id: string) {
        return prisma.samples.findUnique({
            where: { id },
            include: {
                buyer: true,
                creator: { select: { id: true, name: true, email: true } },
                current_owner: { select: { id: true, name: true, email: true } },
                storage_location: true,
                movements: {
                    orderBy: { timestamp: 'desc' },
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            }
        });
    }

    async getSampleMovements(sampleId: string) {
        return prisma.sampleMovements.findMany({
            where: { sample_id: sampleId },
            orderBy: { timestamp: 'desc' },
            include: {
                user: { select: { name: true, email: true, role: true } }
            }
        });
    }

    // 1. Dispatch Receive
    async dispatchReceive(sampleId: string, dispatchUserId: string, rfidEpc: string, sender: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            if (sample.current_status !== 'IN_TRANSIT_TO_DISPATCH') throw new Error('Invalid status transition');

            // Check if tag is available
            const rfidTag = await tx.rfidTags.findUnique({ where: { epc: rfidEpc } });
            if (rfidTag?.status === 'ACTIVE') throw new Error('RFID tag is already active on another sample');

            // Update Sample
            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: {
                    current_status: 'AT_DISPATCH',
                    rfid_epc: rfidEpc
                }
            });

            // Update Tag
            await tx.rfidTags.upsert({
                where: { epc: rfidEpc },
                update: { status: 'ACTIVE', current_sample_id: sampleId, last_assigned_at: new Date() },
                create: { epc: rfidEpc, status: 'ACTIVE', current_sample_id: sampleId, last_assigned_at: new Date() }
            });

            // Log Movement
            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: dispatchUserId,
                    device_id: deviceId,
                    action_type: 'RECEIVED_AT_DISPATCH',
                    previous_status: sample.current_status,
                    new_status: 'AT_DISPATCH',
                    rfid_epc: rfidEpc,
                    notes: `Sender: ${sender}`
                }
            });

            // Notify Merchandiser
            await tx.notifications.create({
                data: {
                    user_id: sample.created_by,
                    sample_id: sampleId,
                    type: 'DISPATCH_RECEIVED',
                    title: 'Sample Received at Dispatch',
                    message: `Sample #${sample.sample_id} has been received at Dispatch.`
                }
            });

            return updated;
        });
    }

    // 2. Merchandiser Receive
    async merchandiserReceive(sampleId: string, merchandiserUserId: string, rfidEpc: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            if (sample.current_status !== 'AT_DISPATCH') throw new Error('Invalid status transition');
            if (sample.rfid_epc !== rfidEpc) throw new Error('Scanned tag does not match this sample');

            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: {
                    current_status: 'WITH_MERCHANDISER',
                    current_owner_id: merchandiserUserId
                }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: merchandiserUserId,
                    device_id: deviceId,
                    action_type: 'RECEIVED_BY_MERCHANDISER',
                    previous_status: sample.current_status,
                    new_status: 'WITH_MERCHANDISER',
                    rfid_epc: rfidEpc
                }
            });

            return updated;
        });
    }

    // 3. Store Sample
    async storeSample(sampleId: string, userId: string, rfidEpc: string, locationId: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            if (sample.current_status !== 'WITH_MERCHANDISER') throw new Error('Invalid status transition');
            if (sample.rfid_epc !== rfidEpc) throw new Error('Scanned tag does not match this sample');

            const loc = await tx.storageLocations.findUnique({ where: { id: locationId } });
            if (!loc) throw new Error('Location not found');
            if (loc.current_count >= loc.max_capacity) throw new Error('This bin is full');

            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: {
                    current_status: 'IN_STORAGE',
                    storage_location_id: locationId
                }
            });

            await tx.storageLocations.update({
                where: { id: locationId },
                data: { current_count: { increment: 1 } }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: userId,
                    device_id: deviceId,
                    action_type: 'STORED',
                    previous_status: sample.current_status,
                    new_status: 'IN_STORAGE',
                    rfid_epc: rfidEpc
                }
            });

            return updated;
        });
    }

    // 4. Dispose Sample
    async disposeSample(sampleId: string, userId: string, rfidEpc: string, reason: string, comment?: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            if (sample.current_status !== 'WITH_MERCHANDISER') throw new Error('Invalid status transition');
            if (sample.rfid_epc !== rfidEpc) throw new Error('Scanned tag does not match this sample');

            // Unlink RFID
            await tx.rfidTags.update({
                where: { epc: rfidEpc },
                data: { status: 'AVAILABLE', current_sample_id: null, last_freed_at: new Date() }
            });

            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: {
                    current_status: 'DISPOSED',
                    is_locked: true,
                    rfid_epc: null
                }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: userId,
                    device_id: deviceId,
                    action_type: 'DISPOSED',
                    previous_status: sample.current_status,
                    new_status: 'DISPOSED',
                    rfid_epc: rfidEpc,
                    notes: `Reason: ${reason}. Comment: ${comment || ''}`
                }
            });

            return updated;
        });
    }

    // 5. Transfer Ownership
    async initiateTransfer(sampleId: string, fromUserId: string, toUserId: string, rfidEpc: string, reason: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            if (sample.current_status !== 'WITH_MERCHANDISER') throw new Error('Invalid status transition');
            if (sample.rfid_epc !== rfidEpc) throw new Error('Scanned tag does not match this sample');
            if (fromUserId === toUserId) throw new Error('Cannot transfer to yourself');

            const transfer = await tx.sampleTransfers.create({
                data: {
                    sample_id: sampleId,
                    from_user_id: fromUserId,
                    to_user_id: toUserId,
                    reason,
                    status: 'PENDING'
                }
            });

            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: { current_status: 'PENDING_TRANSFER_APPROVAL' }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: fromUserId,
                    device_id: deviceId,
                    action_type: 'TRANSFER_INITIATED',
                    previous_status: sample.current_status,
                    new_status: 'PENDING_TRANSFER_APPROVAL',
                    rfid_epc: rfidEpc,
                    notes: `Transfer initiated to user ID: ${toUserId}`
                }
            });

            const fromUser = await tx.users.findUnique({ where: { id: fromUserId } });

            await tx.notifications.create({
                data: {
                    user_id: toUserId,
                    sample_id: sampleId,
                    type: 'TRANSFER_REQUEST',
                    title: 'Transfer Request Initiated',
                    message: `${fromUser?.name || 'A user'} has requested to transfer Sample #${sample.sample_id} to you.`
                }
            });

            return transfer;
        });
    }

    async acceptTransfer(transferId: string, userId: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const transfer = await tx.sampleTransfers.findUnique({ where: { id: transferId }, include: { sample: true } });
            if (!transfer || transfer.status !== 'PENDING') throw new Error('Transfer not pending or not found');
            if (transfer.to_user_id !== userId) throw new Error('Unauthorized');

            await tx.sampleTransfers.update({
                where: { id: transferId },
                data: { status: 'ACCEPTED', resolved_at: new Date() }
            });

            const updated = await tx.samples.update({
                where: { id: transfer.sample_id },
                data: {
                    current_status: 'WITH_MERCHANDISER',
                    current_owner_id: userId
                }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: transfer.sample_id,
                    user_id: userId,
                    device_id: deviceId,
                    action_type: 'TRANSFER_ACCEPTED',
                    previous_status: transfer.sample.current_status,
                    new_status: 'WITH_MERCHANDISER'
                }
            });

            const toUser = await tx.users.findUnique({ where: { id: userId } });

            await tx.notifications.create({
                data: {
                    user_id: transfer.from_user_id,
                    sample_id: transfer.sample_id,
                    type: 'TRANSFER_ACCEPTED',
                    title: 'Transfer Request Accepted',
                    message: `${toUser?.name || 'The recipient'} has accepted the transfer of Sample #${transfer.sample.sample_id}.`
                }
            });

            return updated;
        });
    }

    async rejectTransfer(transferId: string, userId: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const transfer = await tx.sampleTransfers.findUnique({ where: { id: transferId }, include: { sample: true } });
            if (!transfer || transfer.status !== 'PENDING') throw new Error('Transfer not pending or not found');
            if (transfer.to_user_id !== userId) throw new Error('Unauthorized');

            await tx.sampleTransfers.update({
                where: { id: transferId },
                data: { status: 'REJECTED', resolved_at: new Date() }
            });

            const updated = await tx.samples.update({
                where: { id: transfer.sample_id },
                data: {
                    current_status: 'WITH_MERCHANDISER',
                    current_owner_id: transfer.from_user_id // Restore original owner
                }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: transfer.sample_id,
                    user_id: userId,
                    device_id: deviceId,
                    action_type: 'TRANSFER_REJECTED',
                    previous_status: transfer.sample.current_status,
                    new_status: 'WITH_MERCHANDISER'
                }
            });

            const toUser = await tx.users.findUnique({ where: { id: userId } });

            await tx.notifications.create({
                data: {
                    user_id: transfer.from_user_id,
                    sample_id: transfer.sample_id,
                    type: 'TRANSFER_REJECTED',
                    title: 'Transfer Request Rejected',
                    message: `${toUser?.name || 'The recipient'} has rejected the transfer of Sample #${transfer.sample.sample_id}.`
                }
            });

            return updated;
        });
    }
}

export default new SampleLifecycleService();
