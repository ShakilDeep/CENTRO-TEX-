import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking database connection...');
    
    // Check samples count
    const samplesCount = await prisma.samples.count();
    console.log(`Total samples in database: ${samplesCount}`);
    
    // Get all samples
    const samples = await prisma.samples.findMany({
      take: 10,
      include: {
        location: true,
        inventory: true
      }
    });
    
    console.log('\nSamples in database:');
    samples.forEach(sample => {
      console.log(`- ${sample.sample_id}: ${sample.sample_type} (${sample.description})`);
      console.log(`  Location: ${sample.location?.name || 'N/A'}`);
      console.log(`  Status: ${sample.inventory?.[0]?.status || 'N/A'}`);
    });
    
    // Check locations
    const locationsCount = await prisma.locations.count();
    console.log(`\nTotal locations: ${locationsCount}`);
    
    // Check users
    const usersCount = await prisma.users.count();
    console.log(`Total users: ${usersCount}`);
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
