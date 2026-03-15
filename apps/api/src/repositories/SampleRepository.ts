import { PrismaClient, Samples } from '@prisma/client';
import { BaseRepository } from './base/BaseRepository';

export interface SampleWithRelations extends Samples {
  buyer?: any;
  current_owner?: any;
  rfid_tag?: any;
  storage_location?: any;
}

/**
 * Sample Repository
 * Handles all sample-related database operations
 */
export class SampleRepository extends BaseRepository<Samples> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'samples');
  }

  /**
   * Find samples with all relations
   */
  async findAllWithRelations(): Promise<SampleWithRelations[]> {
    return await this.model.findMany({
      include: {
        buyer: true,
        current_owner: true,
        rfid_tag: true,
        storage_location: true,
        movements: {
          take: 5,
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Find samples by status
   */
  async findByStatus(status: string): Promise<Samples[]> {
    return await this.model.findMany({
      where: { current_status: status },
      include: {
        buyer: true,
        current_owner: true
      }
    });
  }

  /**
   * Find samples by buyer
   */
  async findByBuyer(buyerId: string): Promise<Samples[]> {
    return await this.model.findMany({
      where: { buyer_id: buyerId },
      include: {
        buyer: true,
        current_owner: true,
        storage_location: true
      }
    });
  }

  /**
   * Find samples assigned to a specific user
   */
  async findByOwner(ownerId: string): Promise<Samples[]> {
    return await this.model.findMany({
      where: { current_owner_id: ownerId },
      include: {
        buyer: true,
        storage_location: true
      }
    });
  }

  /**
   * Get samples pending at dispatch
   */
  async getPendingDispatch(): Promise<SampleWithRelations[]> {
    return await this.model.findMany({
      where: {
        current_status: 'IN_TRANSIT_TO_DISPATCH'
      },
      include: {
        buyer: true,
        creator: true,
        current_owner: true
      },
      orderBy: { created_at: 'asc' }
    });
  }

  /**
   * Get overdue samples
   */
  async getOverdueSamples(hoursOverdue: number = 48): Promise<Samples[]> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - hoursOverdue);

    return await this.model.findMany({
      where: {
        current_status: 'AT_STATION',
        updated_at: {
          lt: threshold
        }
      },
      include: {
        current_owner: true,
        buyer: true
      }
    });
  }

  /**
   * Update sample status with audit trail
   */
  async updateStatusWithAudit(
    sampleId: string,
    newStatus: string,
    userId: string,
    notes?: string
  ): Promise<Samples> {
    return await this.transaction(async (tx) => {
      // Get current sample state
      const currentSample = await tx.samples.findUniqueOrThrow({
        where: { id: sampleId }
      });

      // Update sample status
      const updatedSample = await tx.samples.update({
        where: { id: sampleId },
        data: {
          current_status: newStatus,
          updated_at: new Date()
        }
      });

      // Create movement record
      await tx.sampleMovements.create({
        data: {
          sample_id: sampleId,
          user_id: userId,
          action_type: 'STATUS_CHANGE',
          previous_status: currentSample.current_status,
          new_status: newStatus,
          notes,
          timestamp: new Date()
        }
      });

      return updatedSample;
    });
  }

  /**
   * Assign RFID tag to sample
   */
  async assignRfidTag(
    sampleId: string,
    rfidEpc: string,
    userId: string
  ): Promise<Samples> {
    return await this.transaction(async (tx) => {
      // Check if RFID tag is available
      const tag = await tx.rfidTags.findUnique({
        where: { epc: rfidEpc }
      });

      if (!tag || tag.status !== 'AVAILABLE') {
        throw new Error('RFID tag is not available');
      }

      // Update sample with RFID
      const updatedSample = await tx.samples.update({
        where: { id: sampleId },
        data: { rfid_epc: rfidEpc }
      });

      // Update RFID tag status
      await tx.rfidTags.update({
        where: { epc: rfidEpc },
        data: {
          status: 'ACTIVE',
          current_sample_id: sampleId,
          last_assigned_at: new Date()
        }
      });

      // Create movement record
      await tx.sampleMovements.create({
        data: {
          sample_id: sampleId,
          user_id: userId,
          action_type: 'RFID_ASSIGNED',
          previous_status: updatedSample.current_status,
          new_status: updatedSample.current_status,
          rfid_epc: rfidEpc,
          timestamp: new Date()
        }
      });

      return updatedSample;
    });
  }

  /**
   * Generate next sample ID
   */
  async generateSampleId(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `SMP-${year}${month}${day}`;

    const count = await this.model.count({
      where: {
        sample_id: {
          startsWith: prefix
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }
}