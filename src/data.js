export const GOAL_MINUTES = 240 * 60;
export const STORAGE_KEY = 'mi-practica.entries.v1';

export function progressPercent(minutes) {
  return Math.min(100, Math.floor(minutes / GOAL_MINUTES * 1000) / 10);
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function durationMinutes(start, end, breakMinutes = 0, overnight = false) {
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!validTime.test(start) || !validTime.test(end)) throw new Error('Introduce una hora de entrada y de salida válidas.');
  const toMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const elapsed = toMinutes(end) - toMinutes(start) + (overnight ? 1440 : 0);
  if (elapsed <= 0 || elapsed > 1440) throw new Error('La salida debe ser posterior a la entrada. Si terminas al día siguiente, marca la casilla correspondiente.');
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes >= elapsed) throw new Error('El descanso debe ser menor que la duración de la jornada.');
  return elapsed - breakMinutes;
}

export function validateEntry(input) {
  const date = String(input.date || '');
  const parsed = new Date(`${date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || localDate(parsed) !== date) throw new Error('Selecciona una fecha válida.');
  if (date > localDate()) throw new Error('Solo puedes registrar jornadas de hoy o de días anteriores.');
  const description = String(input.description || '').trim();
  if (!description) throw new Error('Cuéntanos qué hiciste durante tus prácticas.');
  if (description.length > 1000) throw new Error('La descripción puede tener hasta 1000 caracteres.');
  const breakMinutes = Number(input.breakMinutes ?? 0);
  const overnight = input.overnight === true;
  durationMinutes(input.start, input.end, breakMinutes, overnight);
  return { date, start: input.start, end: input.end, breakMinutes, overnight, description };
}

export function totalMinutes(entries) {
  return entries.reduce((total, entry) => total + durationMinutes(entry.start, entry.end, entry.breakMinutes, entry.overnight), 0);
}

export function overlaps(candidate, entries, ignoredId = '') {
  const interval = e => {
    const start = new Date(`${e.date}T${e.start}:00`).getTime();
    const end = new Date(`${e.date}T${e.end}:00`);
    if (e.overnight) end.setDate(end.getDate() + 1);
    return [start, end.getTime()];
  };
  const [a, b] = interval(candidate);
  return entries.some(entry => {
    const [c, d] = interval(entry);
    return entry.id !== ignoredId && a < d && c < b;
  });
}

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h${rest ? ` ${rest} min` : ''}`;
}

export function csvExport(entries) {
  const quote = value => `"${String(value).replace(/"/g, '""')}"`;
  const safeText = value => /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
  const rows = [['Fecha', 'Entrada', 'Salida', 'Salida al día siguiente', 'Descanso (min)', 'Horas netas', 'Descripción'],
    ...entries.map(e => [e.date, e.start, e.end, e.overnight ? 'Sí' : 'No', e.breakMinutes, (durationMinutes(e.start, e.end, e.breakMinutes, e.overnight) / 60).toFixed(2), safeText(e.description)])];
  return '\uFEFF' + rows.map(row => row.map(quote).join(';')).join('\r\n');
}
