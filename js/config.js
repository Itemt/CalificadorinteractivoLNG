const CONFIG = {
  LEVELS: ['P', 'A', 'S'],
  LEVEL_LABEL: { S: 'Superior', A: 'Alto', P: 'En Proceso' },
  LEVEL_EMOJI: { S: '⭐', A: '🔥', P: '🌱' },
  DIMS: ['conceptos', 'practica', 'comportamiento', 'autoevaluacion'],
  DIM_LABEL: {
    conceptos: '📚 C. Cognitivo (Conceptos)',
    practica: '🛠️ C. Praxiológico (Práctica)',
    comportamiento: '🤝 C. Axiológico (Comportamiento)',
    autoevaluacion: '🙋 Autoevaluación'
  },
  PERIODS: [
    { id: 'inicial', label: 'Inicial' },
    { id: 'basico', label: 'Básico' },
    { id: 'alto', label: 'Nivel Alto' },
    { id: 'superior', label: 'Superior' }
  ]
};
