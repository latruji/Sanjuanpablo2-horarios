// -----------------------------------------------------------------------
// EDITAR ACÁ las listas de correos autorizados.
// No hace falta tocar nada más del código para agregar o sacar gente.
// -----------------------------------------------------------------------

// Administración: pueden INGRESAR / MODIFICAR eventos de horarios
export const ADMIN_EMAILS = [
  "trujilloluis66@gmail.com",
  "juanpabloiisecretaria@gmail.com",
];

// Porteros: RECIBEN los eventos en su Google Calendar + notificación push
export const PORTERO_EMAILS = [
  "trujilloluis66@gmail.com",
  "portero2@gmail.com",
];

export function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

export function isPortero(email) {
  if (!email) return false;
  return PORTERO_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}