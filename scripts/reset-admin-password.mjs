import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Cambia esto a la contraseña que quieres usar
const NEW_PASSWORD = process.argv[2];
const EMAIL = process.argv[3] || "moisestodoroki@gmail.com";

if (!NEW_PASSWORD) {
  console.error("Uso: node scripts/reset-admin-password.mjs <nueva-contraseña> [email]");
  process.exit(1);
}

if (NEW_PASSWORD.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres");
  process.exit(1);
}

const hashed = await bcrypt.hash(NEW_PASSWORD, 12);

const updated = await prisma.user.update({
  where: { email: EMAIL },
  data: { password: hashed },
  select: { name: true, email: true },
});

console.log(`✓ Contraseña actualizada para ${updated.name} (${updated.email})`);
await prisma.$disconnect();
