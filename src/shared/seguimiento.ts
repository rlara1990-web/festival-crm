// Reglas de seguimiento por correo (etapa 3).
// Estados: esperando_respuesta → (plazo vencido) recontacto_1 → (se envía el recontacto 1, plazo vencido)
// recontacto_2 → (se envía el recontacto 2, plazo vencido) sin_respuesta.
// `recontactos` cuenta los recontactos ya enviados; `proximo_recontacto` es la fecha límite actual.

export type EstadoSeguimiento = string;

export interface EdicionSeguimiento {
  estado: EstadoSeguimiento;
  recontactos: number;
  proximo_recontacto: string | null; // YYYY-MM-DD
}

export interface Cambio {
  estado: EstadoSeguimiento;
  recontactos: number;
  proximo_recontacto: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  motivo: string; // en inglés, para el historial
}

/** Suma días hábiles (lunes a viernes). Los festivos no se descuentan (no hay calendario de festivos). */
export function sumarDiasHabiles(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  let n = dias;
  while (n > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) n--;
  }
  return d.toISOString().slice(0, 10);
}

/** Estados en los que un correo enviado no cambia nada (la conversación ya avanzó). */
const AVANZADOS = new Set(['en_conversacion', 'reunion_agendada', 'convocatoria_enviada', 'aceptado', 'rechazado', 'descartado']);

/** Qué cambia al detectar un correo ENVIADO a un festival. null = solo se registra, sin cambio de estado. */
export function alEnviar(e: EdicionSeguimiento, fecha: string, diasPlazo = 2): Cambio | null {
  const plazo = sumarDiasHabiles(fecha, diasPlazo);
  const base = { proxima_accion: 'Wait for reply; follow up if none', proxima_accion_fecha: plazo, proximo_recontacto: plazo };
  if (AVANZADOS.has(e.estado)) return null;
  if (e.estado === 'recontacto_1' && e.recontactos < 1) {
    return { ...base, estado: 'recontacto_1', recontactos: 1, motivo: 'Follow-up 1 sent' };
  }
  if (e.estado === 'recontacto_2' && e.recontactos < 2) {
    return { ...base, estado: 'recontacto_2', recontactos: 2, motivo: 'Follow-up 2 sent' };
  }
  if (e.estado === 'esperando_respuesta' || e.estado === 'recontacto_1' || e.estado === 'recontacto_2') {
    // Otro correo mientras ya esperamos: solo se renueva el plazo
    return { ...base, estado: e.estado, recontactos: e.recontactos, motivo: 'Another email sent; deadline renewed' };
  }
  // por_contactar, sin_respuesta u otro: primer contacto de la temporada
  return { ...base, estado: 'esperando_respuesta', recontactos: 0, motivo: 'First email sent' };
}

/** Qué cambia si vence el plazo sin respuesta. null = nada que hacer. */
export function alVencer(e: EdicionSeguimiento, hoy: string): Cambio | null {
  if (!e.proximo_recontacto || e.proximo_recontacto > hoy) return null;
  if (e.estado === 'esperando_respuesta') {
    return { estado: 'recontacto_1', recontactos: e.recontactos, proximo_recontacto: null,
      proxima_accion: 'Send follow-up 1', proxima_accion_fecha: hoy, motivo: 'No reply after 2 business days: follow-up 1 due' };
  }
  if (e.estado === 'recontacto_1' && e.recontactos >= 1) {
    return { estado: 'recontacto_2', recontactos: e.recontactos, proximo_recontacto: null,
      proxima_accion: 'Send follow-up 2', proxima_accion_fecha: hoy, motivo: 'No reply to follow-up 1: follow-up 2 due' };
  }
  if (e.estado === 'recontacto_2' && e.recontactos >= 2) {
    return { estado: 'sin_respuesta', recontactos: e.recontactos, proximo_recontacto: null,
      proxima_accion: null, proxima_accion_fecha: null, motivo: 'No reply to follow-up 2: marked as no reply' };
  }
  return null;
}
