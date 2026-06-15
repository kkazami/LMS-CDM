const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Institute if it doesn't exist
  let institute = await db.institute.upsert({
    where: { code: "ics" },
    update: {},
    create: {
      code: "ics",
      name: "Institute of Computer Studies",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  // Student
  await db.user.upsert({
    where: { email: "student@ics.edu" },
    update: { role: "STUDENT" },
    create: {
      name: "Alice Student",
      email: "student@ics.edu",
      password: passwordHash,
      role: "STUDENT",
      instituteId: institute.id,
    },
  });

  // Professor
  await db.user.upsert({
    where: { email: "professor@ics.edu" },
    update: { role: "PROFESSOR" },
    create: {
      name: "Bob Professor",
      email: "professor@ics.edu",
      password: passwordHash,
      role: "PROFESSOR",
      instituteId: institute.id,
    },
  });

  // Admin
  const admin = await db.user.upsert({
    where: { email: "admin@ics.edu" },
    update: { role: "ADMIN" },
    create: {
      name: "Charlie Admin",
      email: "admin@ics.edu",
      password: passwordHash,
      role: "ADMIN",
      instituteId: institute.id,
    },
  });

  console.log("Seeded 3 users (STUDENT, PROFESSOR, ADMIN) for institute 'ics'.");

  // Since we also want to test the browser, let's create a session manually for the student to use directly,
  // Or we can just log in if there's a login page. Since there might not be a functional login page yet,
  // we will insert a session manually for the student.
  const student = await db.user.findUnique({ where: { email: "student@ics.edu" } });
  
  // Clean up any old sessions for student
  await db.session.deleteMany({ where: { userId: student.id } });

  const session = await db.session.create({
    data: {
      id: "test-session-student",
      userId: student.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    },
  });

  console.log(`Created manual student session: lumina_session=test-session-student`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
