export const LEVELS = {
  Inicial: {
    label: 'Nivel Inicial',
    turns: {
      Mañana: ['Sala de 3', 'Sala de 4', 'Sala de 5'],
      Tarde: ['Sala de 4', 'Sala de 5'],
    },
  },
  Primario: {
    label: 'Nivel Primario',
    turns: {
      Mañana: ['1° Grado', '2° Grado', '3° Grado', '4° Grado', '5° Grado', '6° Grado'],
      Tarde: ['1° Grado', '2° Grado', '3° Grado', '4° Grado', '5° Grado', '6° Grado'],
    },
  },
  Secundario: {
    label: 'Nivel Secundario',
    turns: {
      Mañana: ['1° Año', '2° Año', '3° Año', '4° Año', '5° Año', '6° Año'],
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