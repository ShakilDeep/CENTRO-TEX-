import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 'cmm3swdvq00025gbj3iow7gti';
  
  console.log(`Checking for user ID: ${userId}`);
  
  const user = await prisma.users.findUnique({
    where: { id: userId }
  });
  
  if (user) {
    console.log('\n✅ User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Office: ${user.office}`);
    console.log(`  Role: ${user.role}`);
  } else {
    console.log('\n❌ User NOT found');
    console.log('\nLet me list all users:');
    
    const allUsers = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        office: true,
        role: true
      }
    });
    
    console.log(`\nTotal users: ${allUsers.length}\n`);
    allUsers.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (${u.email})`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Office: ${u.office}, Role: ${u.role}\n`);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
