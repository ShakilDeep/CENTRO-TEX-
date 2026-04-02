import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.users.findMany({ select: { id: true, email: true, role: true } });
  const buyers = await prisma.buyers.findMany({ select: { id: true, name: true } });
  console.log('USERS:', JSON.stringify(users, null, 2));
  console.log('BUYERS:', JSON.stringify(buyers, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
