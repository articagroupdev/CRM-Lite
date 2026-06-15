import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = "admin@crmlite.com";
const plain = "Admin123!";
const hash = await bcrypt.hash(plain, 10);

const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email, name: "Admin", password: hash, role: "ADMIN", isActive: true },
});

console.log(`✓ Usuario creado: ${user.email} / ${plain}`);
await prisma.$disconnect();
