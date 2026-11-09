// Add the nullable identity column without accepting a broad data-loss flag.
// Existing installations use db push; fresh installations create User afterward.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const [table] = await prisma.$queryRaw`SELECT to_regclass('public."User"')::text AS name`;
  if (!table.name) return;
  await prisma.$transaction([
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firebaseUid" TEXT`,
    prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "User_firebaseUid_key" ON "User"("firebaseUid")`,
  ]);
  console.log('Firebase identity column ready; existing accounts preserved.');
})().catch(() => { console.error('Could not prepare authentication schema.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
