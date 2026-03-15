import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Buyers
  const buyers = await Promise.all([
    prisma.buyers.upsert({
      where: { name: 'Buyer A' },
      update: {},
      create: { name: 'Buyer A', code: 'BA01' }
    }),
    prisma.buyers.upsert({
      where: { name: 'Buyer B' },
      update: {},
      create: { name: 'Buyer B', code: 'BB02' }
    })
  ]);
  console.log('Created buyers');

  // 2. Create Storage Locations
  const locations = [
    { rack: 'A', shelf: '1', bin_id: 'A1-01', max_capacity: 10, sample_type_affinity: 'Proto' },
    { rack: 'A', shelf: '1', bin_id: 'A1-02', max_capacity: 10, sample_type_affinity: 'Fit' },
    { rack: 'B', shelf: '2', bin_id: 'B2-01', max_capacity: 5, sample_type_affinity: 'PP' }
  ];

  for (const loc of locations) {
    await prisma.storageLocations.upsert({
      where: { rack_shelf_bin_id: { rack: loc.rack, shelf: loc.shelf, bin_id: loc.bin_id } },
      update: {},
      create: loc
    });
  }
  console.log('Created storage locations');

  // 3. Create Users
  const password_hash = await bcrypt.hash('Admin@123', 10);

  const users = [
    { email: 'admin@centrotex.com', name: 'System Admin', role: 'ADMIN', password_hash },
    { email: 'dispatcher@centrotex.com', name: 'Dispatch User', role: 'DISPATCH', password_hash },
    { email: 'merchandiser@centrotex.com', name: 'Merchandiser One', role: 'MERCHANDISER', password_hash }
  ];

  for (const user of users) {
    await prisma.users.upsert({
      where: { email: user.email },
      update: { role: user.role, password_hash: user.password_hash },
      create: user
    });
  }
  console.log('Created users');

  // 4. Create dummy RFID tags
  const tags = ['EPC-001', 'EPC-002', 'EPC-003', 'EPC-004', 'EPC-005'];
  for (const epc of tags) {
    await prisma.rfidTags.upsert({
      where: { epc },
      update: {},
      create: { epc, status: 'AVAILABLE' }
    });
  }
  console.log('Created dummy RFID tags');

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
