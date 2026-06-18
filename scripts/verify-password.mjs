import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: "moisestodoroki@gmail.com" },
  select: { email: true, password: true, emailVerified: true, isActive: true, deletedAt: true },
});

console.log("Usuario encontrado:", !!user);
console.log("emailVerified:", user?.emailVerified);
console.log("isActive:", user?.isActive);
console.log("deletedAt:", user?.deletedAt);
console.log("password hash (primeros 30):", user?.password?.slice(0, 30));

const match = await bcrypt.compare("CRMLite2026!", user?.password ?? "");
console.log("bcrypt match con 'CRMLite2026!':", match);

await prisma.$disconnect();
