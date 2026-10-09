// apps/frontend/src/layouts/ProjectMenu.tsx
//
// Menú de secciones de un proyecto. Móvil: <details> único. Escritorio: barra
// compacta con un botón por grupo y un panel flotante (uno abierto a la vez).
// Los botones salen de `groups`: un grupo nuevo agrega un botón sin tocar nada más.

import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../shared/components/ui/Icon';
import type { SeccionProyecto } from './project-sections';

export interface MenuGroup {
  title: string;
  items: SeccionProyecto[];
}

interface ProjectMenuProps {
  groups: MenuGroup[];
  current?: SeccionProyecto;
  currentLabel: string;
  compact: boolean;
}

export function ProjectMenu({ groups, current, currentLabel, compact }: ProjectMenuProps) {
  return compact
    ? <MobileMenu groups={groups} currentLabel={currentLabel} />
    : <DesktopMenu groups={groups} current={current} currentLabel={currentLabel} />;
}

function MobileMenu({ groups, currentLabel }: Pick<ProjectMenuProps, 'groups' | 'currentLabel'>) {
  const { key } = useLocation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!menuRef.current) return;
    if (menuRef.current.contains(document.activeElement)) menuRef.current.querySelector('summary')?.focus();
    menuRef.current.open = false;
  }, [key]);
  return (
    <details ref={menuRef} className="project-menu" onKeyDown={(event) => {
      if (event.key !== 'Escape') return;
      event.currentTarget.open = false;
      event.currentTarget.querySelector('summary')?.focus();
    }}>
      <summary><span>Secciones del proyecto</span><strong>{currentLabel}</strong></summary>
      <nav aria-label="Secciones del proyecto">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `project-menu-link${isActive ? ' active' : ''}`}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
    </details>
  );
}

function DesktopMenu({ groups, current, currentLabel }: Omit<ProjectMenuProps, 'compact'>) {
  const { key } = useLocation();
  const uid = useId();
  const rootRef = useRef<HTMLElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    if (rootRef.current?.contains(document.activeElement)) {
      rootRef.current.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus();
    }
    setOpenGroup(null);
  }, [key]);
  useEffect(() => {
    if (openGroup === null) return;
    const closeIfOutside = (event: Event) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpenGroup(null);
    };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('focusin', closeIfOutside);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('focusin', closeIfOutside);
    };
  }, [openGroup]);

  return (
    <nav
      ref={rootRef}
      className="pm"
      data-open={openGroup !== null || undefined}
      aria-label="Secciones del proyecto"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || openGroup === null) return;
        const trigger = triggers.current[openGroup];
        setOpenGroup(null);
        trigger?.focus();
      }}
    >
      <div className="pm-now">
        <span className="pm-now-label">Sección</span>
        <span className="pm-now-name">
          {current && <Icon name={current.icon} size={18} />}
          <strong>{currentLabel}</strong>
        </span>
      </div>
      <div className="pm-groups">
        {groups.map((group, index) => {
          const isOpen = openGroup === group.title;
          const hasCurrent = !!current && group.items.includes(current);
          const panelId = `${uid}-panel-${index}`;
          return (
            <div key={group.title} className="pm-group">
              <button
                type="button"
                ref={(node) => { triggers.current[group.title] = node; }}
                className="pm-trigger"
                data-current={hasCurrent || undefined}
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                onClick={() => setOpenGroup(isOpen ? null : group.title)}
              >
                <span>{group.title}</span>
                <span className="pm-count" aria-hidden="true">{group.items.length}</span>
                {hasCurrent && <span className="sr-only">, contiene la sección actual</span>}
                <span className="pm-chevron" aria-hidden="true" />
              </button>
              {isOpen && (
                <div id={panelId} role="group" aria-label={group.title} className="pm-panel">
                  <p className="pm-panel-title" aria-hidden="true">{group.title} · {group.items.length} secciones</p>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `pm-item${isActive ? ' active' : ''}`}
                    >
                      {({ isActive }) => (
                        <>
                          <span className="pm-item-icon"><Icon name={item.icon} size={18} /></span>
                          <span className="pm-item-label">{item.label}</span>
                          {isActive && <span className="pm-item-flag" aria-hidden="true">Actual</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
