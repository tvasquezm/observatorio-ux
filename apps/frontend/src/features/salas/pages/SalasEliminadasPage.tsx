// apps/frontend/src/features/salas/pages/SalasEliminadasPage.tsx
//
// Fase 2: salas soft-deleted dentro de la ventana de recuperación (20
// días). DOCENTE dueño ve las suyas, ADMIN ve todas. Hard delete
// definitivo es solo ADMIN (el backend lo exige igual, esto es defensa
// en profundidad de UI).

import { Link } from 'react-router-dom';
import {
  useSalasEliminadas,
  useRestoreSala,
  useHardDeleteSala,
} from '../hooks/useSalasQueries';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { resolvePerspective } from '../../../shared/auth/perspectivas';
import { useConfirm } from '../../../shared/api/confirm';

const DIAS_VENTANA_RECUPERACION = 20;

function diasRestantes(deletedAt?: string | null): number | null {
  if (!deletedAt) return null;
  const eliminado = new Date(deletedAt).getTime();
  const limite = eliminado + DIAS_VENTANA_RECUPERACION * 24 * 60 * 60 * 1000;
  const restantes = Math.ceil((limite - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(restantes, 0);
}

export function SalasEliminadasPage() {
  const { user, perspectiveRole } = useAuthStore();
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const esAdmin = activeRole === 'ADMIN';
  const { data: salas, isLoading } = useSalasEliminadas();
  const { mutate: restaurar } = useRestoreSala();
  const { mutate: eliminarDefinitivo } = useHardDeleteSala();
  const confirm = useConfirm();

  async function handleHardDelete(id: string, nombre: string) {
    if (
      await confirm(
        `Esto borra "${nombre}" de forma DEFINITIVA (sala, proyectos, sesiones y evidencia asociada). No se puede deshacer. ¿Continuar?`,
      )
    ) {
      eliminarDefinitivo(id);
    }
  }

  return (
    <div className="salas-page recycle-page">
      <div className="salas-header">
        <div>
          <span className="eyebrow">Recuperación</span>
          <h1>Salas eliminadas</h1>
          <p>Las salas permanecen disponibles durante {DIAS_VENTANA_RECUPERACION} días antes de vencer.</p>
        </div>
        <Link to="/salas" className="secondary button-like">← Volver a mis salas</Link>
      </div>

      <div className="recovery-note">
        <strong>Recuperación segura</strong>
        <span>Restaurar una sala recupera también sus proyectos, sesiones y evidencia asociada.</span>
      </div>

      {isLoading && <div className="loading-block" aria-label="Cargando salas eliminadas" />}
      {!isLoading && salas?.length === 0 && (
        <div className="empty-state"><strong>No hay salas eliminadas</strong><p>Cuando elimines una sala, aparecerá temporalmente en este espacio.</p><Link to="/salas" className="secondary button-like">Volver a salas</Link></div>
      )}

      {!isLoading && !!salas?.length && (
        <div className="table-shell"><table className="data-table recovery-table">
          <caption className="sr-only">Salas disponibles para recuperar</caption>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Período</th>
              <th>Días restantes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {salas.map((sala) => {
              const restantes = diasRestantes(sala.deletedAt);
              const vencida = restantes === 0;
              return (
                <tr key={sala.id}>
                  <td>{sala.nombre}</td>
                  <td>{sala.periodo}</td>
                  <td><span className={vencida ? 'recovery-days expired' : 'recovery-days'}>{vencida ? 'Vencida' : `${restantes} ${restantes === 1 ? 'día' : 'días'}`}</span></td>
                  <td>
                    <div className="table-actions">
                      {!vencida && (
                        <button type="button" className="secondary" onClick={() => restaurar(sala.id)}>
                          Recuperar
                        </button>
                      )}
                      {esAdmin && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleHardDelete(sala.id, sala.nombre)}
                        >
                          Eliminar definitivo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
