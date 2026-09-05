import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Crea (o actualiza la contraseña de) el usuario dueño del panel de administración
// a partir de ADMIN_EMAIL / ADMIN_PASSWORD del entorno. Idempotente: se puede correr
// las veces que haga falta. En producción, esas variables se setean en Render.
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';

  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  }

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name, role: 'ADMIN' },
  });

  console.log(`Admin listo: ${user.email} (id ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
