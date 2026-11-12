import test from 'node:test';
import assert from 'node:assert/strict';
import { localDate, durationMinutes, validateEntry, totalMinutes, overlaps, csvExport, formatDuration, progressPercent } from './data.js';

const entry = { id: 'one', date: '2026-01-12', start: '09:00', end: '17:00', breakMinutes: 60, overnight: false, description: 'Apoyo al equipo' };

test('solo muestra el 100% cuando se completan las 240 horas', () => {
  assert.equal(progressPercent(14399), 99.9);
  assert.equal(progressPercent(14400), 100);
  assert.equal(progressPercent(15000), 100);
  assert.equal(progressPercent(0), 0);
});

test('calcula minutos exactos y descuenta el descanso', () => {
  assert.equal(durationMinutes('08:10', '16:45', 45), 470);
  assert.equal(formatDuration(470), '7 h 50 min');
  assert.equal(totalMinutes([entry, { ...entry, start: '08:00', end: '09:30', breakMinutes: 0 }]), 510);
});

test('distingue horarios invertidos de jornadas nocturnas explícitas', () => {
  assert.throws(() => durationMinutes('22:00', '06:00'), /salida/);
  assert.equal(durationMinutes('22:00', '06:00', 30, true), 450);
  assert.throws(() => durationMinutes('08:00', '09:00', 0, true), /salida/);
  assert.throws(() => durationMinutes('25:00', '26:00'), /válidas/);
  assert.throws(() => durationMinutes('08:00', '09:00', 60), /descanso/);
  assert.throws(() => durationMinutes('08:00', '09:00', -1), /descanso/);
});

test('valida fechas reales, evita futuros y exige descripción', () => {
  assert.equal(validateEntry(entry).description, entry.description);
  assert.throws(() => validateEntry({ ...entry, date: '2026-02-30' }), /fecha/);
  const future = new Date(); future.setDate(future.getDate() + 1);
  assert.throws(() => validateEntry({ ...entry, date: localDate(future) }), /anteriores/);
  assert.throws(() => validateEntry({ ...entry, description: '  ' }), /Cuéntanos/);
});

test('evita solapamientos, también al cruzar medianoche, permite turnos contiguos y editar', () => {
  assert.equal(overlaps({ ...entry, start: '16:00', end: '18:00' }, [entry]), true);
  assert.equal(overlaps({ ...entry, start: '17:00', end: '18:00' }, [entry]), false);
  assert.equal(overlaps(entry, [entry], 'one'), false);
  const night = { ...entry, start: '22:00', end: '06:00', overnight: true };
  assert.equal(overlaps({ ...entry, date: '2026-01-13', start: '05:00', end: '07:00' }, [night]), true);
  assert.equal(overlaps({ ...entry, date: '2026-01-13', start: '06:00', end: '07:00' }, [night]), false);
});

test('exporta CSV con comillas, saltos de línea y protección de fórmulas', () => {
  const csv = csvExport([{ ...entry, description: '=SUM(1;2)\n"Prueba"' }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"7.00"'));
  assert.ok(csv.includes('"\'=SUM(1;2)\n""Prueba"""'));
});
