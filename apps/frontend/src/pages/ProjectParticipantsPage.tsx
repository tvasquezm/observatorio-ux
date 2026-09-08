// apps/frontend/src/pages/ProjectParticipantsPage.tsx
//
// Whitelist de participantes (sujetos de estudio) — distinto de
// ProjectMembersPage.tsx (colaboradores evaluadores). Sin una entrada acá,
// AuthService.registerParticipant (backend) rechaza el autorregistro con
// 403: es el paso obligatorio antes de que cualquier participante pueda
// unirse a un estudio (card sorting, evaluación heurística, etc).
//
// El backend no expone un endpoint para quitar una entrada de la
// whitelist (solo POST/GET) — por eso esta página no tiene acción
// "Quitar", a diferencia de Miembros.

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { useWhitelist, useAddToWhitelist } from '../features/projects/hooks/useProjectsQueries';

export function ProjectParticipantsPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data: participantes, isLoading, isError, error } = useWhitelist(proyectoId);
  const { mutate: agregar, isPending: isAdding } = useAddToWhitelist(proyectoId);

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [bulkTexto, setBulkTexto] = useState('');
  const [modo, setModo] = useState<'individual' | 'bulk'>('individual');

  function handleAgregarIndividual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const limpio = email.trim();
    if (!limpio) return;
    agregar([{ email: limpio, nombre: nombre.trim() || undefined }], {
      onSuccess: () => {
        setEmail('');
        setNombre('');
      },
    });
  }

  function handleAgregarBulk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Una línea por participante: "email" o "email, nombre".
    const entradas = bulkTexto
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean)
      .map((linea) => {
        const [emailCrudo, ...resto] = linea.split(',');
        return { email: emailCrudo.trim(), nombre: resto.join(',').trim() || undefined };
      })
      .filter((p) => p.email.length > 0);

    if (entradas.length === 0) return;
    agregar(entradas, { onSuccess: () => setBulkTexto('') });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Participantes autorizados</h2>
      </div>

      <p className="hint-block">
        Solo las personas en esta lista pueden autorregistrarse y unirse a los estudios de este
        proyecto (card sorting, evaluación heurística, etc.). Sin agregarlas aquí, el registro del
        participante devuelve error de autorización.
      </p>

      <div className="form-row-inline" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={modo === 'individual' ? 'primary' : 'secondary'}
          onClick={() => setModo('individual')}
        >
          Agregar uno
        </button>
        <button
          type="button"
          className={modo === 'bulk' ? 'primary' : 'secondary'}
          onClick={() => setModo('bulk')}
        >
          Agregar varios
        </button>
      </div>

      {modo === 'individual' && (
        <form onSubmit={handleAgregarIndividual} className="form-row-inline">
          <input
            type="email"
            placeholder="Email del participante"
            aria-label="Email del participante"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            className="input-flex"
          />
          <input
            type="text"
            placeholder="Nombre (opcional)"
            aria-label="Nombre del participante"
            value={nombre}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombre(e.target.value)}
            className="input-flex"
          />
          <button type="submit" className="primary" disabled={isAdding}>
            {isAdding ? 'Agregando…' : '+ Agregar'}
          </button>
        </form>
      )}

      {modo === 'bulk' && (
        <form onSubmit={handleAgregarBulk} className="form-grid" style={{ maxWidth: 480 }}>
          <label className="field">
            Un participante por línea — <code>email</code> o <code>email, nombre</code>
            <textarea
              placeholder={'ana@utem.cl\nbruno@utem.cl, Bruno Soto'}
              aria-label="Lista de participantes a agregar"
              value={bulkTexto}
              onChange={(e) => setBulkTexto(e.target.value)}
              className="textarea-md"
            />
          </label>
          <button type="submit" className="primary" disabled={isAdding}>
            {isAdding ? 'Agregando…' : '+ Agregar lista'}
          </button>
        </form>
      )}

      {isLoading && <p>Cargando…</p>}
      {isError && <p className="error-text">{(error as Error).message}</p>}

      <div className="list-stack mt-16">
        {participantes?.map((p) => (
          <div key={p.id} className="entity-card row-between">
            <div>
              <b>{p.nombre ?? p.email}</b>
              {p.nombre && <div className="text-muted-sm">{p.email}</div>}
            </div>
            <span className={`badge ${p.usado ? 'minor' : 'cosmetic'}`}>
              {p.usado ? 'Ya se registró' : 'Pendiente'}
            </span>
          </div>
        ))}
        {participantes && participantes.length === 0 && (
          <p>Todavía no hay participantes autorizados para este proyecto.</p>
        )}
      </div>
    </div>
  );
}
