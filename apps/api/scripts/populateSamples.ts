import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSamples() {
  try {
    // Get admin user and main location
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@centrotex.com' }
    });

    const mainLocation = await prisma.locations.findFirst({
      where: { name: 'Main Showroom UK' }
    });

    if (!adminUser || !mainLocation) {
      console.error('Admin user or main location not found');
      console.log('AdminUser:', adminUser);
      console.log('MainLocation:', mainLocation);
      return;
    }

    const sampleData = [
      {
        sample_id: 'UK-2024-001',
        sample_type: 'FABRIC',
        description: 'Cotton blend sample - Spring collection',
        reference: 'SKU-001'
      },
      {
        sample_id: 'UK-2024-002',
        sample_type: 'THREAD',
        description: 'Polyester thread - Standard quality',
        reference: 'SKU-002'
      },
      {
        sample_id: 'UK-2024-003',
        sample_type: 'BUTTON',
        description: 'Mother of pearl buttons - Premium',
        reference: 'SKU-003'
      },
      {
        sample_id: 'BD-2024-001',
        sample_type: 'DENIM',
        description: 'Indigo dyed denim - twill weave',
        reference: 'SKU-004'
      },
      {
        sample_id: 'BD-2024-002',
        sample_type: 'ZIPPER',
        description: 'Metal zipper - Heavy duty',
        reference: 'SKU-005'
      }
    ];

    for (const sample of sampleData) {
      const existing = await prisma.samples.findUnique({
        where: { sample_id: sample.sample_id }
      });

      if (!existing) {
        const newSample = await prisma.samples.create({
          data: {
            sample_id: sample.sample_id,
            sample_type: sample.sample_type,
            description: sample.description,
            reference: sample.reference,
            location_id: mainLocation.id
          }
        });

        // Create corresponding inventory record using the actual sample ID (UUID)
        await prisma.inventory.create({
          data: {
            sample_id: newSample.id,
            quantity: 1,
            unit: 'ea',
            status: 'CHECKED_IN'
          }
        });

        console.log(`Created sample: ${sample.sample_id}`);
      } else {
        console.log(`Sample ${sample.sample_id} already exists`);
      }
    }

    console.log('Sample creation completed');
  } catch (error) {
    console.error('Error creating samples:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSamples();

