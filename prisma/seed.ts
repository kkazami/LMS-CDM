import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default institutes...");

  const institutes = [
    { code: "ics", name: "Institute of Computer Studies" },
    { code: "ibe", name: "Institute of Business and Education" },
    { code: "ite", name: "Institute of Technology and Engineering" },
  ];

  for (const inst of institutes) {
    await prisma.institute.upsert({
      where: { code: inst.code },
      update: { name: inst.name },
      create: { code: inst.code, name: inst.name },
    });
  }

  const ics = await prisma.institute.findUnique({ where: { code: "ics" } });
  if (!ics) return;

  console.log("Seeding default accounts (Admin, Instructor, Student)...");
  const defaultPassword = await hash("password123", 10);

  const users = [
    {
      name: "System Admin",
      email: "admin@ics.edu.ph",
      password: defaultPassword,
      role: "ADMIN",
      instituteId: ics.id,
    },
    {
      name: "Professor Smith",
      email: "instructor@ics.edu.ph",
      password: defaultPassword,
      role: "PROFESSOR",
      instituteId: ics.id,
    },
    {
      name: "Alex Student",
      email: "student@ics.edu.ph",
      studentNumber: "2026-00001",
      password: defaultPassword,
      role: "STUDENT",
      instituteId: ics.id,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name },
      create: u,
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
