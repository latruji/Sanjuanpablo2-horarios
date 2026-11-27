export const LEVELS = {
  Inicial: {
    label: 'Nivel Inicial',
    turns: {
      'Ma\u00f1ana': ['Sala de 3', 'Sala de 4', 'Sala de 5'],
      'Tarde': ['Sala de 4', 'Sala de 5'],
    },
  },
  Primario: {
    label: 'Nivel Primario',
    turns: {
      'Ma\u00f1ana': ['1\u00b0 Grado', '2\u00b0 Grado', '3\u00b0 Grado', '4\u00b0 Grado', '5\u00b0 Grado', '6\u00b0 Grado'],
      'Tarde': ['1\u00b0 Grado', '2\u00b0 Grado', '3\u00b0 Grado', '4\u00b0 Grado', '5\u00b0 Grado', '6\u00b0 Grado'],
    },
  },
  Secundario: {
    label: 'Nivel Secundario',
    turns: {
      'Ma\u00f1ana': ['1\u00b0 A\u00f1o', '2\u00b0 A\u00f1o', '3\u00b0 A\u00f1o', '4\u00b0 A\u00f1o', '5\u00b0 A\u00f1o', '6\u00b0 A\u00f1o'],
    },
  },
};

export const NOTICE_TYPES = {
  entrada_tarde: {
    label: 'Entrada Tarde',
    shortLabel: 'Entrada Tarde',
    allowedLevels: ['Secundario'],
    badgeClass: 'badge-warning',
    calendarColorId: '5',
  },
  salida_anticipada: {
    label: 'Salida Anticipada',
    shortLabel: 'Salida Anticipada',
    allowedLevels: ['Secundario'],
    badgeClass: 'badge-danger',
    calendarColorId: '11',
  },
  salida_educativa: {
    label: 'Salida Educativa',
    shortLabel: 'Salida Educativa',
    allowedLevels: ['Inicial', 'Primario', 'Secundario'],
    badgeClass: 'badge-primary',
    calendarColorId: '9',
  },
  otros: {
    label: 'Otros (Reuniones / Visitas)',
    shortLabel: 'Otros',
    allowedLevels: [],
    badgeClass: 'badge-neutral',
    calendarColorId: '7',
  },
};

export function getTodayArgentina() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatDateAR(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}