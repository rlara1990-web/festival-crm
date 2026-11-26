// Revisión de Outlook (etapa 3). Ver docs/revision-outlook.md.
// Uso: node scripts/revision-outlook.ts estado.json mensajes.json salida.sql > informe.md
//   estado.json: resultado de la consulta de estado (contactos, festivales, vínculos, ediciones objetivo, ids ya registrados, hoy)
//   mensajes.json: correos de Outlook desde la última revisión (ver formato abajo)
// Escribe el SQL en salida.sql y un informe en español por la salida estándar. No toca la base.
import { readFileSync, writeFileSync } from 'node:fs';
import { lit } from '../src/import/sql.ts';
import { alEnviar, alVencer, type Cambio } from '../src/shared/seguimiento.ts';

interface Estado {
  hoy: string; // YYYY-MM-DD (Lisboa)
  ahora: string; // ISO
  contactos: { id: string; email: string | null; festival_id: string | null; organizacion_id: string | null; primer_contacto_en: string | null; baja_en: string | null }[];
  festivales: { id: string; nombre: string; web_url: string | null }[];
  organizaciones: { id: string; nombre: string }[];
  vinculos: { festival_id: string; organizacion_id: string; rol: string }[];
  ediciones: { id: string; festival_id: string; estado: string; recontactos: number; proximo_recontacto: string | null }[];
  ids_registrados: string[]; // outlook_message_id ya guardados
}

export interface Mensaje {
  id: string; // id del mensaje en Outlook
  conversation_id: string | null;
  direccion: 'enviado' | 'recibido';
  fecha: string; // ISO
  de: string;
  para: string[]; // destinatarios (to + cc)
  asunto: string | null;
  resumen?: string | null; // solo recibidos: resumen en inglés escrito por Claude
  estado_sugerido?: string | null; // solo recibidos: estado propuesto (en_conversacion, rechazado, ...)
}

const PROPIO = 'mocheverde.com';
const CORREO_GRATIS = new Set(['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.es', 'live.com', 'icloud.com', 'sapo.pt', 'hotmail.es']);
const ESTADOS = new Set(['en_conversacion', 'reunion_agendada', 'convocatoria_enviada', 'aceptado', 'rechazado', 'descartado', 'sin_respuesta']);
// Remitentes automáticos (acuses de formularios, avisos): se registran, pero no son una respuesta
const AUTOMATICO = /^(no-?reply|do-?not-?reply|noreply|mailer-daemon|postmaster|notifications?|bounce)[^@]*@/i;
const dominio = (e: string) => e.toLowerCase().split('@')[1] ?? '';
const host = (u: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, '') : ''; } catch { return ''; } };

interface Destino { festival_id: string | null; organizacion_id: string | null; contacto_id: string | null; por: 'email' | 'dominio'; direccion: string }

export function revisar(est: Estado, mensajes: Mensaje[]) {
  // El estado debe ser el resultado completo de scripts/estado-revision.sql, nunca una versión recortada
  if (!est.festivales?.length || !est.ediciones?.length || !Array.isArray(est.contactos) || !Array.isArray(est.ids_registrados)) {
    throw new Error('estado.json incompleto: copia sin cambios el JSON completo de scripts/estado-revision.sql');
  }
  const porEmail = new Map(est.contactos.filter((c) => c.email && !c.baja_en).map((c) => [c.email!.toLowerCase(), c]));
  // Dominios de festivales (contactos y web), sin correos gratuitos
  const porDominio = new Map<string, Set<string>>();
  const anotar = (d: string, fid: string) => { if (d && !CORREO_GRATIS.has(d) && d !== PROPIO) porDominio.set(d, new Set([...(porDominio.get(d) ?? []), fid])); };
  for (const c of est.contactos) if (c.email && c.festival_id && !c.baja_en) anotar(dominio(c.email), c.festival_id);
  const deBaja = new Set(est.contactos.filter((c) => c.email && c.baja_en).map((c) => c.email!.toLowerCase()));
  for (const f of est.festivales) anotar(host(f.web_url), f.id);
  const edicionDe = new Map(est.ediciones.map((e) => [e.festival_id, { ...e }]));
  const nombre = (fid: string | null) => est.festivales.find((f) => f.id === fid)?.nombre ?? '?';
  const nombreOrg = (oid: string | null) => est.organizaciones.find((o) => o.id === oid)?.nombre ?? '?';
  const yaVistos = new Set(est.ids_registrados);

  function destinos(m: Mensaje): Destino[] {
    const dirs = (m.direccion === 'enviado' ? m.para : [m.de]).map((x) => x.toLowerCase()).filter((x) => dominio(x) !== PROPIO);
    const out: Destino[] = [];
    for (const d of dirs) {
      if (deBaja.has(d)) continue; // dado de baja: no se registra nada
      const c = porEmail.get(d);
      if (c) {
        let fid = c.festival_id;
        if (!fid && c.organizacion_id) {
          // Organización: solo se asigna a un festival si gestiona exactamente uno
          const fs = [...new Set(est.vinculos.filter((v) => v.organizacion_id === c.organizacion_id).map((v) => v.festival_id))];
          if (fs.length === 1) fid = fs[0]!;
        }
        out.push({ festival_id: fid, organizacion_id: c.organizacion_id, contacto_id: c.id, por: 'email', direccion: d });
        continue;
      }
      const fs = [...(porDominio.get(dominio(d)) ?? [])];
      if (fs.length === 1) out.push({ festival_id: fs[0]!, organizacion_id: null, contacto_id: null, por: 'dominio', direccion: d });
    }
    // Un mismo mensaje cuenta una vez por festival u organización
    const vistos = new Set<string>();
    return out.filter((x) => { const k = `${x.festival_id}|${x.organizacion_id}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
  }

  const sql: string[] = [];
  const informe: string[] = [];
  const cambiosEdicion = (edId: string, c: Cambio) =>
    `update ediciones set estado = ${lit(c.estado)}, recontactos = ${c.recontactos}, proximo_recontacto = ${lit(c.proximo_recontacto)}, ` +
    `proxima_accion = ${lit(c.proxima_accion)}, proxima_accion_fecha = ${lit(c.proxima_accion_fecha)} where id = ${lit(edId)};`;
  const interaccion = (d: Destino, edId: string | null, m: Mensaje | null, tipo: string, fecha: string, asunto: string | null, cuerpo: string | null, estado: string | null) =>
    `insert into interacciones (festival_id, organizacion_id, edicion_id, contacto_id, tipo, fecha, asunto, cuerpo, estado_resultante, origen, outlook_message_id, outlook_conversation_id) values (` +
    [d.festival_id, d.organizacion_id, edId, d.contacto_id, tipo, fecha, asunto, cuerpo, estado, 'claude', m?.id ?? null, m?.conversation_id ?? null].map((v) => lit(v)).join(', ') + `);`;

  let ignorados = 0;
  for (const m of [...mensajes].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (yaVistos.has(m.id)) continue;
    const ds = destinos(m);
    if (ds.length === 0) { ignorados++; continue; }
    yaVistos.add(m.id);
    const fecha = m.fecha.slice(0, 10);
    for (const d of ds) {
      const ed = d.festival_id ? edicionDe.get(d.festival_id) : undefined;
      const quien = d.festival_id ? nombre(d.festival_id) : `${nombreOrg(d.organizacion_id)} (organización, varios festivales)`;
      const nota = d.por === 'dominio' ? ` (reconocido por el dominio ${dominio(d.direccion)})` : '';
      if (m.direccion === 'enviado') {
        const c = ed ? alEnviar(ed, fecha) : null;
        sql.push(interaccion(d, ed?.id ?? null, m, 'correo_enviado', fecha, m.asunto, null, c?.estado ?? null));
        if (ed && c) { sql.push(cambiosEdicion(ed.id, c)); Object.assign(ed, c); }
        if (d.contacto_id) sql.push(`update contactos set primer_contacto_en = ${lit(fecha)} where id = ${lit(d.contacto_id)} and primer_contacto_en is null;`);
        informe.push(`- **Enviado** a ${quien}${nota}: "${m.asunto ?? '(sin asunto)'}"${c ? ` → ${c.estado}, recontacto si no responden antes del ${c.proximo_recontacto}` : ' (sin cambio de estado)'}`);
      } else {
        const sugerido = m.estado_sugerido && ESTADOS.has(m.estado_sugerido) ? m.estado_sugerido : 'en_conversacion';
        sql.push(interaccion(d, ed?.id ?? null, m, 'correo_recibido', fecha, m.asunto, m.resumen ?? null, null));
        if (AUTOMATICO.test(m.de)) {
          informe.push(`- **Aviso automático** de ${quien}${nota}: "${m.asunto ?? '(sin asunto)'}" (registrado en el historial, sin propuesta)`);
          continue;
        }
        if (ed) {
          // Han respondido: se detiene el reloj de recontactos; el cambio de estado lo confirma Rodrigo o Zac
          sql.push(`update ediciones set proximo_recontacto = null where id = ${lit(ed.id)};`);
          ed.proximo_recontacto = null;
          sql.push(`insert into propuestas (tipo, tabla, registro_id, campo, valor_propuesto, valor_actual, motivo, fuente_url) values ('cambio_estado', 'ediciones', ${lit(ed.id)}, 'estado', ` +
            `${lit(JSON.stringify({ estado: sugerido, asunto: `Reply: ${m.asunto ?? ''}`.trim() }))}::jsonb, ${lit(JSON.stringify(ed.estado))}::jsonb, ${lit(m.resumen ?? 'Reply received')}, null);`);
        }
        informe.push(`- **Respuesta** de ${quien}${nota}: "${m.asunto ?? '(sin asunto)'}"${ed ? ` → propuesta de estado: ${sugerido}` : ''}${m.resumen ? `. ${m.resumen}` : ''}`);
      }
    }
  }

  // Plazos vencidos sin respuesta
  for (const ed of edicionDe.values()) {
    const c = alVencer(ed, est.hoy);
    if (!c) continue;
    sql.push(interaccion({ festival_id: ed.festival_id, organizacion_id: null, contacto_id: null, por: 'email', direccion: '' }, ed.id, null, 'nota_interna', est.hoy, c.motivo, null, c.estado));
    sql.push(cambiosEdicion(ed.id, c));
    Object.assign(ed, c);
    informe.push(`- **Plazo vencido** en ${nombre(ed.festival_id)} → ${c.estado}${c.proxima_accion ? ` (${c.proxima_accion})` : ''}`);
  }

  sql.push(`insert into ajustes (clave, valor, descripcion) values ('ultima_revision_outlook', ${lit(JSON.stringify(est.ahora))}::jsonb, 'Last time Claude checked Outlook.') ` +
    `on conflict (clave) do update set valor = excluded.valor, actualizado_en = now();`);
  return { sql, informe, ignorados };
}

if (process.argv[1]?.endsWith('revision-outlook.ts')) {
  const [est, msj, salida] = process.argv.slice(2);
  if (!est || !msj || !salida) throw new Error('Uso: node scripts/revision-outlook.ts estado.json mensajes.json salida.sql');
  const r = revisar(JSON.parse(readFileSync(est, 'utf8')), JSON.parse(readFileSync(msj, 'utf8')));
  writeFileSync(salida, `begin;\n${r.sql.join('\n')}\ncommit;\n`);
  console.log(`# Revisión de Outlook\n\n${r.informe.length ? r.informe.join('\n') : 'Sin novedades de festivales.'}\n\nCorreos sin relación con festivales (ignorados): ${r.ignorados}`);
}
