import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@crmlite.com";
  const password = await bcrypt.hash("Admin123!", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      password,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`✓ Usuario admin creado: ${user.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
