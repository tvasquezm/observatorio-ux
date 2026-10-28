import { PrismaService } from '../database/prisma.service.js';

const ROLES_DOCENTE = ['DOCENTE', 'ADMIN'] as const;

export async function vincularMiembroAProyectosDeSala(
  prisma: PrismaService,
  equipoId: string,
  usuarioId: string,
): Promise<number> {
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: { salaId: true, creadoPor: { select: { rol: true } } },
  });
  if (!equipo || !ROLES_DOCENTE.includes(equipo.creadoPor.rol as (typeof ROLES_DOCENTE)[number])) {
    return 0;
  }

  const proyectos = await prisma.proyecto.findMany({
    where: { salaId: equipo.salaId, deletedAt: null },
    select: { id: true },
  });
  if (proyectos.length === 0) return 0;

  const { count } = await prisma.proyectoMiembro.createMany({
    data: proyectos.map((p) => ({ proyectoId: p.id, usuarioId })),
    skipDuplicates: true,
  });
  return count;
}

export async function vincularEquiposAProyecto(
  prisma: PrismaService,
  salaId: string,
  proyectoId: string,
): Promise<number> {
  const miembros = await prisma.equipoMiembro.findMany({
    where: { equipo: { salaId, creadoPor: { rol: { in: [...ROLES_DOCENTE] } } } },
    select: { usuarioId: true },
  });
  const usuarioIds = [...new Set(miembros.map((m) => m.usuarioId))];
  if (usuarioIds.length === 0) return 0;

  const { count } = await prisma.proyectoMiembro.createMany({
    data: usuarioIds.map((usuarioId) => ({ proyectoId, usuarioId })),
    skipDuplicates: true,
  });
  return count;
}
