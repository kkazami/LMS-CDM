const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Find ICS institute
  const institute = await prisma.institute.findUnique({
    where: { code: 'ics' }
  });

  if (!institute) {
    console.error("ICS institute not found. Cannot create users.");
    return;
  }

  const prof = await prisma.user.upsert({
    where: { email: 'prof@ics.edu' },
    update: {},
    create: {
      name: 'Professor Smith',
      email: 'prof@ics.edu',
      password: passwordHash,
      role: 'PROFESSOR',
      instituteId: institute.id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ics.edu' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@ics.edu',
      password: passwordHash,
      role: 'ADMIN',
      instituteId: institute.id,
    },
  });

  console.log("Created Professor:", prof.email);
  console.log("Created Admin:", admin.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
