import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';

/**
 * H5 (Fase 7, PLAN_REMEDIACION_AUDITORIA.md): `accessParticipant` crea un
 * `Participante` antes de que exista consentimiento o sesión (acceso
 * abierto por link/QR). Quien entra y abandona sin aceptar el
 * consentimiento ni unirse a un estudio queda como fila huérfana para
 * siempre. Este job la limpia cada hora.
 *
 * Nunca toca un participante con consentimiento o sesión real, sin
 * importar su antigüedad.
 */
@Injectable()
export class ParticipantesCleanupService {
  private readonly logger = new Logger(ParticipantesCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async limpiarHuerfanos() {
    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);

    const { count } = await this.prisma.participante.deleteMany({
      where: {
        createdAt: { lt: haceUnaHora },
        consentimientos: { none: {} },
        sesiones: { none: {} },
      },
    });

    if (count > 0) {
      this.logger.log(`Limpieza horaria: ${count} participante(s) anónimo(s) huérfano(s) eliminado(s).`);
    }
  }
}
