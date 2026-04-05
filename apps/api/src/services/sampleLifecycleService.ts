import { prisma } from '../lib/prisma';
import sampleIdService from './sampleIdService';

export class SampleLifecycleService {
    /**
     * Generates sample, sets initial status to IN_TRANSIT_TO_DISPATCH
     */
    async createSample(data: {
        buyer_id?: string;
        sample_type: string;
        description: string;
        photo_url?: string;
        sender_origin?: string;
        receiver_name?: string;
        purpose?: string;
        created_by: string; // User ID
        device_id?: string;
    }) {
        const nextSampleId = await sampleIdService.generateSampleId();
        const nextEntryNumber = await sampleIdService.generateEntryNumber();

        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.create({
                data: {
                    sample_id: nextSampleId,
                    entry_number: nextEntryNumber,
                    buyer_id: data.buyer_id || '',
                    sample_type: data.sample_type,
                    description: data.description,
                    sender_origin: data.sender_origin,
                    receiver_name: data.receiver_name,
                    purpose: data.purpose,
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
    async dispatchReceive(sampleId: string, dispatchUserId: string, rfidEpc: string | undefined, sender: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            if (sample.current_status !== 'IN_TRANSIT_TO_DISPATCH') throw new Error('Invalid status transition');

            // If RFID EPC is provided, validate and update
            if (rfidEpc) {
                const rfidTag = await tx.rfidTags.findUnique({ where: { epc: rfidEpc } });
                if (rfidTag?.status === 'ACTIVE' && rfidTag.current_sample_id !== sampleId) {
                    throw new Error('RFID tag is already active on another sample');
                }

                await tx.rfidTags.upsert({
                    where: { epc: rfidEpc },
                    update: { status: 'ACTIVE', current_sample_id: sampleId, last_assigned_at: new Date() },
                    create: { epc: rfidEpc, status: 'ACTIVE', current_sample_id: sampleId, last_assigned_at: new Date() }
                });
            }

            // Update Sample
            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: {
                    current_status: 'AT_DISPATCH',
                    ...(rfidEpc ? { rfid_epc: rfidEpc } : {})
                }
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
                    rfid_epc: rfidEpc || sample.rfid_epc,
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

    // 1.5 Encode RFID — supports hot-swap (re-assigning a tag from one sample to another)
    async encodeRfid(sampleId: string, userId: string, rfidEpc: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');

            const rfidTag = await tx.rfidTags.findUnique({ where: { epc: rfidEpc } });

            // Hot-swap: if the tag is active on a different sample, unlink it first
            if (rfidTag?.status === 'ACTIVE' && rfidTag.current_sample_id && rfidTag.current_sample_id !== sampleId) {
                const oldSample = await tx.samples.findUnique({ where: { id: rfidTag.current_sample_id } });

                await tx.samples.update({
                    where: { id: rfidTag.current_sample_id },
                    data: { rfid_epc: null }
                });

                if (oldSample) {
                    await tx.sampleMovements.create({
                        data: {
                            sample_id: rfidTag.current_sample_id,
                            user_id: userId,
                            device_id: deviceId,
                            action_type: 'RFID_UNLINKED',
                            previous_status: oldSample.current_status,
                            new_status: oldSample.current_status,
                            rfid_epc: rfidEpc,
                            notes: `Tag hot-swapped to ${sample.sample_id}`
                        }
                    });
                }
            }

            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: { rfid_epc: rfidEpc }
            });

            await tx.rfidTags.upsert({
                where: { epc: rfidEpc },
                update: { status: 'ACTIVE', current_sample_id: sampleId, last_assigned_at: new Date() },
                create: { epc: rfidEpc, status: 'ACTIVE', current_sample_id: sampleId, last_assigned_at: new Date() }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: userId,
                    device_id: deviceId,
                    action_type: 'RFID_ENCODED',
                    previous_status: sample.current_status,
                    new_status: sample.current_status,
                    rfid_epc: rfidEpc,
                    notes: rfidTag?.current_sample_id && rfidTag.current_sample_id !== sampleId
                        ? `Tag hot-swapped from another sample`
                        : 'RFID tag encoded manually'
                }
            });

            return updated;
        });
    }

    // 2. Merchandiser Receive
    async merchandiserReceive(sampleId: string, merchandiserUserId: string, rfidEpc: string | undefined, deviceId?: string) {
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
                    rfid_epc: rfidEpc || sample.rfid_epc
                }
            });

            return updated;
        });
    }

    // 3. Store Sample (at bin)
    async storeSample(sampleId: string, userId: string, rfidEpc: string | undefined, locationId: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            
            // Allow storing from any active (non-terminal) status
            const allowed = ['IN_TRANSIT_TO_DISPATCH', 'WITH_MERCHANDISER', 'AT_DISPATCH', 'IN_STORAGE'];
            if (!allowed.includes(sample.current_status)) throw new Error(`Invalid status for storage: ${sample.current_status}`);
            
            if (sample.rfid_epc && rfidEpc && sample.rfid_epc !== rfidEpc) throw new Error('Scanned tag does not match this sample');

            // If Relocating, decrement old bin count
            if (sample.current_status === 'IN_STORAGE' && sample.storage_location_id) {
                await tx.storageLocations.update({
                    where: { id: sample.storage_location_id },
                    data: { current_count: { decrement: 1 } }
                });
            }

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
                    rfid_epc: rfidEpc || sample.rfid_epc
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
    async initiateTransfer(sampleId: string, fromUserId: string, toUserId: string, rfidEpc: string | undefined, reason: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');
            const transferableStatuses = ['IN_TRANSIT_TO_DISPATCH', 'AT_DISPATCH', 'WITH_MERCHANDISER', 'IN_STORAGE'];
            if (!transferableStatuses.includes(sample.current_status)) throw new Error('Invalid status transition');
            // Only validate RFID when BOTH the sample has a tag AND the caller provides one
            if (sample.rfid_epc && rfidEpc && sample.rfid_epc !== rfidEpc) throw new Error('Scanned tag does not match this sample');
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
                    rfid_epc: rfidEpc || sample.rfid_epc,
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

            // Fetch the acting user to check role — Admin can accept any transfer
            const actingUser = await tx.users.findUnique({ where: { id: userId }, select: { role: true } });
            if (actingUser?.role !== 'ADMIN' && transfer.to_user_id !== userId) {
                throw new Error('Unauthorized');
            }

            // Resolve as the actual recipient (not the admin acting on their behalf)
            const effectiveRecipientId = transfer.to_user_id;

            await tx.sampleTransfers.update({
                where: { id: transferId },
                data: { status: 'ACCEPTED', resolved_at: new Date() }
            });

            const updated = await tx.samples.update({
                where: { id: transfer.sample_id },
                data: {
                    current_status: 'WITH_MERCHANDISER',
                    current_owner_id: effectiveRecipientId,
                    storage_location_id: null
                }
            });

            // Decrement bin count if it was in storage
            if (transfer.sample.current_status === 'IN_STORAGE' && transfer.sample.storage_location_id) {
                await tx.storageLocations.update({
                    where: { id: transfer.sample.storage_location_id },
                    data: { current_count: { decrement: 1 } }
                });
            }

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

            const toUser = await tx.users.findUnique({ where: { id: effectiveRecipientId } });

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

            // Admin can reject any transfer; non-admin must be the designated recipient
            const actingUser = await tx.users.findUnique({ where: { id: userId }, select: { role: true } });
            if (actingUser?.role !== 'ADMIN' && transfer.to_user_id !== userId) {
                throw new Error('Unauthorized');
            }

            await tx.sampleTransfers.update({
                where: { id: transferId },
                data: { status: 'REJECTED', resolved_at: new Date() }
            });

            const updated = await tx.samples.update({
                where: { id: transfer.sample_id },
                data: {
                    current_status: 'WITH_MERCHANDISER',
                    current_owner_id: transfer.from_user_id
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

            const toUser = await tx.users.findUnique({ where: { id: transfer.to_user_id } });

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

    /**
     * Pull Request Transfer — A requester (Locator/Merchandiser) signals they want a sample.
     * Creates a transfer FROM the current owner TO the requester.
     * The current owner will see this in their 'outgoing-pending' list and must confirm.
     */
    async pullRequestTransfer(sampleId: string, requesterId: string, reason: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({
                where: { id: sampleId },
                include: { current_owner: { select: { id: true, name: true } } }
            });
            if (!sample) throw new Error('Sample not found');
            if (!sample.current_owner_id) throw new Error('Sample has no current owner');
            // Note: In demo mode, the backend always injects the admin user, so we do NOT
            // block self-requests — the flow still works end-to-end for demonstration.
            if (sample.current_status !== 'WITH_MERCHANDISER' && sample.current_status !== 'AT_DISPATCH') {
                throw new Error('Sample is not available for pull request (must be WITH_MERCHANDISER or AT_DISPATCH)');
            }

            // Check for duplicate pending pull request
            const existingRequest = await tx.sampleTransfers.findFirst({
                where: {
                    sample_id: sampleId,
                    to_user_id: requesterId,
                    status: 'PENDING'
                }
            });
            if (existingRequest) throw new Error('A pull request for this sample is already pending');

            // Create transfer FROM owner TO requester — owner must confirm
            const transfer = await tx.sampleTransfers.create({
                data: {
                    sample_id: sampleId,
                    from_user_id: sample.current_owner_id,
                    to_user_id: requesterId,
                    reason,
                    status: 'PENDING'
                }
            });

            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: requesterId,
                    device_id: deviceId,
                    action_type: 'TRANSFER_INITIATED',
                    previous_status: sample.current_status,
                    new_status: sample.current_status,
                    notes: `Pull request from user ID: ${requesterId} — awaiting owner confirmation`
                }
            });

            // Notify the current owner about the pull request
            const requester = await tx.users.findUnique({ where: { id: requesterId } });
            await tx.notifications.create({
                data: {
                    user_id: sample.current_owner_id,
                    sample_id: sampleId,
                    type: 'TRANSFER_REQUEST',
                    title: 'Sample Pull Request',
                    message: `${requester?.name || 'A user'} is requesting Sample #${sample.sample_id} from you. Please confirm if received.`
                }
            });

            return transfer;
        });
    }

    /**
     * Confirm Handover — The OWNER confirms (Yes) or declines (No) a pull request.
     * This is the "Received — Yes or No?" action in the Merchandiser journey.
     * confirmed=true  → transfer accepted, ownership moves to requester
     * confirmed=false → transfer rejected, sample stays with owner
     */
    async confirmHandover(transferId: string, ownerId: string, confirmed: boolean, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const transfer = await tx.sampleTransfers.findUnique({
                where: { id: transferId },
                include: { sample: true, to_user: { select: { id: true, name: true } } }
            });
            if (!transfer) throw new Error('Transfer not found');
            if (transfer.status !== 'PENDING') throw new Error('Transfer is no longer pending');

            // Admin can confirm/decline any handover on behalf of the owner
            const actingUser = await tx.users.findUnique({ where: { id: ownerId }, select: { role: true } });
            if (actingUser?.role !== 'ADMIN' && transfer.from_user_id !== ownerId) {
                throw new Error('Only the sample owner can confirm this handover');
            }

            if (confirmed) {
                await tx.sampleTransfers.update({
                    where: { id: transferId },
                    data: { status: 'ACCEPTED', resolved_at: new Date() }
                });

                const updated = await tx.samples.update({
                    where: { id: transfer.sample_id },
                    data: {
                        current_status: 'WITH_MERCHANDISER',
                        current_owner_id: transfer.to_user_id,
                        storage_location_id: null // Remove from bin upon transfer acceptance
                    }
                });

                // Decrement bin count if it was in storage
                if (transfer.sample.current_status === 'IN_STORAGE' && transfer.sample.storage_location_id) {
                    await tx.storageLocations.update({
                        where: { id: transfer.sample.storage_location_id },
                        data: { current_count: { decrement: 1 } }
                    });
                }

                await tx.sampleMovements.create({
                    data: {
                        sample_id: transfer.sample_id,
                        user_id: ownerId,
                        device_id: deviceId,
                        action_type: 'TRANSFER_ACCEPTED',
                        previous_status: transfer.sample.current_status,
                        new_status: 'WITH_MERCHANDISER',
                        notes: `Handover confirmed by owner. Sample transferred to ${transfer.to_user?.name || transfer.to_user_id}`
                    }
                });

                await tx.notifications.create({
                    data: {
                        user_id: transfer.to_user_id,
                        sample_id: transfer.sample_id,
                        type: 'TRANSFER_ACCEPTED',
                        title: 'Pull Request Confirmed!',
                        message: `Your request for Sample #${transfer.sample.sample_id} has been confirmed. It is now in your possession.`
                    }
                });

                return updated;
            } else {
                await tx.sampleTransfers.update({
                    where: { id: transferId },
                    data: { status: 'REJECTED', resolved_at: new Date() }
                });

                await tx.sampleMovements.create({
                    data: {
                        sample_id: transfer.sample_id,
                        user_id: ownerId,
                        device_id: deviceId,
                        action_type: 'TRANSFER_REJECTED',
                        previous_status: transfer.sample.current_status,
                        new_status: transfer.sample.current_status,
                        notes: `Handover declined by owner`
                    }
                });

                await tx.notifications.create({
                    data: {
                        user_id: transfer.to_user_id,
                        sample_id: transfer.sample_id,
                        type: 'TRANSFER_REJECTED',
                        title: 'Pull Request Declined',
                        message: `The owner declined your request for Sample #${transfer.sample.sample_id}.`
                    }
                });

                return transfer.sample;
            }
        });
    }

    /**
     * Pick Sample — Direct self-assignment.
     * Used by the Sample Locator's "Assign to Me" button.
     * Moves the sample directly to the requesting user without a two-step transfer approval.
     * Works for samples IN_STORAGE, AT_DISPATCH, or WITH_MERCHANDISER.
     */
    async pickSample(sampleId: string, requesterId: string, deviceId?: string) {
        return prisma.$transaction(async (tx) => {
            const sample = await tx.samples.findUnique({ where: { id: sampleId } });
            if (!sample) throw new Error('Sample not found');

            const allowedStatuses = ['IN_STORAGE', 'AT_DISPATCH', 'WITH_MERCHANDISER'];
            if (!allowedStatuses.includes(sample.current_status)) {
                throw new Error(`Cannot pick sample with status: ${sample.current_status}`);
            }

            const updated = await tx.samples.update({
                where: { id: sampleId },
                data: {
                    current_status: 'WITH_MERCHANDISER',
                    current_owner_id: requesterId,
                    storage_location_id: null // Remove from bin if stored
                }
            });

            // Decrement bin count if it was in storage
            if (sample.current_status === 'IN_STORAGE' && sample.storage_location_id) {
                await tx.storageLocations.update({
                    where: { id: sample.storage_location_id },
                    data: { current_count: { decrement: 1 } }
                });
            }

            await tx.sampleMovements.create({
                data: {
                    sample_id: sampleId,
                    user_id: requesterId,
                    device_id: deviceId,
                    action_type: 'TRANSFER_ACCEPTED',
                    previous_status: sample.current_status,
                    new_status: 'WITH_MERCHANDISER',
                    notes: 'Direct self-assignment via Sample Locator'
                }
            });

            return updated;
        });
    }
}

export default new SampleLifecycleService();
