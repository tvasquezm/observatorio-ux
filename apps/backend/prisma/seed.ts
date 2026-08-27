import 'dotenv/config';
import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const demoPassword = process.env.SEED_PASSWORD || 'Demo1234!';
const evaluatorId = 'c702fdcf-ff14-4e49-bcdf-620f1738bb04';
const projectId = '2220b224-865d-4230-a484-19338c66b9e6';

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const evaluator = await prisma.usuario.upsert({
    where: { email: 'evaluador@ux.utem.cl' },
    update: {
      nombre: 'Investigador UX Principal',
      rol: Rol.DOCENTE,
      passwordHash,
    },
    create: {
      id: evaluatorId,
      nombre: 'Investigador UX Principal',
      email: 'evaluador@ux.utem.cl',
      rol: Rol.DOCENTE,
      passwordHash,
    },
  });

  const project = await prisma.proyecto.upsert({
    where: { id: projectId },
    update: {
      nombre: 'Estudio de Arquitectura de Información 2026',
      descripcion: 'Proyecto de prueba para validación de Card Sorting',
      creadoPorId: evaluator.id,
    },
    create: {
      id: projectId,
      nombre: 'Estudio de Arquitectura de Información 2026',
      descripcion: 'Proyecto de prueba para validación de Card Sorting',
      creadoPorId: evaluator.id,
    },
  });

  for (let i = 1; i <= 5; i += 1) {
    const participantId = `62848df5-2560-4a28-a303-43b0af2b65a${i}`;
    const participant = await prisma.participante.upsert({
      where: { id: participantId },
      update: { metadata: { perfil: `Usuario de Prueba ${i}`, edad: 20 + i } },
      create: {
        id: participantId,
        metadata: { perfil: `Usuario de Prueba ${i}`, edad: 20 + i },
      },
    });

    const consent = await prisma.consentimiento.findFirst({
      where: { participanteId: participant.id, proyectoId: project.id },
    });

    if (consent) {
      await prisma.consentimiento.update({
        where: { id: consent.id },
        data: { aceptado: true, version: '1.0' },
      });
    } else {
      await prisma.consentimiento.create({
        data: {
          participanteId: participant.id,
          proyectoId: project.id,
          aceptado: true,
          version: '1.0',
        },
      });
    }
  }

  console.log(`Seed listo. Usuario: ${evaluator.email}`);
  console.log(`Contraseña demo: ${demoPassword}`);
  console.log(`Proyecto demo: ${project.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
