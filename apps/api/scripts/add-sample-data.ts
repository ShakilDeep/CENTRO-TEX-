import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleData = [
  {
    sample_id: 'UK-PPS-001',
    sample_type: 'PPS',
    description: 'Pre-production sample for Spring 2024 collection',
  },
  {
    sample_id: 'UK-FAB-001', 
    sample_type: 'Fabric Swatch',
    description: 'Cotton blend fabric sample for summer line',
  },
  {
    sample_id: 'UK-PRD-001',
    sample_type: 'Production',
    description: 'Production sample for quality assessment',
  },
  {
    sample_id: 'UK-FIN-001',
    sample_type: 'Finished Goods',
    description: 'Final product sample for client approval',
  }
];

async function addSampleData() {
  try {
    // First, get or create a default location
    let location = await prisma.locations.findFirst({
      where: { name: 'Main Showroom UK' }
    });

    if (!location) {
      location = await prisma.locations.create({
        data: {
          name: 'Main Showroom UK',
          type: 'INTERNAL',
          description: 'Primary showroom location in the UK',
          is_active: true
        }
      });
    }

    // Create samples
    for (const sample of sampleData) {
      const result = await prisma.samples.create({
        data: {
          ...sample,
          location_id: location.id,
        },
        include: {
          location: true,
          checkout_user: true
        }
      });

      // Create inventory entry for each sample
      await prisma.inventory.create({
        data: {
          sample_id: result.id,
          quantity: 1.0,
          unit: 'piece',
          status: 'CHECKED_IN'
        }
      });

      console.log(`Created sample: ${result.sample_id} - ${result.description}`);
    }

    console.log('\n✅ Sample data added successfully!');
    console.log(`📍 Location: ${location.name}`);
    console.log(`📦 Samples created: ${sampleData.length}`);
    
  } catch (error) {
    console.error('Error adding sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleData();