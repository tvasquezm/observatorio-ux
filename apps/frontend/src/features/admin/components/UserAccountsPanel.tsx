import { useState } from 'react';
import { useAccounts, useUpdateUserRole } from '../hooks/useUsersQueries';
import type { EvaluatorRole } from '../../auth/api/auth.api';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useConfirm } from '../../../shared/api/confirm';

const ROLE_LABELS: Record<EvaluatorRole, string> = {
  ESTUDIANTE: 'Estudiante',
  DOCENTE: 'Docente',
  ADMIN: 'Administrador',
};

export function UserAccountsPanel() {
  const currentUser = useAuthStore((state) => state.user);
  const confirm = useConfirm();
  const { data: accounts, isLoading, isError, error, refetch } = useAccounts();
  const updateRole = useUpdateUserRole();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const query = search.trim().toLocaleLowerCase('es');
  const filtered = accounts?.filter((account) => (!role || account.rol === role)
    && `${account.nombre} ${account.email}`.toLocaleLowerCase('es').includes(query));

  async function handleRoleChange(id: string, nombre: string, rol: EvaluatorRole) {
    const accepted = await confirm(
      `¿Cambiar el rol de "${nombre}" a ${ROLE_LABELS[rol].toLowerCase()}?`,
    );
    if (accepted) updateRole.mutate({ id, rol });
  }

  return (
    <section className="panel admin-section" aria-labelledby="accounts-title">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Permisos</span>
          <h2 id="accounts-title">Cuentas y roles</h2>
          <p className="section-description">Encuentra una persona y ajusta su nivel de acceso.</p>
        </div>
        <span className="count">{accounts?.length ?? 0}</span>
      </div>

      {isLoading && <div className="loading-block" aria-label="Cargando cuentas" />}
      {isError && (
        <div className="inline-state inline-state--error" role="alert">
          <p>{error instanceof Error ? error.message : 'No se pudieron cargar las cuentas.'}</p>
          <button type="button" className="secondary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}
      {accounts && <>
        <div className="admin-account-filters">
          <label className="field" htmlFor="account-search">Buscar cuentas
            <input id="account-search" type="search" placeholder="Nombre o correo" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="field" htmlFor="account-filter-role">Filtrar por rol
            <select id="account-filter-role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">Todos los roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <p className="admin-filter-count" role="status">{filtered?.length} de {accounts.length} cuentas</p>
        {filtered?.length ? (
        <div className="table-shell">
          <table className="data-table admin-table">
            <caption className="sr-only">Cuentas registradas y sus roles</caption>
            <thead>
              <tr><th>Persona</th><th>Correo</th><th>Rol</th><th>Registro</th></tr>
            </thead>
            <tbody>
              {filtered.map((account) => {
                const isCurrentAccount = account.id === currentUser?.id;
                return (
                  <tr key={account.id}>
                    <td>
                      <span className="person-cell">
                        <span className="person-avatar">{account.nombre.charAt(0).toUpperCase()}</span>
                        <span><strong>{account.nombre}</strong>{isCurrentAccount && <small>Cuenta actual</small>}</span>
                      </span>
                    </td>
                    <td>{account.email}</td>
                    <td>
                      <label className="sr-only" htmlFor={`account-role-${account.id}`}>
                        Rol de {account.nombre}
                      </label>
                      <select
                        id={`account-role-${account.id}`}
                        className="admin-role-select"
                        value={account.rol}
                        disabled={isCurrentAccount || updateRole.isPending}
                        onChange={(event) =>
                          handleRoleChange(account.id, account.nombre, event.target.value as EvaluatorRole)
                        }
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(account.createdAt).toLocaleDateString('es-CL')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        ) : <div className="empty-state empty-state--compact">
          <p>No hay cuentas que coincidan con los filtros.</p>
          <button type="button" className="secondary" onClick={() => { setSearch(''); setRole(''); }}>Limpiar filtros</button>
        </div>}
      </>}
    </section>
  );
}
