import { PrismaClient } from "@prisma/client";

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
