// apps/backend/prisma/bootstrap-admin.ts
//
// H3 (auditoría 2026-09-24): antes, la única forma de tener un ADMIN en
// producción era correr prisma/seed.ts — que además crea un proyecto y
// datos demo completos con contraseñas por defecto. Este script crea (o
// actualiza a rol ADMIN) UN solo usuario, a partir de variables de
// entorno obligatorias, sin defaults y sin loguear la contraseña.
//
// Uso: BOOTSTRAP_ADMIN_EMAIL=admin@real.cl BOOTSTRAP_ADMIN_PASSWORD='...' \
//      pnpm run bootstrap:admin

import 'dotenv/config';
import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const nombre = process.env.BOOTSTRAP_ADMIN_NOMBRE || 'Administrador';

  if (!email || !password) {
    console.error(
      'Faltan BOOTSTRAP_ADMIN_EMAIL y/o BOOTSTRAP_ADMIN_PASSWORD. No se creó ningún usuario.',
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 12) {
    console.error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.usuario.upsert({
    where: { email },
    update: { rol: Rol.ADMIN, passwordHash, nombre },
    create: { nombre, email, rol: Rol.ADMIN, passwordHash },
  });

  console.log(`Administrador listo: ${user.email} (rol ${user.rol}). La contraseña no se imprime.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
