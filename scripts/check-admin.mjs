import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const admins = await prisma.user.findMany({
  where: { role: "ADMIN" },
  select: { id: true, email: true, name: true, emailVerified: true, password: true },
});

console.log("Admins en la BD:");
for (const a of admins) {
  console.log(`  - ${a.name} | ${a.email} | verified: ${!!a.emailVerified} | hasPassword: ${!!a.password}`);
}

await prisma.$disconnect();
