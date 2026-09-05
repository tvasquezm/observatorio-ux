import 'dotenv/config';
import {
  ActorSesion,
  EstadoSesion,
  PrismaClient,
  Rol,
  TipoArtefacto,
  TipoCardSorting,
  TipoSesion,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const demoPassword = process.env.SEED_PASSWORD || 'Demo1234!';
const projectId = '2220b224-865d-4230-a484-19338c66b9e6';

// --- 3 cuentas de estudiante reales, miembros del mismo proyecto ---
// Reemplaza la única cuenta evaluador@ux.utem.cl: con ProyectoMiembro los
// 3 pueden acceder y editar en paralelo, y el lock pesimista por fin se
// puede probar entre usuarios distintos sobre el mismo artefacto.
const estudiantes = [
  { id: 'c702fdcf-ff14-4e49-bcdf-620f1738bb01', nombre: 'Estudiante Uno', email: 'estudiante1@ux.utem.cl' },
  { id: 'c702fdcf-ff14-4e49-bcdf-620f1738bb02', nombre: 'Estudiante Dos', email: 'estudiante2@ux.utem.cl' },
  { id: 'c702fdcf-ff14-4e49-bcdf-620f1738bb03', nombre: 'Estudiante Tres', email: 'estudiante3@ux.utem.cl' },
];

// --- Usuario profesor de prueba (login simple para QA manual) ---
const profesorPassword = process.env.SEED_PROFESOR_PASSWORD || 'profesor123';
const profesorId = 'f1e1b6a1-0000-4a11-9c00-000000000001';
const profesorEmail = 'profesor@test.com';
const profesorProjectId = 'f1e1b6a1-0001-4a11-9c00-000000000002';
const cardSortingEstudioId = 'f1e1b6a1-0002-4a11-9c00-000000000003';
const cardSortingParticipanteSesionId = 'f1e1b6a1-0003-4a11-9c00-000000000004';
const heuristicaSesionId = 'f1e1b6a1-0004-4a11-9c00-000000000005';
const participanteDemoId = 'f1e1b6a1-0005-4a11-9c00-000000000006';
const cardIds = [
  'f1e1b6a1-0010-4a11-9c00-000000000010',
  'f1e1b6a1-0010-4a11-9c00-000000000011',
  'f1e1b6a1-0010-4a11-9c00-000000000012',
  'f1e1b6a1-0010-4a11-9c00-000000000013',
];
const categoryIds = [
  'f1e1b6a1-0020-4a11-9c00-000000000020',
  'f1e1b6a1-0020-4a11-9c00-000000000021',
];
const artifactPersonaId = 'f1e1b6a1-0030-4a11-9c00-000000000030';
const artifactJourneyMapId = 'f1e1b6a1-0030-4a11-9c00-000000000031';
const artifactMomentosCriticosId = 'f1e1b6a1-0030-4a11-9c00-000000000032';

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const [estudiante1, estudiante2, estudiante3] = await Promise.all(
    estudiantes.map((e) =>
      prisma.usuario.upsert({
        where: { email: e.email },
        update: { nombre: e.nombre, rol: Rol.ESTUDIANTE, passwordHash },
        create: { id: e.id, nombre: e.nombre, email: e.email, rol: Rol.ESTUDIANTE, passwordHash },
      }),
    ),
  );
  const evaluator = estudiante1;

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

  // Los 3 quedan como miembros del proyecto (incluido el creador, por
  // consistencia): así assertProjectAccess los reconoce a todos por igual.
  for (const est of [estudiante1, estudiante2, estudiante3]) {
    await prisma.proyectoMiembro.upsert({
      where: { proyectoId_usuarioId: { proyectoId: project.id, usuarioId: est.id } },
      update: {},
      create: { proyectoId: project.id, usuarioId: est.id },
    });
  }

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

  // ------------------------------------------------------------
  // Usuario profesor de prueba + proyecto con las 5 técnicas UX
  // ------------------------------------------------------------
  const profesorPasswordHash = await bcrypt.hash(profesorPassword, 12);

  const profesor = await prisma.usuario.upsert({
    where: { email: profesorEmail },
    update: {
      nombre: 'Profesor de Prueba',
      rol: Rol.DOCENTE,
      passwordHash: profesorPasswordHash,
    },
    create: {
      id: profesorId,
      nombre: 'Profesor de Prueba',
      email: profesorEmail,
      rol: Rol.DOCENTE,
      passwordHash: profesorPasswordHash,
    },
  });

  const profesorProject = await prisma.proyecto.upsert({
    where: { id: profesorProjectId },
    update: {
      nombre: 'Proyecto Demo Profesor',
      descripcion: 'Proyecto de prueba con las 5 técnicas del Observatorio UX',
      creadoPorId: profesor.id,
    },
    create: {
      id: profesorProjectId,
      nombre: 'Proyecto Demo Profesor',
      descripcion: 'Proyecto de prueba con las 5 técnicas del Observatorio UX',
      creadoPorId: profesor.id,
    },
  });

  const participanteDemo = await prisma.participante.upsert({
    where: { id: participanteDemoId },
    update: { metadata: { perfil: 'Participante Demo', edad: 25 } },
    create: {
      id: participanteDemoId,
      metadata: { perfil: 'Participante Demo', edad: 25 },
    },
  });

  const consentDemo = await prisma.consentimiento.findFirst({
    where: { participanteId: participanteDemo.id, proyectoId: profesorProject.id },
  });
  if (consentDemo) {
    await prisma.consentimiento.update({
      where: { id: consentDemo.id },
      data: { aceptado: true, version: '1.0' },
    });
  } else {
    await prisma.consentimiento.create({
      data: {
        participanteId: participanteDemo.id,
        proyectoId: profesorProject.id,
        aceptado: true,
        version: '1.0',
      },
    });
  }

  // --- Técnica 1: Card Sorting (estudio + sesión de participante completada) ---
  // Se limpian hijos del estudio para que el seed sea re-ejecutable sin duplicar.
  await prisma.cardGrouping.deleteMany({
    where: { participanteSesionId: cardSortingParticipanteSesionId },
  });
  await prisma.category.deleteMany({ where: { sessionId: cardSortingEstudioId } });
  await prisma.card.deleteMany({ where: { sessionId: cardSortingEstudioId } });
  await prisma.researchSession.deleteMany({
    where: { id: { in: [cardSortingParticipanteSesionId, cardSortingEstudioId] } },
  });

  const cardSortingEstudio = await prisma.researchSession.create({
    data: {
      id: cardSortingEstudioId,
      proyectoId: profesorProject.id,
      evaluadorId: profesor.id,
      tipo: TipoSesion.CARD_SORTING,
      estado: EstadoSesion.EN_PROGRESO,
      actor: ActorSesion.EVALUADOR,
      tipoCardSorting: TipoCardSorting.CERRADO,
      cardsDefinidas: {
        create: cardIds.map((id, i) => ({ id, etiqueta: `Tarjeta ${i + 1}` })),
      },
      categoriasDefinidas: {
        create: categoryIds.map((id, i) => ({
          id,
          nombre: `Categoría ${i + 1}`,
          esPredefinida: true,
        })),
      },
    },
  });

  await prisma.researchSession.create({
    data: {
      id: cardSortingParticipanteSesionId,
      proyectoId: profesorProject.id,
      tipo: TipoSesion.CARD_SORTING,
      estado: EstadoSesion.COMPLETADO,
      actor: ActorSesion.PARTICIPANTE,
      participanteId: participanteDemo.id,
      estudioId: cardSortingEstudio.id,
      completadoAt: new Date(),
      agrupaciones: {
        create: [
          { cardId: cardIds[0], categoryId: categoryIds[0] },
          { cardId: cardIds[1], categoryId: categoryIds[0] },
          { cardId: cardIds[2], categoryId: categoryIds[1] },
          { cardId: cardIds[3], categoryId: categoryIds[1] },
        ],
      },
    },
  });

  // --- Técnica 2: Evaluación Heurística ---
  await prisma.researchSession.upsert({
    where: { id: heuristicaSesionId },
    update: {
      estado: EstadoSesion.COMPLETADO,
      resultado: [
        {
          heuristicaId: 'H4',
          severidad: 3,
          descripcion: 'Falta consistencia en los botones de acción principal.',
          recomendacion: 'Unificar estilo de botones primarios en todo el flujo.',
        },
        {
          heuristicaId: 'H1',
          severidad: 2,
          descripcion: 'El sistema no informa el estado de carga al guardar cambios.',
          evidencia: 'Pantalla de edición de proyecto.',
        },
      ],
    },
    create: {
      id: heuristicaSesionId,
      proyectoId: profesorProject.id,
      evaluadorId: profesor.id,
      tipo: TipoSesion.EVALUACION_HEURISTICA,
      estado: EstadoSesion.COMPLETADO,
      actor: ActorSesion.EVALUADOR,
      completadoAt: new Date(),
      resultado: [
        {
          heuristicaId: 'H4',
          severidad: 3,
          descripcion: 'Falta consistencia en los botones de acción principal.',
          recomendacion: 'Unificar estilo de botones primarios en todo el flujo.',
        },
        {
          heuristicaId: 'H1',
          severidad: 2,
          descripcion: 'El sistema no informa el estado de carga al guardar cambios.',
          evidencia: 'Pantalla de edición de proyecto.',
        },
      ],
    },
  });

  // --- Técnica 3: Persona ---
  await prisma.uxArtifact.upsert({
    where: { artefactoLogicoId_version: { artefactoLogicoId: artifactPersonaId, version: 1 } },
    update: {},
    create: {
      proyectoId: profesorProject.id,
      autorId: profesor.id,
      tipo: TipoArtefacto.PERSONA,
      artefactoLogicoId: artifactPersonaId,
      version: 1,
      contenido: {
        nombre: 'María Pérez',
        edad: 28,
        ocupacion: 'Diseñadora UX Junior',
        objetivos: ['Encontrar información rápido', 'Completar tareas sin fricción'],
        frustraciones: ['Navegación confusa', 'Textos poco claros'],
      },
    },
  });

  // --- Técnica 4: Journey Map ---
  // OJO: el shape de `contenido` debe coincidir con JourneyMapSchema
  // (packages/shared-types/src/domains/journey-map.ts) — perfilUsuario +
  // fases (mín. 3, cada una con touchpoints/pensamientos/oportunidades no
  // vacíos). `update` también fija `contenido` (no `{}`) para que un
  // re-seed sobre una BD ya poblada con el shape viejo la corrija.
  const journeyMapContenido = {
    perfilUsuario: {
      id: 'b2b1a6a1-0030-4a11-9c00-000000000041',
      nombre: 'María Pérez',
      rol: 'Usuaria potencial',
    },
    fases: [
      {
        nombre: 'Descubrimiento',
        touchpoints: ['Búsqueda en Google', 'Landing page'],
        pensamientos: ['¿Esto me sirve para lo que necesito?'],
        emocion: 'Neutral',
        oportunidades: ['Clarificar la propuesta de valor en el hero'],
      },
      {
        nombre: 'Registro',
        touchpoints: ['Formulario de registro'],
        pensamientos: ['El registro fue rápido y directo'],
        emocion: 'Positiva',
        oportunidades: ['Agregar registro con un solo click (SSO)'],
      },
      {
        nombre: 'Primer uso',
        touchpoints: ['Dashboard inicial'],
        pensamientos: ['No encuentro el botón de inicio'],
        emocion: 'Negativa',
        oportunidades: ['Agregar onboarding guiado en el primer login'],
      },
    ],
  };

  await prisma.uxArtifact.upsert({
    where: {
      artefactoLogicoId_version: { artefactoLogicoId: artifactJourneyMapId, version: 1 },
    },
    update: { contenido: journeyMapContenido },
    create: {
      proyectoId: profesorProject.id,
      autorId: profesor.id,
      tipo: TipoArtefacto.JOURNEY_MAP,
      artefactoLogicoId: artifactJourneyMapId,
      version: 1,
      contenido: journeyMapContenido,
    },
  });

  // --- Técnica 5: Momentos Críticos ---
  // Mismo criterio: shape debe coincidir con MomentosCriticosSchema
  // (packages/shared-types/src/domains/momentos-criticos.ts) — perfilUsuario
  // + incidentes (mín. 1, cada uno con tipo/impacto/frecuencia en el enum
  // correcto y accionesSugeridas no vacío).
  const momentosCriticosContenido = {
    perfilUsuario: {
      id: 'b2b1a6a1-0030-4a11-9c00-000000000041',
      nombre: 'María Pérez',
      rol: 'Usuaria potencial',
    },
    incidentes: [
      {
        nombre: 'Botón de inicio invisible',
        descripcion: 'El participante tardó más de 40s en encontrar cómo comenzar.',
        tipo: 'Negativo',
        impacto: 'Alto',
        frecuencia: 'Alta',
        causa: 'El botón principal no tiene suficiente contraste ni jerarquía visual.',
        accionesSugeridas: ['Rediseñar el CTA con mayor contraste', 'Agregar tooltip guía en el primer uso'],
      },
    ],
  };

  await prisma.uxArtifact.upsert({
    where: {
      artefactoLogicoId_version: { artefactoLogicoId: artifactMomentosCriticosId, version: 1 },
    },
    update: { contenido: momentosCriticosContenido },
    create: {
      proyectoId: profesorProject.id,
      autorId: profesor.id,
      tipo: TipoArtefacto.MOMENTOS_CRITICOS,
      artefactoLogicoId: artifactMomentosCriticosId,
      version: 1,
      contenido: momentosCriticosContenido,
    },
  });

  console.log('Seed listo. Estudiantes (mismo proyecto, contraseña demo):');
  [estudiante1, estudiante2, estudiante3].forEach((e) => console.log(`  - ${e.email}`));
  console.log(`Contraseña demo: ${demoPassword}`);
  console.log(`Proyecto demo: ${project.id}`);
  console.log('---');
  console.log(`Usuario profesor (prueba): ${profesor.email}`);
  console.log(`Contraseña profesor: ${profesorPassword}`);
  console.log(`Proyecto profesor: ${profesorProject.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());