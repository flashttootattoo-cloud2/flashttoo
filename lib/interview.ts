export const INTERVIEW_QUESTIONS = [
  { key: 'q1', label: '¿Cómo empezaste a tatuar?' },
  { key: 'q2', label: '¿Qué te inspiró a elegir tu estilo?' },
  { key: 'q3', label: '¿Cómo es trabajar con vos? ¿Cómo arrancás con un cliente nuevo?' },
  { key: 'q4', label: '¿Qué tipo de proyectos te apasionan más?' },
  { key: 'q5', label: '¿Cómo preparás un diseño antes de tatuar?' },
  { key: 'q6', label: '¿Cuál es el tatuaje del que más orgulloso/a estás?' },
  { key: 'q7', label: '¿Qué le recomendás a alguien que se va a tatuar por primera vez?' },
  { key: 'q8', label: '¿Cómo es el ambiente en tu espacio de trabajo?' },
] as const

export type InterviewKey = typeof INTERVIEW_QUESTIONS[number]['key']
