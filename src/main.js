import { GOAL_MINUTES, STORAGE_KEY, localDate, durationMinutes, validateEntry, totalMinutes, overlaps, formatDuration, csvExport, progressPercent } from './data.js';

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M5 3h13a1 1 0 0 1 1 1v17H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z"/><path d="M3 17h16M8 7h7M8 11h5"/>',
  trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7-3h6v3"/>',
  arrow: '<path d="m7 17 10-10M7 7h10v10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2m-8 3h2"/>',
  flag: '<path d="M5 21V4m0 0c4-4 10 4 14 0v10c-4 4-10-4-14 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  edit: '<path d="m14 5 5 5M4 20l5-1L20 8a2.1 2.1 0 0 0-5-5L4 14v6Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  leaf: '<path d="M20 3C8 2 2 8 6 15s15 4 14-12Z"/><path d="M4 21 15 10"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateLabel = (date, options = { day: 'numeric', month: 'short' }) => new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', options);
let storageError = '';
let entries = [];
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error('Invalid data');
    entries = parsed.map(e => {
      if (typeof e.id !== 'string' || !e.id) throw new Error('Invalid id');
      return { ...validateEntry(e), id: e.id };
    });
    if (new Set(entries.map(e => e.id)).size !== entries.length) throw new Error('Duplicate ids');
  }
} catch {
  storageError = 'No pudimos leer tus registros guardados. No se han sobrescrito. Exporta o revisa los datos del navegador antes de guardar una nueva jornada.';
}
let view = 'overview';
let weekOffset = 0;
let monthFilter = '';
let search = '';
let modalReturnFocus = null;
let toastTimer;

function sortedEntries() { return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start)); }
function persist(next) {
  if (storageError) { toast('No se guardó el cambio: hay un problema con los datos del navegador.'); return false; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); entries = next; return true; }
  catch { toast('No se pudo guardar. Comprueba el espacio y los permisos de almacenamiento del navegador.'); return false; }
}
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 4500);
}
function currentWeek() {
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7 + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return localDate(d); });
}
function weeklyCard() {
  const days = currentWeek();
  const values = days.map(day => totalMinutes(entries.filter(e => e.date === day)));
  const max = Math.max(480, ...values);
  const weekTotal = values.reduce((a, b) => a + b, 0);
  return `<section class="card week-card"><div class="section-heading"><div><h2>Tu semana, hora a hora</h2><p>Cada día es una oportunidad para avanzar.</p></div><span class="week-total">${formatDuration(weekTotal)} <span>esta semana</span></span></div>
    <div class="week-navigation"><button class="icon-button" data-week="-1" aria-label="Semana anterior">${icon('chevron', 'rotate')}</button><span>${dateLabel(days[0])} — ${dateLabel(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}</span><button class="icon-button" data-week="1" aria-label="Semana siguiente" ${weekOffset >= 0 ? 'disabled' : ''}>${icon('chevron')}</button></div>
    <div class="chart" role="img" aria-label="Horas por día: ${days.map((d, i) => `${dateLabel(d)}: ${formatDuration(values[i])}`).join(', ')}"><div class="chart-scale"><span>${Math.ceil(max / 60)} h</span><span>${Math.ceil(max / 120)} h</span><span>0 h</span></div><div class="chart-bars">${days.map((d, i) => `<div class="chart-day ${d === localDate() ? 'today' : ''}"><span class="bar-value">${values[i] ? formatDuration(values[i]) : ''}</span><div class="bar-track"><div class="bar ${values[i] ? '' : 'zero'}" style="height:${Math.max(2, values[i] / max * 100)}%"></div></div><span class="day-label">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}<small>${new Date(`${d}T12:00:00`).getDate()}</small></span></div>`).join('')}</div></div></section>`;
}
const milestones = [
  { hours: 1, title: 'El primer paso', text: 'Tu primera hora de experiencia.', symbol: 'leaf' },
  { hours: 60, title: 'Tomando impulso', text: 'Un cuarto del camino recorrido.', symbol: 'spark' },
  { hours: 120, title: 'A mitad de camino', text: '¡Ya llegaste a la mitad!', symbol: 'flag' },
  { hours: 180, title: 'La recta final', text: 'Tu meta está cada vez más cerca.', symbol: 'arrow' },
  { hours: 240, title: '¡Lo conseguiste!', text: '240 horas de crecimiento profesional.', symbol: 'trophy' },
];
function milestoneCard(item, compact = false) {
  const total = totalMinutes(entries);
  const done = total >= item.hours * 60;
  return `<div class="milestone ${done ? 'unlocked' : ''} ${compact ? 'compact' : ''}"><div class="milestone-icon">${icon(item.symbol)}</div><div><h3>${item.title}</h3><p>${compact ? `${item.hours} ${item.hours === 1 ? 'hora' : 'horas'} de prácticas` : item.text}</p></div><span class="milestone-status">${done ? icon('check') : compact ? `${item.hours} h` : icon('lock')}</span>${!compact ? `<div class="milestone-progress"><span style="width:${Math.min(100, total / (item.hours * 60) * 100)}%"></span></div><small class="milestone-detail">${done ? 'Logro conseguido' : `${formatDuration(Math.max(0, item.hours * 60 - total))} para desbloquear`}</small>` : ''}</div>`;
}
function emptyState() {
  return `<div class="empty-state"><div class="empty-icon">${icon('book')}</div><h3>Tu historia empieza con una jornada</h3><p>Registra lo que hiciste hoy y da el primer paso<br class="desktop-break"> hacia tus 240 horas de prácticas.</p><button class="button button-soft" data-new>${icon('plus')} Registrar mi primera jornada</button></div>`;
}
function recordsTable(list) {
  if (!list.length) return entries.length && view === 'records' ? '<div class="empty-state"><div class="empty-icon">'+icon('book')+'</div><h3>No hay coincidencias</h3><p>Prueba con otro mes o cambia tu búsqueda.</p></div>' : emptyState();
  return `<div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Jornada</th><th>Descripción</th><th>Tiempo</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${list.map(e => `<tr><td><span class="record-date">${dateLabel(e.date, { day: '2-digit', month: 'short' })}</span><small>${dateLabel(e.date, { weekday: 'long' })}</small></td><td><span class="time-range">${e.start} <span>→</span> ${e.end}${e.overnight ? ' <sup>+1</sup>' : ''}</span><small>${e.breakMinutes ? `${e.breakMinutes} min de descanso` : 'Sin descanso'}</small></td><td class="description-cell">${escape(e.description)}</td><td><span class="time-pill">${formatDuration(durationMinutes(e.start, e.end, e.breakMinutes, e.overnight))}</span></td><td><div class="row-actions"><button class="icon-button" data-edit="${escape(e.id)}" aria-label="Editar jornada del ${e.date}">${icon('edit')}</button><button class="icon-button delete-button" data-delete="${escape(e.id)}" aria-label="Eliminar jornada del ${e.date}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function overview() {
  const total = totalMinutes(entries);
  const remaining = Math.max(0, GOAL_MINUTES - total);
  const percent = progressPercent(total);
  const days = new Set(entries.map(e => e.date)).size;
  const week = currentWeek();
  const weekly = totalMinutes(entries.filter(e => week.includes(e.date)));
  const next = milestones.find(m => total < m.hours * 60);
  return `<div class="page-heading"><div><div class="eyebrow">UN PASO MÁS CERCA DE TU FUTURO</div><h1>Tu esfuerzo está sumando<span>.</span></h1><p>Este es tu espacio para avanzar, aprender y celebrar cada hora.</p></div><button class="button button-primary" data-new>${icon('plus')} Registrar jornada</button></div>
  <section class="goal-card"><div class="goal-content"><span class="goal-tag">${icon('flag')} TU GRAN META</span><h2>240 horas.<br>Un mundo de posibilidades.</h2><p>${total >= GOAL_MINUTES ? '¡Lo lograste! Cada jornada te trajo hasta aquí.' : total ? 'Mira todo lo que has avanzado. Tu próxima hora también cuenta.' : 'Todo gran camino empieza con un pequeño paso.\nEl tuyo empieza hoy.'}</p><div class="goal-bottom"><span class="goal-avatar">${icon('spark')}</span><span>${total >= GOAL_MINUTES ? '<strong>Meta completada.</strong> Es momento de celebrarlo.' : `<strong>${formatDuration(remaining)}</strong> para completar tus prácticas`}</span></div></div><div class="goal-visual"><span class="decoration star-one">✦</span><span class="decoration star-two">✧</span><span class="decoration star-three">✦</span><div class="progress-ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="ring-track" cx="100" cy="100" r="86"/><circle class="ring-fill" cx="100" cy="100" r="86" stroke-dasharray="540.35" stroke-dashoffset="${540.35 * (1 - percent / 100)}"/></svg><div class="ring-label"><span class="ring-percent">${percent === 100 ? '100' : percent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}<small>%</small></span><span>de tu meta completada</span></div></div><span class="visual-caption">CRECIENDO, HORA A HORA</span></div></section>
  <div class="stats-grid"><section class="stat-card"><div class="stat-top"><span>Horas completadas</span><span class="stat-icon sage">${icon('clock')}</span></div><div class="stat-value" id="total-hours">${formatDuration(total)} <small>/ 240 h</small></div><div class="stat-foot">${icon('arrow')} Tiempo invertido en tu futuro</div></section><section class="stat-card"><div class="stat-top"><span>Horas restantes</span><span class="stat-icon peach">${icon('flag')}</span></div><div class="stat-value">${formatDuration(remaining)}</div><div class="stat-foot">${remaining ? 'Cada jornada te acerca un poco más' : '¡Objetivo cumplido, felicidades!'}</div></section><section class="stat-card"><div class="stat-top"><span>Días de práctica</span><span class="stat-icon lavender">${icon('calendar')}</span></div><div class="stat-value">${days} <small>${days === 1 ? 'día registrado' : 'días registrados'}</small></div><div class="stat-foot">${icon('leaf')} Experiencias que te hacen crecer</div></section></div>
  <div class="middle-grid">${weeklyCard()}<section class="motivation-card"><div class="motivation-label">${icon('spark')} UN POCO DE INSPIRACIÓN</div><div class="quote-mark">“</div><blockquote>${total >= GOAL_MINUTES ? 'Lo que parecía lejano, hoy es parte de tu historia.' : 'No tienes que ver toda la escalera, solo da el primer paso.'}</blockquote><p>Tu constancia de hoy es la experiencia de mañana.</p><div class="motivation-bottom"><span class="little-sun">✺</span><span>Vas a tu ritmo.<br><strong>Y eso también es avanzar.</strong></span></div></section></div>
  <div class="bottom-grid"><section class="card records-card"><div class="section-heading"><div><h2>Últimas jornadas</h2><p>Pequeños pasos. Grandes aprendizajes.</p></div><button class="text-button" data-view="records">Ver todas ${icon('chevron')}</button></div>${recordsTable(sortedEntries().slice(0, 4))}</section><section class="card achievements-card"><div class="section-heading"><div><h2>El camino también se celebra</h2><p>Tu próximo pequeño gran logro.</p></div></div>${milestoneCard(next || milestones.at(-1), true)}<div class="next-milestone-copy">${next ? 'No subestimes lo que puedes lograr con un poquito de constancia.' : 'Lo hiciste posible, una jornada a la vez.'}</div><button class="text-button" data-view="achievements">Explorar mis logros ${icon('chevron')}</button></section></div>`;
}
function records() {
  const months = [...new Set(entries.map(e => e.date.slice(0, 7)))].sort().reverse();
  const list = sortedEntries().filter(e => (!monthFilter || e.date.startsWith(monthFilter)) && e.description.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return `<div class="page-heading"><div><div class="eyebrow">TU EXPERIENCIA, DÍA A DÍA</div><h1>Mis registros<span>.</span></h1><p>Cada jornada tiene algo que contar. Aquí está tu recorrido.</p></div><button class="button button-primary" data-new>${icon('plus')} Registrar jornada</button></div><section class="card"><div class="records-toolbar"><div><h2>Todas tus jornadas</h2><p>${list.length} registros · ${formatDuration(totalMinutes(list))}</p></div><div class="filters"><label class="sr-only" for="search">Buscar en descripciones</label><input id="search" type="search" placeholder="Buscar en descripciones…" value="${escape(search)}"><label class="sr-only" for="month-filter">Filtrar por mes</label><select id="month-filter"><option value="">Todos los meses</option>${months.map(m => `<option value="${m}" ${m === monthFilter ? 'selected' : ''}>${dateLabel(`${m}-01`, { month: 'long', year: 'numeric' })}</option>`).join('')}</select><button class="button button-outline" data-export ${entries.length ? '' : 'disabled'}>${icon('download')} Exportar CSV</button></div></div>${recordsTable(list)}</section><p class="storage-note">${icon('lock')} Tus registros se guardan solo en este navegador. Exporta un CSV para conservar una copia.</p>`;
}
function achievements() {
  const count = milestones.filter(m => totalMinutes(entries) >= m.hours * 60).length;
  return `<div class="page-heading"><div><div class="eyebrow">CADA PASO MERECE CELEBRARSE</div><h1>Pequeños grandes logros<span>.</span></h1><p>${count} de ${milestones.length} logros conseguidos. Sigue construyendo tu camino.</p></div><button class="button button-primary" data-new>${icon('plus')} Sumar una jornada</button></div><div class="achievement-grid">${milestones.map(m => milestoneCard(m)).join('')}</div><section class="celebration-note">${icon('heart')}<h2>Tu mayor logro es seguir intentándolo.</h2><p>Detrás de cada hora hay algo que aprendiste, un reto que superaste y una versión de ti que crece.</p></section>`;
}
function render() {
  const total = totalMinutes(entries);
  const pct = Math.min(100, total / GOAL_MINUTES * 100);
  document.querySelector('#app').innerHTML = `<aside class="sidebar"><a class="brand" href="#" aria-label="Mi práctica, inicio"><span class="brand-mark">m<span>p</span><i></i></span><span>mi práctica<span class="brand-dot">.</span><small>CADA HORA CUENTA</small></span></a><div class="sidebar-content"><div class="nav-label">MI ESPACIO</div><nav aria-label="Navegación principal">${[['overview', 'grid', 'Resumen'], ['records', 'book', 'Mis registros'], ['achievements', 'trophy', 'Mis logros']].map(([key, symbol, title]) => `<button class="nav-item ${view === key ? 'active' : ''}" data-view="${key}" ${view === key ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${title}</span>${key === 'overview' ? '<span class="nav-dot"></span>' : ''}</button>`).join('')}</nav><div class="sidebar-goal"><div class="sidebar-goal-icon">${icon('flag')}</div><h3>Un objetivo, muchas<br>oportunidades.</h3><p>Tú pones las ganas.<br>Nosotros contamos las horas.</p><div class="mini-progress"><span style="width:${pct}%"></span></div><div class="mini-goal-label"><span>${formatDuration(total)}</span><span>240 h</span></div></div></div><div class="sidebar-footer"><span class="footer-avatar">${icon('leaf')}</span><div>Mi camino profesional<small>En construcción, como tú.</small></div>${icon('heart')}</div></aside><div class="main-shell"><header class="topbar"><div class="breadcrumb">Mi espacio <span>/</span> <strong>${{overview:'Resumen', records:'Mis registros', achievements:'Mis logros'}[view]}</strong></div><div class="topbar-right"><span class="today-date">${icon('calendar')} ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span class="profile-avatar" title="Mi espacio personal">MP</span></div></header><main id="main">${storageError ? `<div class="storage-error" role="alert">${escape(storageError)}</div>` : ''}${view === 'overview' ? overview() : view === 'records' ? records() : achievements()}<footer class="page-footer"><span>Hecho para acompañarte en cada paso.</span><span>Tu futuro empieza con lo que haces hoy ${icon('spark')}</span></footer></main></div>`;
  bindEvents();
}

function bindEvents() {
  document.querySelector('.brand').onclick = e => { e.preventDefault(); view = 'overview'; weekOffset = 0; render(); };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; if (view === 'overview') weekOffset = 0; render(); window.scrollTo({ top: 0 }); });
  document.querySelectorAll('[data-new]').forEach(b => b.onclick = () => showEntryModal());
  document.querySelectorAll('[data-week]').forEach(b => b.onclick = () => { weekOffset += Number(b.dataset.week); render(); });
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => showEntryModal(entries.find(e => e.id === b.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => showDeleteModal(b.dataset.delete));
  document.querySelector('[data-export]')?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([csvExport(sortedEntries())], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `mis-practicas-${localDate()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Tu copia CSV está lista. ¡Guárdala en un lugar seguro!');
  });
  document.querySelector('#month-filter')?.addEventListener('change', e => { monthFilter = e.target.value; render(); document.querySelector('#month-filter').focus(); });
  document.querySelector('#search')?.addEventListener('input', e => {
    search = e.target.value;
    const position = e.target.selectionStart;
    render();
    const input = document.querySelector('#search'); input.focus(); input.setSelectionRange(position, position);
  });
}

function openModal(content) {
  modalReturnFocus = document.activeElement;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${content}</section></div>`;
  document.querySelector('#app').inert = true;
  document.body.classList.add('modal-open');
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  document.querySelector('.modal-backdrop').addEventListener('click', e => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
  document.querySelector('.modal').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key !== 'Tab') return;
    const focusables = [...document.querySelectorAll('.modal button, .modal input, .modal textarea')].filter(el => !el.disabled);
    const first = focusables[0], last = focusables.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  requestAnimationFrame(() => document.querySelector('.modal input, .modal button')?.focus());
}
function closeModal() {
  document.querySelector('#modal-root').innerHTML = '';
  document.querySelector('#app').inert = false;
  document.body.classList.remove('modal-open');
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
function showEntryModal(entry) {
  const e = entry || { date: localDate(), start: '', end: '', breakMinutes: 0, description: '', overnight: false };
  openModal(`<div class="modal-heading"><div><span class="eyebrow">CADA HORA CUENTA</span><h2 id="modal-title">${entry ? 'Editar jornada' : 'Una jornada más cerca'}</h2><p>${entry ? 'Actualiza los detalles de tu experiencia.' : 'Cuéntanos cómo avanzaste hoy.'}</p></div><button class="icon-button" data-close aria-label="Cerrar">${icon('close')}</button></div><form id="entry-form"><label for="entry-date">Fecha de la jornada</label><input id="entry-date" name="date" type="date" required max="${localDate()}" value="${e.date}"><div class="form-two"><div><label for="entry-start">Hora de entrada</label><input id="entry-start" name="start" type="time" required value="${e.start}"></div><div><label for="entry-end">Hora de salida</label><input id="entry-end" name="end" type="time" required value="${e.end}"></div></div><label class="checkbox-label"><input name="overnight" type="checkbox" ${e.overnight ? 'checked' : ''}> La salida es al día siguiente</label><label for="entry-break">Descanso <span class="optional">(minutos, opcional)</span></label><input id="entry-break" name="breakMinutes" type="number" min="0" max="1439" step="1" value="${e.breakMinutes}"><label for="entry-description">¿Qué hiciste durante tus prácticas?</label><textarea id="entry-description" name="description" rows="3" maxlength="1000" required placeholder="Por ejemplo: apoyé al equipo con el inventario y aprendí a organizar los pedidos…">${escape(e.description)}</textarea><div class="calculated-time">${icon('clock')}<span>Tiempo de práctica</span><strong id="duration-preview">—</strong></div><p id="form-error" class="form-error" role="alert"></p><div class="modal-actions"><button type="button" class="button button-outline" data-close>Cancelar</button><button type="submit" class="button button-primary">${icon('check')} ${entry ? 'Guardar cambios' : 'Guardar jornada'}</button></div><p class="modal-storage">${icon('lock')} Guardado en este navegador, solo para ti.</p></form>`);
  const form = document.querySelector('#entry-form');
  const updatePreview = () => {
    const data = new FormData(form);
    try { document.querySelector('#duration-preview').textContent = formatDuration(durationMinutes(data.get('start'), data.get('end'), Number(data.get('breakMinutes')), data.get('overnight') === 'on')); }
    catch { document.querySelector('#duration-preview').textContent = '—'; }
  };
  form.addEventListener('input', updatePreview); updatePreview();
  form.onsubmit = event => {
    event.preventDefault();
    try {
      const data = new FormData(form);
      const validated = validateEntry({ ...Object.fromEntries(data), overnight: data.get('overnight') === 'on' });
      if (overlaps(validated, entries, entry?.id)) throw new Error('Este horario se solapa con otra jornada. Revisa la fecha y las horas.');
      const next = { ...validated, id: entry?.id || crypto.randomUUID() };
      const oldTotal = totalMinutes(entries);
      if (!persist(entry ? entries.map(e => e.id === entry.id ? next : e) : [...entries, next])) return;
      closeModal(); render();
      document.querySelector('[data-new]')?.focus();
      const earned = milestones.filter(m => oldTotal < m.hours * 60 && totalMinutes(entries) >= m.hours * 60);
      toast(earned.length ? `¡Jornada guardada! Nuevo logro: ${earned.at(-1).title} ✨` : entry ? 'Cambios guardados. Tu recorrido está al día.' : '¡Jornada guardada! Una experiencia más, un paso más cerca.');
    } catch (error) { document.querySelector('#form-error').textContent = error.message; }
  };
}
function showDeleteModal(id) {
  const entry = entries.find(e => e.id === id);
  openModal(`<div class="modal-heading"><div><span class="eyebrow">TUS REGISTROS</span><h2 id="modal-title">¿Eliminar esta jornada?</h2></div><button class="icon-button" data-close aria-label="Cerrar">${icon('close')}</button></div><p class="delete-copy">Se eliminará la jornada del ${dateLabel(entry.date, { day:'numeric', month:'long', year:'numeric' })} y se descontarán ${formatDuration(durationMinutes(entry.start, entry.end, entry.breakMinutes, entry.overnight))} de tu progreso. Esta acción no se puede deshacer.</p><div class="modal-actions"><button class="button button-outline" data-close>Conservar jornada</button><button class="button button-danger" id="confirm-delete">${icon('trash')} Eliminar jornada</button></div>`);
  document.querySelector('#confirm-delete').onclick = () => { if (persist(entries.filter(e => e.id !== id))) { closeModal(); render(); document.querySelector('[data-new]')?.focus(); toast('Jornada eliminada. El progreso se ha actualizado.'); } };
}
render();
