const { PrismaClient, Rol } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
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
  console.log(`Contraseña demo: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
