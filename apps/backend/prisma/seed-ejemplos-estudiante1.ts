import 'dotenv/config';
import {
  ActorSesion,
  EstadoSesion,
  Prisma,
  PrismaClient,
  TipoArtefacto,
  TipoCardSorting,
  TipoSesion,
} from '../src/generated/prisma/client.js';
import {
  JourneyMapSchema,
  MomentosCriticosSchema,
  PersonaSchema,
} from '@observatorio-ux/shared-types';
import { createPrismaAdapter } from './adapter.js';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

// Mismos IDs/emails que seed.ts.
const estudianteEmail = 'estudiante1@ux.utem.cl';
const estudioProyectoId = '2220b224-865d-4230-a484-19338c66b9e6';
const demoProfesorProyectoId = 'f1e1b6a1-0001-4a11-9c00-000000000002';

// IDs fijos propios (prefijo e5e1b6a1) => upsert idempotente.
const id = (grupo: string, n: number) =>
  `e5e1b6a1-${grupo}-4a11-9c00-${String(n).padStart(12, '0')}`;
const personaLogicoId = id('0030', 1);
const journeyLogicoId = id('0030', 2);
const momentosLogicoId = id('0030', 3);
const estudioCsId = id('0002', 1);
const heuristicaSesionId = id('0004', 1);
const cardIds = Array.from({ length: 10 }, (_, i) => id('0010', i + 1));
const categoryIds = Array.from({ length: 3 }, (_, i) => id('0020', i + 1));
const participanteIds = Array.from({ length: 3 }, (_, i) => id('0005', i + 1));
const participanteSesionIds = Array.from({ length: 3 }, (_, i) => id('0003', i + 1));

// ---------------- Persona ----------------
const persona = {
  nombreCompleto: 'Camila Rojas',
  edad: 21,
  ocupacion: 'Estudiante de Ingeniería en Diseño, 5.º semestre',
  acercaDe:
    'Camila vive en Santiago y se traslada al campus cuatro días a la semana. Usa el portal de la biblioteca para preparar entregas y busca terminar sus trámites rápido, casi siempre desde el celular.',
  familia: 'Vive con sus padres y un hermano menor.',
  hobbies: ['Fotografía', 'Ilustración digital', 'Series de misterio'],
  habilidades: ['Manejo de Figma', 'Búsqueda básica en bases de datos', 'Trabajo en equipo'],
  objetivos: [
    'Encontrar bibliografía para sus entregas sin perder tiempo',
    'Renovar préstamos antes de que venzan las multas',
    'Reservar una sala de estudio para trabajos grupales',
  ],
  necesidades: [
    'Un buscador que entregue resultados relevantes a la primera',
    'Saber en todo momento qué libros tiene prestados y hasta cuándo',
  ],
  motivaciones: ['Cumplir plazos académicos', 'Evitar multas', 'Aprovechar mejor el tiempo entre clases'],
  frustraciones: [
    'No distingue entre catálogo y bases de datos académicas',
    'El menú cambia de nombre según la sección',
    'Descubre una multa recién al devolver el libro',
  ],
  comportamientos: [
    'Busca primero en Google y luego entra al portal',
    'Abre varias pestañas en paralelo mientras compara fuentes',
    'Pregunta a compañeros antes de contactar a la biblioteca',
  ],
  contextoDeUso:
    'Pasillos y cafetería del campus, con conexión móvil irregular y entre clases de 15 a 20 minutos.',
  expectativas: [
    'Ver estado de sus préstamos en la página de inicio',
    'Recibir avisos antes del vencimiento',
  ],
  rolEnServicio: 'Usuaria final recurrente; recomienda el servicio a sus compañeros de carrera.',
  relacionConServicio:
    'Usa el portal 2 a 3 veces por semana, sobre todo en periodo de entregas. Accede por celular y notebook. Lo considera crítico para aprobar sus ramos.',
  caracteristicasDistintivas: [
    'Prioriza la rapidez por sobre la profundidad de la búsqueda',
    'Aprende por ensayo y error, rara vez lee la ayuda',
  ],
  evidencia: [
    'Entrevistas a 6 estudiantes de 4.º y 5.º semestre (marzo 2026)',
    'Encuesta de uso de la biblioteca (n = 48)',
    'Observación de sesiones de uso en laboratorio',
  ],
  estadoValidacion: 'VALIDADA' as const,
  observacionesValidacion: 'Validada con el equipo docente tras contrastarla con los resultados de las entrevistas.',
};

// ---------------- Journey Map ----------------
const perfilUsuario = { id: personaLogicoId, nombre: 'Camila Rojas', rol: 'Estudiante de pregrado' };

const journeyMap = {
  perfilUsuario,
  objetivo: 'Conseguir y renovar la bibliografía de una entrega académica usando el portal de la biblioteca.',
  eventoInicio: 'Recibe el enunciado de una entrega con bibliografía obligatoria para dentro de una semana.',
  fases: [
    {
      nombre: 'Descubrimiento',
      actividades: ['Revisa el enunciado', 'Busca el título en Google', 'Entra al portal de la biblioteca'],
      touchpoints: ['Google', 'Portal de la biblioteca (inicio)'],
      pensamientos: ['¿Dónde busco libros y dónde busco artículos?'],
      emocion: 'Neutral',
      dificultades: ['No queda claro qué diferencia hay entre catálogo y bases de datos'],
      ganancias: ['El portal aparece primero en los resultados de búsqueda'],
      oportunidades: ['Un buscador único en el inicio', 'Texto breve que explique qué hay en cada sección'],
    },
    {
      nombre: 'Búsqueda y selección',
      actividades: ['Busca por título y autor', 'Filtra por disponibilidad', 'Compara ediciones'],
      touchpoints: ['Catálogo en línea', 'Filtros de búsqueda'],
      pensamientos: ['Los filtros me ayudan, pero no sé si el libro está en mi sede'],
      emocion: 'Positiva',
      dificultades: ['La disponibilidad por sede no se ve en el listado'],
      ganancias: ['Encuentra 3 de 4 títulos en pocos minutos'],
      oportunidades: ['Mostrar la disponibilidad por sede directamente en el listado'],
    },
    {
      nombre: 'Préstamo y retiro',
      actividades: ['Solicita el préstamo en línea', 'Retira el libro en mesón'],
      touchpoints: ['Formulario de préstamo', 'Mesón de atención', 'Correo de confirmación'],
      pensamientos: ['No sé si mi solicitud quedó registrada'],
      emocion: 'Negativa',
      dificultades: ['No hay confirmación inmediata en pantalla', 'Fila larga en horas punta'],
      ganancias: ['El personal resuelve sus dudas con amabilidad'],
      oportunidades: ['Confirmación en pantalla con código de retiro', 'Retiro rápido sin fila para préstamos ya solicitados'],
    },
    {
      nombre: 'Renovación y devolución',
      actividades: ['Revisa fechas de vencimiento', 'Renueva en línea', 'Devuelve el libro'],
      touchpoints: ['Sección «Mi cuenta»', 'Correo de aviso', 'Buzón de devolución'],
      pensamientos: ['Casi se me pasa la fecha, ojalá me hubieran avisado antes'],
      emocion: 'Neutral',
      dificultades: ['«Mi cuenta» está dentro de un menú poco visible', 'Descubre una multa recién al devolver'],
      ganancias: ['La renovación en línea toma menos de un minuto'],
      oportunidades: ['Recordatorio automático 48 horas antes del vencimiento', 'Acceso directo a «Mi cuenta» desde el inicio'],
    },
  ],
  evidencia: [
    'Sesiones de observación con 5 estudiantes',
    'Registros de préstamos y multas del semestre anterior',
  ],
};

// ---------------- Momentos Críticos ----------------
const momentosCriticos = {
  perfilUsuario,
  incidentes: [
    {
      nombre: 'Renovación en un solo clic',
      descripcion: 'La usuaria renueva su préstamo en menos de un minuto desde «Mi cuenta».',
      tipo: 'Positivo',
      impacto: 'Alto',
      frecuencia: 'Alta',
      causa: 'El botón «Renovar» está junto a cada préstamo y no pide pasos adicionales.',
      accionesSugeridas: ['Mantener el patrón y replicarlo en reservas de salas'],
    },
    {
      nombre: 'Multa descubierta al devolver',
      descripcion: 'La usuaria se entera de una multa recién al entregar el libro en el mesón.',
      tipo: 'Negativo',
      impacto: 'Alto',
      frecuencia: 'Media',
      causa: 'No existe aviso previo al vencimiento ni indicador de deuda en el inicio.',
      accionesSugeridas: ['Enviar un recordatorio 48 horas antes', 'Mostrar el estado de deuda en la cabecera del portal'],
    },
    {
      nombre: 'Confusión entre catálogo y bases de datos',
      descripcion: 'La usuaria busca un artículo académico en el catálogo de libros y no lo encuentra.',
      tipo: 'Negativo',
      impacto: 'Medio',
      frecuencia: 'Alta',
      causa: 'Ambos recursos están en secciones separadas sin explicación de su diferencia.',
      accionesSugeridas: ['Unificar el buscador en el inicio', 'Agregar una ayuda breve junto a cada sección'],
    },
    {
      nombre: 'Atención amable en mesón',
      descripcion: 'El personal resuelve una duda sobre una cuenta bloqueada sin demora.',
      tipo: 'Positivo',
      impacto: 'Medio',
      frecuencia: 'Baja',
      causa: 'El equipo de mesón tiene acceso directo al sistema de cuentas.',
      accionesSugeridas: ['Documentar el procedimiento para capacitar a nuevo personal'],
    },
  ],
};

// ---------------- Card Sorting (cerrado) ----------------
const etiquetas = [
  'Catálogo en línea',
  'Bases de datos académicas',
  'Acceso desde fuera del campus',
  'Solicitar préstamo',
  'Renovar préstamo',
  'Pedir libro de otra sede',
  'Reservar sala de estudio',
  'Horarios de atención',
  'Tutoriales de búsqueda',
  'Contactar a un bibliotecario',
];
const categorias = ['Buscar recursos', 'Gestionar mis préstamos', 'Ayuda y servicios'];
// Índice de categoría por tarjeta, por participante (3 participantes, con pequeñas discrepancias).
const agrupacionesPorParticipante: number[][] = [
  [0, 0, 0, 1, 1, 1, 2, 2, 2, 2],
  [0, 0, 0, 1, 1, 1, 1, 2, 2, 2],
  [0, 0, 2, 1, 1, 0, 2, 2, 0, 2],
];

// ---------------- Evaluación Heurística ----------------
const hallazgos = [
  {
    id: id('0040', 1),
    heuristicaId: 'H1',
    severidad: 3,
    descripcion: 'Al solicitar un préstamo no aparece una confirmación en pantalla: la usuaria no sabe si el trámite quedó registrado.',
    evidencia: 'Formulario de préstamo, tras pulsar «Solicitar».',
    recomendacion: 'Mostrar un mensaje de confirmación con código de retiro y enviar el mismo dato por correo.',
  },
  {
    id: id('0040', 2),
    heuristicaId: 'H4',
    severidad: 2,
    descripcion: 'La misma sección se llama «Mi cuenta», «Mis servicios» y «Perfil» según la pantalla.',
    evidencia: 'Menú principal del inicio y pie de página.',
    recomendacion: 'Usar una sola etiqueta en todo el portal.',
  },
  {
    id: id('0040', 3),
    heuristicaId: 'H6',
    severidad: 4,
    descripcion: 'No hay aviso previo a la fecha de vencimiento: la persona recién se entera de la multa al devolver el libro.',
    evidencia: 'Sección «Mi cuenta», listado de préstamos vigentes.',
    recomendacion: 'Enviar un recordatorio 48 horas antes y mostrar la fecha de vencimiento en el inicio.',
  },
  {
    id: id('0040', 4),
    heuristicaId: 'H10',
    severidad: 1,
    descripcion: 'Los tutoriales de búsqueda no se encuentran desde el catálogo y están en una sección aparte.',
    evidencia: 'Página de resultados del catálogo.',
    recomendacion: 'Agregar un enlace de ayuda contextual junto al buscador.',
  },
].map((h, i) => ({ ...h, registradoEn: new Date(Date.UTC(2026, 2, 10 + i, 15, 0)).toISOString() }));

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Este script crea datos DEMO y no corre en producción.');
    process.exitCode = 1;
    return;
  }

  // Validación con los mismos schemas que usa el backend.
  PersonaSchema.parse(persona);
  JourneyMapSchema.parse(journeyMap);
  MomentosCriticosSchema.parse(momentosCriticos);

  const estudiante = await prisma.usuario.findUnique({ where: { email: estudianteEmail } });
  const proyecto = await prisma.proyecto.findUnique({ where: { id: estudioProyectoId } });
  if (!estudiante || !proyecto) {
    console.error(
      `Falta ${!estudiante ? estudianteEmail : 'el proyecto «Estudio de Arquitectura de Información 2026»'}. ` +
        'Corre antes el seed base: pnpm --filter backend exec tsx prisma/seed.ts',
    );
    process.exitCode = 1;
    return;
  }

  // Membresía en el proyecto Estudio y, si existe, en Proyecto Demo Profesor.
  await prisma.proyectoMiembro.upsert({
    where: { proyectoId_usuarioId: { proyectoId: proyecto.id, usuarioId: estudiante.id } },
    update: {},
    create: { proyectoId: proyecto.id, usuarioId: estudiante.id },
  });
  const demoProfesor = await prisma.proyecto.findUnique({ where: { id: demoProfesorProyectoId } });
  if (demoProfesor) {
    await prisma.proyectoMiembro.upsert({
      where: { proyectoId_usuarioId: { proyectoId: demoProfesor.id, usuarioId: estudiante.id } },
      update: {},
      create: { proyectoId: demoProfesor.id, usuarioId: estudiante.id },
    });
  } else {
    console.warn('Aviso: «Proyecto Demo Profesor» no existe; se omite esa membresía.');
  }

  // Persona, Journey Map y Momentos Críticos.
  const artefactos: [TipoArtefacto, string, Prisma.InputJsonObject][] = [
    [TipoArtefacto.PERSONA, personaLogicoId, persona],
    [TipoArtefacto.JOURNEY_MAP, journeyLogicoId, journeyMap],
    [TipoArtefacto.MOMENTOS_CRITICOS, momentosLogicoId, momentosCriticos],
  ];
  for (const [tipo, artefactoLogicoId, contenido] of artefactos) {
    await prisma.uxArtifact.upsert({
      where: { artefactoLogicoId_version: { artefactoLogicoId, version: 1 } },
      update: { contenido, deletedAt: null },
      create: { proyectoId: proyecto.id, autorId: estudiante.id, tipo, artefactoLogicoId, version: 1, contenido },
    });
  }

  // Card Sorting: estudio cerrado con 10 tarjetas, 3 categorías y 3 participantes completados.
  await prisma.researchSession.upsert({
    where: { id: estudioCsId },
    update: { nombre: 'Card Sorting: portal de la biblioteca' },
    create: {
      id: estudioCsId,
      proyectoId: proyecto.id,
      evaluadorId: estudiante.id,
      nombre: 'Card Sorting: portal de la biblioteca',
      tipo: TipoSesion.CARD_SORTING,
      estado: EstadoSesion.EN_PROGRESO,
      actor: ActorSesion.EVALUADOR,
      tipoCardSorting: TipoCardSorting.CERRADO,
    },
  });
  for (let i = 0; i < etiquetas.length; i += 1) {
    await prisma.card.upsert({
      where: { id: cardIds[i] },
      update: { sessionId: estudioCsId, etiqueta: etiquetas[i] },
      create: { id: cardIds[i], sessionId: estudioCsId, etiqueta: etiquetas[i] },
    });
  }
  for (let i = 0; i < categorias.length; i += 1) {
    await prisma.category.upsert({
      where: { id: categoryIds[i] },
      update: { sessionId: estudioCsId, nombre: categorias[i], esPredefinida: true },
      create: { id: categoryIds[i], sessionId: estudioCsId, nombre: categorias[i], esPredefinida: true },
    });
  }
  for (let p = 0; p < participanteIds.length; p += 1) {
    const participante = await prisma.participante.upsert({
      where: { id: participanteIds[p] },
      update: { proyectoId: proyecto.id },
      create: {
        id: participanteIds[p],
        proyectoId: proyecto.id,
        metadata: { perfil: `Estudiante de ejemplo ${p + 1}`, edad: 20 + p },
      },
    });
    const consentimiento = await prisma.consentimiento.findFirst({
      where: { participanteId: participante.id, proyectoId: proyecto.id },
    });
    if (!consentimiento) {
      await prisma.consentimiento.create({
        data: { participanteId: participante.id, proyectoId: proyecto.id, aceptado: true, version: '1.0' },
      });
    }
    const completadoAt = new Date(Date.UTC(2026, 2, 12 + p, 14, 0));
    await prisma.researchSession.upsert({
      where: { id: participanteSesionIds[p] },
      update: { estado: EstadoSesion.COMPLETADO, estudioId: estudioCsId },
      create: {
        id: participanteSesionIds[p],
        proyectoId: proyecto.id,
        tipo: TipoSesion.CARD_SORTING,
        estado: EstadoSesion.COMPLETADO,
        actor: ActorSesion.PARTICIPANTE,
        participanteId: participante.id,
        estudioId: estudioCsId,
        completadoAt,
      },
    });
    for (let c = 0; c < cardIds.length; c += 1) {
      const categoryId = categoryIds[agrupacionesPorParticipante[p][c]];
      await prisma.cardGrouping.upsert({
        where: {
          participanteSesionId_cardId: { participanteSesionId: participanteSesionIds[p], cardId: cardIds[c] },
        },
        update: { categoryId },
        create: { participanteSesionId: participanteSesionIds[p], cardId: cardIds[c], categoryId },
      });
    }
  }

  // Evaluación Heurística: sesión completada del estudiante.
  await prisma.researchSession.upsert({
    where: { id: heuristicaSesionId },
    update: { estado: EstadoSesion.COMPLETADO, resultado: hallazgos },
    create: {
      id: heuristicaSesionId,
      proyectoId: proyecto.id,
      evaluadorId: estudiante.id,
      tipo: TipoSesion.EVALUACION_HEURISTICA,
      estado: EstadoSesion.COMPLETADO,
      actor: ActorSesion.EVALUADOR,
      resultado: hallazgos,
      completadoAt: new Date(Date.UTC(2026, 2, 14, 16, 0)),
    },
  });

  console.log(`Ejemplos listos para ${estudianteEmail} en «${proyecto.nombre}».`);
  console.log('Persona, Journey Map, Momentos Críticos, Card Sorting (3 respuestas) y Evaluación Heurística (4 hallazgos).');
  if (demoProfesor) console.log(`Además es miembro de «${demoProfesor.nombre}».`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
