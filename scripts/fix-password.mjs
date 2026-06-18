import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const prisma = new PrismaClient();

const rl = readline.createInterface({ input, output });

const email = await rl.question("Email del usuario: ");
const password = await rl.question("Nueva contraseña: ");
await rl.close();

if (!email || !password) { console.error("Email y contraseña son requeridos"); process.exit(1); }
if (password.length < 8) { console.error("La contraseña debe tener al menos 8 caracteres"); process.exit(1); }

const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, name: true, email: true } });
if (!user) { console.error(`Usuario con email "${email}" no encontrado`); process.exit(1); }

const hashed = await bcrypt.hash(password, 12);
await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

console.log(`✓ Contraseña actualizada para ${user.name} (${user.email})`);
await prisma.$disconnect();
