import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TechniqueProcess, type ProcessStep } from './TechniqueProcess';

const steps: ProcessStep[] = [
  { id: 'a', label: 'Perfil', detail: 'Ana', done: true },
  { id: 'b', label: 'Fases', detail: '2 fases', done: false },
  { id: 'c', label: 'Evidencia', done: false },
];

describe('TechniqueProcess', () => {
  it('muestra solo la fase actual y deja la lista completa para lectores de pantalla', () => {
    render(<TechniqueProcess steps={steps} title="Proceso demo" />);
    expect(screen.getByRole('region', { name: 'Proceso demo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1 de 3' })).toBeInTheDocument();
    expect(screen.getByText('Fase 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('2 fases')).toBeInTheDocument();
    expect(document.querySelector('.tv-process-fase')).toHaveTextContent('Fases');
    expect(document.querySelector('.tv-process-fase')).not.toHaveTextContent('Perfil');
    expect(document.querySelector('.tv-process-fase')).not.toHaveTextContent('Evidencia');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).not.toHaveAttribute('aria-current');
  });

  it('reemplaza la fase anterior por la siguiente al avanzar', () => {
    const { rerender } = render(<TechniqueProcess steps={steps} />);
    expect(screen.getByText('Fase 2 de 3')).toBeInTheDocument();
    rerender(
      <TechniqueProcess steps={steps.map((step, i) => ({ ...step, done: i < 2 }))} />,
    );
    expect(screen.queryByText('Fase 2 de 3')).not.toBeInTheDocument();
    expect(screen.getByText('Fase 3 de 3')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2 de 3' })).toBeInTheDocument();
  });

  it('no marca ninguno como actual cuando todo está completo', () => {
    render(<TechniqueProcess steps={steps.map((step) => ({ ...step, done: true }))} />);
    expect(screen.getByRole('img', { name: '3 de 3, completo' })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Técnica completa y lista para usar');
    expect(document.querySelector('.tv-process-fase')).toBeNull();
    expect(screen.getByRole('region')).toHaveClass('tv-process--listo');
  });

  it('permite un texto propio al estar lista', () => {
    render(<TechniqueProcess steps={steps.map((step) => ({ ...step, done: true }))} textoListo="Persona lista" />);
    expect(screen.getByRole('status')).toHaveTextContent('Persona lista');
  });

  describe('fases opcionales', () => {
    const conOpcionales: ProcessStep[] = [
      { id: 'a', label: 'Perfil', done: true },
      { id: 'b', label: 'Objetivo', detail: 'Sin definir', done: false, opcional: true },
      { id: 'c', label: 'Fases', done: true },
      { id: 'd', label: 'Evidencia', detail: 'Sin evidencia', done: false, opcional: true },
    ];

    it('queda lista con solo los pasos obligatorios y el círculo cuenta solo esos', () => {
      render(<TechniqueProcess steps={conOpcionales} />);
      expect(screen.getByRole('img', { name: '2 de 2 obligatorios, completo' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Técnica completa y lista para usar');
      expect(screen.getByRole('region')).toHaveClass('tv-process--listo');
    });

    it('indica que la fase actual es opcional', () => {
      render(<TechniqueProcess steps={conOpcionales} />);
      expect(screen.getByText('Fase 2 de 4')).toBeInTheDocument();
      expect(screen.getByText('Opcional')).toBeInTheDocument();
      expect(screen.getByText('Puedes cerrar la técnica sin esta fase.')).toBeInTheDocument();
    });

    it('no marca opcional una fase obligatoria', () => {
      render(<TechniqueProcess steps={steps} />);
      expect(screen.queryByText('Opcional')).not.toBeInTheDocument();
    });

    it('prioriza la fase obligatoria pendiente sobre una opcional anterior', () => {
      render(<TechniqueProcess steps={conOpcionales.map((s) => (s.id === 'c' ? { ...s, done: false } : s))} />);
      expect(screen.getByText('Fase 3 de 4')).toBeInTheDocument();
      expect(screen.queryByText('Opcional')).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: '1 de 2 obligatorios' })).toBeInTheDocument();
    });

    it('ofrece el cuadro con la técnica sin terminar y distingue obligatorias de opcionales', () => {
      render(<TechniqueProcess steps={conOpcionales.map((s) => (s.id === 'c' ? { ...s, done: false } : s))} />);
      fireEvent.click(screen.getByRole('button', { name: 'Faltan 3 fases' }));
      const cuadro = screen.getByText('Fases que faltan').parentElement!;
      expect(cuadro).toHaveTextContent('FasesObligatoria');
      expect(cuadro).toHaveTextContent('ObjetivoOpcional');
      expect(cuadro).toHaveTextContent('EvidenciaOpcional');
    });

    it('muestra al tocar un cuadro con las fases opcionales que faltan y se cierra', () => {
      render(<TechniqueProcess steps={conOpcionales} />);
      const boton = screen.getByRole('button', { name: 'Faltan 2 fases opcionales' });
      expect(boton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Fases que faltan')).not.toBeInTheDocument();
      fireEvent.click(boton);
      expect(boton).toHaveAttribute('aria-expanded', 'true');
      const cuadro = screen.getByText('Fases que faltan').parentElement!;
      expect(cuadro).toHaveTextContent('Objetivo');
      expect(cuadro).toHaveTextContent('Evidencia');
      expect(cuadro).not.toHaveTextContent('Perfil');
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('Fases que faltan')).not.toBeInTheDocument();
      fireEvent.click(boton);
      fireEvent.click(boton);
      expect(screen.queryByText('Fases que faltan')).not.toBeInTheDocument();
      fireEvent.click(boton);
      fireEvent.pointerDown(document.body);
      expect(screen.queryByText('Fases que faltan')).not.toBeInTheDocument();
    });

    it('lo muestra al pasar el mouse y lo oculta al salir', () => {
      render(<TechniqueProcess steps={conOpcionales} />);
      const contenedor = screen.getByRole('button', { name: /Faltan/ }).parentElement!;
      const puntero = (tipo: string) => {
        const evento = new Event(tipo, { bubbles: true });
        Object.defineProperty(evento, 'pointerType', { value: 'mouse' });
        fireEvent(contenedor, evento);
      };
      puntero('pointerover');
      expect(screen.getByText('Fases que faltan')).toBeInTheDocument();
      puntero('pointerout');
      expect(screen.queryByText('Fases que faltan')).not.toBeInTheDocument();
    });

    it('rotula el anillo como obligatorios solo si hay fases opcionales', () => {
      const { unmount } = render(<TechniqueProcess steps={conOpcionales} />);
      expect(document.querySelector('.tv-process-oblig')).toHaveTextContent('2 de 2 obligatorios');
      unmount();
      render(<TechniqueProcess steps={steps} />);
      expect(document.querySelector('.tv-process-oblig')).toBeNull();
    });

    it('no ofrece el cuadro cuando no falta ninguna fase', () => {
      render(<TechniqueProcess steps={conOpcionales.map((s) => ({ ...s, done: true }))} />);
      expect(screen.queryByRole('button', { name: /Falta/ })).not.toBeInTheDocument();
    });
  });

  describe('pasoActual (numeración del formulario)', () => {
    it('numera como Paso K de N según el paso abierto, no el primero pendiente', () => {
      render(<TechniqueProcess steps={steps} pasoActual={2} />);
      expect(screen.getByText('Paso 3 de 3')).toBeInTheDocument();
      expect(screen.queryByText(/^Fase /)).toBeNull();
      expect(document.querySelector('.tv-process-fase')).toHaveTextContent('Evidencia');
      expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
      expect(screen.getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
    });

    it('sigue mostrando el paso abierto aunque la técnica esté completa', () => {
      render(<TechniqueProcess steps={steps.map((s) => ({ ...s, done: true }))} pasoActual={0} />);
      expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Técnica completa y lista para usar');
    });

    it('con un índice fuera de rango vuelve a la numeración por datos', () => {
      render(<TechniqueProcess steps={steps} pasoActual={9} />);
      expect(screen.getByText('Fase 2 de 3')).toBeInTheDocument();
    });
  });

  it('aplica la variante compacta', () => {
    render(<TechniqueProcess steps={steps} compact />);
    expect(screen.getByRole('region')).toHaveClass('tv-process--compact');
  });
});
