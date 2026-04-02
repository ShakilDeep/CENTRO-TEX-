import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Buyers
  const buyerA = await prisma.buyers.upsert({
    where: { name: 'H&M Group' },
    update: {},
    create: { name: 'H&M Group', code: 'HMG01' }
  });
  const buyerB = await prisma.buyers.upsert({
    where: { name: 'Zara International' },
    update: {},
    create: { name: 'Zara International', code: 'ZAR02' }
  });
  const buyerC = await prisma.buyers.upsert({
    where: { name: 'Marks & Spencer' },
    update: {},
    create: { name: 'Marks & Spencer', code: 'MNS03' }
  });
  console.log('Created buyers');

  // 2. Create Storage Locations
  const locA = await prisma.storageLocations.upsert({
    where: { rack_shelf_bin_id: { rack: 'A', shelf: '1', bin_id: 'A1-01' } },
    update: {},
    create: { rack: 'A', shelf: '1', bin_id: 'A1-01', max_capacity: 10, sample_type_affinity: 'Proto' }
  });
  const locB = await prisma.storageLocations.upsert({
    where: { rack_shelf_bin_id: { rack: 'A', shelf: '1', bin_id: 'A1-02' } },
    update: {},
    create: { rack: 'A', shelf: '1', bin_id: 'A1-02', max_capacity: 10, sample_type_affinity: 'Fit' }
  });
  const locC = await prisma.storageLocations.upsert({
    where: { rack_shelf_bin_id: { rack: 'B', shelf: '2', bin_id: 'B2-01' } },
    update: {},
    create: { rack: 'B', shelf: '2', bin_id: 'B2-01', max_capacity: 5, sample_type_affinity: 'PP' }
  });
  await prisma.storageLocations.upsert({
    where: { rack_shelf_bin_id: { rack: 'B', shelf: '3', bin_id: 'B3-01' } },
    update: {},
    create: { rack: 'B', shelf: '3', bin_id: 'B3-01', max_capacity: 8, sample_type_affinity: 'Size Set' }
  });
  console.log('Created storage locations');

  // 3. Create Users
  const password_hash = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.users.upsert({
    where: { email: 'shakil.uddin@gmail.com' },
    update: { role: 'ADMIN', password_hash, is_active: true },
    create: { email: 'shakil.uddin@gmail.com', name: 'System Admin', role: 'ADMIN', password_hash, is_active: true }
  });
  await prisma.users.upsert({
    where: { email: 'dispatcher@centrotex.com' },
    update: { role: 'DISPATCH', password_hash, is_active: true },
    create: { email: 'dispatcher@centrotex.com', name: 'Ali Hasan (Dispatch)', role: 'DISPATCH', password_hash, is_active: true }
  });
  const merch1 = await prisma.users.upsert({
    where: { email: 'merchandiser@centrotex.com' },
    update: { role: 'MERCHANDISER', password_hash, is_active: true },
    create: { email: 'merchandiser@centrotex.com', name: 'Rina Sultana', role: 'MERCHANDISER', password_hash, is_active: true }
  });
  const merch2 = await prisma.users.upsert({
    where: { email: 'merch2@centrotex.com' },
    update: { role: 'MERCHANDISER', password_hash, is_active: true },
    create: { email: 'merch2@centrotex.com', name: 'Karim Uddin', role: 'MERCHANDISER', password_hash, is_active: true }
  });
  console.log('Created users');

  // 4. Create dummy RFID tags
  const tags = ['EPC-001', 'EPC-002', 'EPC-003', 'EPC-004', 'EPC-005', 'EPC-006', 'EPC-007', 'EPC-008'];
  for (const epc of tags) {
    await prisma.rfidTags.upsert({
      where: { epc },
      update: {},
      create: { epc, status: 'AVAILABLE' }
    });
  }
  console.log('Created dummy RFID tags');

  // 5. Create samples covering all lifecycle states

  // 5a. IN_STORAGE samples (for Storage View tab)
  const sample1 = await prisma.samples.upsert({
    where: { sample_id: 'SMP-20240327-0001' },
    update: {},
    create: {
      sample_id: 'SMP-20240327-0001',
      buyer_id: buyerA.id,
      sample_type: 'Proto',
      description: "Men's Cotton T-Shirt V2 - Collar Sample",
      created_by: admin.id,
      current_owner_id: merch1.id,
      current_status: 'IN_STORAGE',
      rfid_epc: 'EPC-001',
      storage_location_id: locA.id
    }
  });

  const sample2 = await prisma.samples.upsert({
    where: { sample_id: 'SMP-20240327-0002' },
    update: {},
    create: {
      sample_id: 'SMP-20240327-0002',
      buyer_id: buyerB.id,
      sample_type: 'Fit',
      description: 'Ladies Denim Jacket - Fit Sample',
      created_by: merch1.id,
      current_owner_id: merch1.id,
      current_status: 'IN_STORAGE',
      rfid_epc: 'EPC-002',
      storage_location_id: locB.id
    }
  });

  const sample3 = await prisma.samples.upsert({
    where: { sample_id: 'SMP-20240328-0003' },
    update: {},
    create: {
      sample_id: 'SMP-20240328-0003',
      buyer_id: buyerC.id,
      sample_type: 'PP',
      description: 'Kids Hooded Sweatshirt - PP Sample',
      created_by: admin.id,
      current_owner_id: admin.id,
      current_status: 'IN_STORAGE',
      rfid_epc: 'EPC-003',
      storage_location_id: locC.id
    }
  });

  // 5b. IN_TRANSIT_TO_DISPATCH samples (for Dispatch Queue tab)
  await prisma.samples.upsert({
    where: { sample_id: 'SMP-20240329-0004' },
    update: {},
    create: {
      sample_id: 'SMP-20240329-0004',
      buyer_id: buyerA.id,
      sample_type: 'Size Set',
      description: "Men's Polo Shirt - Size Set S/M/L/XL",
      created_by: merch1.id,
      current_owner_id: merch1.id,
      current_status: 'IN_TRANSIT_TO_DISPATCH'
    }
  });

  await prisma.samples.upsert({
    where: { sample_id: 'SMP-20240329-0005' },
    update: {},
    create: {
      sample_id: 'SMP-20240329-0005',
      buyer_id: buyerB.id,
      sample_type: 'Shipment',
      description: 'Ladies Formal Blouse - Final Shipment Sample',
      created_by: merch2.id,
      current_owner_id: merch2.id,
      current_status: 'IN_TRANSIT_TO_DISPATCH'
    }
  });

  // 5c. WITH_MERCHANDISER samples (for Dashboard tab)
  await prisma.samples.upsert({
    where: { sample_id: 'SMP-20240330-0006' },
    update: {},
    create: {
      sample_id: 'SMP-20240330-0006',
      buyer_id: buyerC.id,
      sample_type: 'Proto',
      description: 'Boys Cargo Pants Prototype',
      created_by: merch2.id,
      current_owner_id: merch2.id,
      current_status: 'WITH_MERCHANDISER',
      rfid_epc: 'EPC-004'
    }
  });

  // Update RFID tag statuses for ACTIVE samples
  await prisma.rfidTags.update({ where: { epc: 'EPC-001' }, data: { status: 'ACTIVE', current_sample_id: sample1.id } });
  await prisma.rfidTags.update({ where: { epc: 'EPC-002' }, data: { status: 'ACTIVE', current_sample_id: sample2.id } });
  await prisma.rfidTags.update({ where: { epc: 'EPC-003' }, data: { status: 'ACTIVE', current_sample_id: sample3.id } });

  // Update storage location counts
  await prisma.storageLocations.update({ where: { id: locA.id }, data: { current_count: 1 } });
  await prisma.storageLocations.update({ where: { id: locB.id }, data: { current_count: 1 } });
  await prisma.storageLocations.update({ where: { id: locC.id }, data: { current_count: 1 } });

  console.log('Created all samples with correct lifecycle statuses');

  console.log('\n=== SEED SUMMARY ===');
  console.log(`Admin User Email: shakil.uddin@gmail.com`);
  console.log(`Admin User ID:    ${admin.id}`);
  console.log('Password for all users: Admin@123');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
