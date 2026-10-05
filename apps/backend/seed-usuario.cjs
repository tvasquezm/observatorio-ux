const { PrismaClient, Rol } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // H3: mismo guard que prisma/seed.ts — este script no debe correr en
  // producción con la contraseña demo por defecto.
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_PASSWORD) {
    console.error(
      'Este script crea un usuario DEMO. En producción hace falta definir SEED_PASSWORD. ' +
        'Si necesitas crear el primer administrador, usa "pnpm run bootstrap:admin".',
    );
    process.exitCode = 1;
    return;
  }

  const password = process.env.SEED_PASSWORD || 'Demo1234!';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.usuario.upsert({
    where: { email: 'evaluador@ux.utem.cl' },
    update: { passwordHash, rol: Rol.DOCENTE },
    create: {
      id: 'c702fdcf-ff14-4e49-bcdf-620f1738bb04',
      nombre: 'Investigador UX Principal',
      email: 'evaluador@ux.utem.cl',
      rol: Rol.DOCENTE,
      passwordHash,
    },
  });

  console.log(`Usuario listo: ${user.email}`);
  console.log('(Contraseña: la definida en SEED_PASSWORD, o el default de desarrollo si no se seteó.)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
