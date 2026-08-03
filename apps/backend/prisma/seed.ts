import { PrismaClient, Rol } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos de prueba...');

  // 1. Crear un Evaluador (Usuario)
  const evaluador = await prisma.usuario.upsert({
    where: { email: 'evaluador@ux.utem.cl' },
    update: {},
    create: {
      nombre: 'Investigador UX Principal',
      email: 'evaluador@ux.utem.cl',
      rol: Rol.DOCENTE,
    },
  });
  console.log(`✅ Evaluador creado. ID: ${evaluador.id}`);

  // 2. Crear un Proyecto
  const proyecto = await prisma.proyecto.create({
    data: {
      nombre: 'Estudio de Arquitectura de Información 2026',
      descripcion: 'Proyecto de prueba para validación de Card Sorting',
      creadoPorId: evaluador.id,
    },
  });
  console.log(`✅ Proyecto creado. ID: ${proyecto.id}`);

  // 3. Crear 5 Participantes con su Consentimiento
  console.log('👥 Creando 5 participantes de prueba...');
  for (let i = 1; i <= 5; i++) {
    const participante = await prisma.participante.create({
      data: {
        metadata: { perfil: `Usuario de Prueba ${i}`, edad: 20 + i },
      },
    });

    await prisma.consentimiento.create({
      data: {
        participanteId: participante.id,
        proyectoId: proyecto.id,
        aceptado: true,
        version: '1.0',
        ipRegistro: `192.168.1.${i}`,
      },
    });
    console.log(`   - Participante ${i} creado. ID: ${participante.id}`);
  }

  console.log('🎉 ¡Base de datos poblada exitosamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });