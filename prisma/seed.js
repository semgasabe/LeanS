const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    console.log(`[Seed] Created tenant id=${tenant.id}`);
  }

  const email = (process.env.SEED_ADMIN_EMAIL || 'sabina.serzhan@narxoz.kz').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123';
  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      emailVerified: true,
      password: hashed,
      role: 'ADMIN',
      name: 'Sabina Admin',
      verificationToken: null,
      verificationExpires: null,
    },
    create: {
      email,
      password: hashed,
      name: 'Sabina Admin',
      role: 'ADMIN',
      tenantId: tenant.id,
      emailVerified: true,
    },
  });

  console.log(`[Seed] Main ADMIN: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error('[Seed] Failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
