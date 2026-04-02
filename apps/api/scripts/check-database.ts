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
        buyer: true,
        storage_location: true
      }
    });
    
    console.log('\nSamples in database:');
    samples.forEach(sample => {
      console.log(`- ${sample.sample_id}: ${sample.sample_type} (${sample.description})`);
      console.log(`  Buyer: ${sample.buyer?.name || 'N/A'}`);
      console.log(`  Location: ${sample.storage_location ? `${sample.storage_location.rack}-${sample.storage_location.shelf}-${sample.storage_location.bin_id}` : 'N/A'}`);
    });
    
    // Check StorageLocations
    const locationsCount = await prisma.storageLocations.count();
    console.log(`\nTotal storage locations: ${locationsCount}`);
    
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
