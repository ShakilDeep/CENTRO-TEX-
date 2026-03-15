import { prisma } from '../lib/prisma';

class SampleIdService {
  /**
   * Generates a unique sample ID in the format SMP-YYYYMMDD-XXXX
   * XXXX is a 4-digit zero-padded sequence that resets daily.
   */
  async generateSampleId(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const prefix = `SMP-${dateStr}-`;

    // Find the latest sample for today across the entire system
    const latestSample = await prisma.samples.findFirst({
      where: {
        sample_id: {
          startsWith: prefix
        }
      },
      orderBy: {
        sample_id: 'desc'
      }
    });

    let sequence = 1;

    if (latestSample) {
      // Extract the sequence number from the last ID
      const parts = latestSample.sample_id.split('-');
      if (parts.length === 3) {
        const lastSequenceStr = parts[2];
        const lastSequence = parseInt(lastSequenceStr, 10);

        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    // Format to 4-digit padded string (e.g., "0042")
    const paddedSequence = sequence.toString().padStart(4, '0');

    return `${prefix}${paddedSequence}`;
  }

  /**
   * Validates if a format string matches the expected SMP-YYYYMMDD-XXXX pattern
   */
  isValidFormat(sampleId: string): boolean {
    const pattern = /^SMP-\d{8}-\d{4}$/;
    return pattern.test(sampleId);
  }
}

export default new SampleIdService();
