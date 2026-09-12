import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

  console.log("Seeding default accounts (Admin, Instructor, Student) for all institutes...");
  const defaultPassword = await hash("password123", 10);

  const allInstitutes = await prisma.institute.findMany();
  const users = [];

  for (const inst of allInstitutes) {
    const code = inst.code.toLowerCase();
    
    let instructorName = "Professor Smith";
    let studentName = "Alex Student";
    
    if (code === "ibe") {
        instructorName = "Professor Keynes";
        studentName = "Bella Student";
    } else if (code === "ite") {
        instructorName = "Professor Turing";
        studentName = "Terry Student";
    }

    users.push(
      {
        name: `${code.toUpperCase()} System Admin`,
        email: `admin@${code}.edu.ph`,
        password: defaultPassword,
        role: "ADMIN",
        instituteId: inst.id,
      },
      {
        name: instructorName,
        email: `instructor@${code}.edu.ph`,
        password: defaultPassword,
        role: "PROFESSOR",
        instituteId: inst.id,
      },
      {
        name: studentName,
        email: `student@${code}.edu.ph`,
        studentNumber: `2026-${code}-001`,
        password: defaultPassword,
        role: "STUDENT",
        instituteId: inst.id,
      }
    );
  }

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, instituteId: u.instituteId },
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
