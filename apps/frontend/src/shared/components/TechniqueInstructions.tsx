export interface InstructionStep {
  texto: string;
  /** Línea opcional: dónde se hace ese paso dentro de la herramienta. */
  enLaHerramienta?: string;
}

/** Lista de pasos que comparten las cinco técnicas. */
export type InstructionList = Array<string | InstructionStep>;

/**
 * Lista numerada de pasos de "Cómo trabajar con X". Es el único formato de
 * instrucciones de las cinco técnicas: cada paso puede llevar, además, la línea
 * "En la herramienta:" con el sitio exacto donde se hace.
 */
export function TechniqueInstructions({ steps }: { steps: InstructionList }) {
  return (
    <ol>
      {steps.map((step, index) => {
        const texto = typeof step === 'string' ? step : step.texto;
        const donde = typeof step === 'string' ? undefined : step.enLaHerramienta;
        return (
          <li key={`${index}-${texto}`}>
            {texto}
            {donde ? <span className="technique-step-where">En la herramienta: {donde}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
