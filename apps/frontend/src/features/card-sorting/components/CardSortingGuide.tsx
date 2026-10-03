interface GuideStep {
  title: string;
  text: string;
  where: string;
}

// Los 8 pasos del curso. `where` dice dónde se hace cada uno en la herramienta
// y, cuando aún no está disponible, lo dice con honestidad.
const STEPS: GuideStep[] = [
  {
    title: 'Inventario de contenidos',
    text: 'Arma una lista con las secciones principales y subsecciones que componen tu proyecto.',
    where: 'Es el trabajo previo a crear el estudio.',
  },
  {
    title: 'Definir el usuario para el test',
    text: 'Usa un usuario real. Puede participar de forma individual o en grupo de 3 personas.',
    where: 'Comparte el enlace del estudio. Hoy cada enlace se completa de forma individual.',
  },
  {
    title: 'Crear las tarjetas',
    text: 'Una tarjeta por módulo o concepto, en el lenguaje de tus usuarios.',
    where: 'Campo "Tarjetas", una por línea.',
  },
  {
    title: 'Registrar los resultados',
    text: 'Se cuenta cuántas veces una tarjeta aparece relacionada con una categoría.',
    where: 'Resultados → "Matriz de resultados" y "Ubicaciones populares".',
  },
  {
    title: 'Realizar las pruebas',
    text: 'Cada usuario recibe las tarjetas y las agrupa, jerarquiza y nombra como le parezca más apropiado.',
    where: 'Prueba el workspace antes de compartir. Hoy se agrupa y se nombra; jerarquizar aún no está disponible.',
  },
  {
    title: 'Hacer preguntas',
    text: 'Pregunta al participante para entender sus decisiones.',
    where: 'Campo "Preguntas para el participante" al crear el estudio (hasta 5, opcionales). Las respuestas están en Resultados → "Respuestas".',
  },
  {
    title: 'Registrar la disposición final',
    text: 'Queda guardada la ubicación final de cada tarjeta cuando el participante envía.',
    where: 'Resultados → "Tarjetas" y "Categorías".',
  },
  {
    title: 'Extraer conclusiones',
    text: 'Una regla es considerar las tarjetas que aparecieron en una misma categoría más del 50% de las veces.',
    where: 'Resultados → "Agrupaciones dominantes" y "Sin consenso".',
  },
];

export function CardSortingGuide() {
  return (
    <ol className="cs-guide-list" aria-label="Pasos para realizar un card sorting">
      {STEPS.map((step, index) => (
        <li key={step.title}>
          <details>
            <summary>
              <span className="cs-guide-n" aria-hidden="true">{index + 1}</span>
              {step.title}
            </summary>
            <p>{step.text}</p>
            <p className="cs-guide-where">{step.where}</p>
          </details>
        </li>
      ))}
    </ol>
  );
}
