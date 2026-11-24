// Genera el SQL de carga inicial a partir del resultado de la importación.
import type { ResultadoImportacion } from './importar.ts';
import type { PuntuacionConfig } from '../scoring/score.ts';

type Valor = string | number | boolean | null | undefined | string[] | object;

export function lit(v: Valor): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v) && v.some((x) => typeof x !== 'string')) return `${lit(JSON.stringify(v))}::jsonb`;
  if (Array.isArray(v)) return v.length ? `array[${v.map(lit).join(', ')}]::text[]` : `'{}'::text[]`;
  if (typeof v === 'object') return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${v.replace(/'/g, "''")}'`;
}

function inserts<T extends object>(tabla: string, filas: T[], columnas: (keyof T & string)[]): string {
  if (filas.length === 0) return '';
  const valores = filas.map((f) => `  (${columnas.map((c) => lit(f[c] as Valor)).join(', ')})`).join(',\n');
  return `insert into ${tabla} (${columnas.join(', ')}) values\n${valores};\n`;
}

export function generarSql(r: ResultadoImportacion, cfg: PuntuacionConfig, ahora: string): string {
  const ediciones = r.ediciones.map((e) => ({ ...e, puntuacion_calculada_en: e.puntuacion_detalle ? ahora : null }));
  return [
    '-- Carga inicial generada por scripts/generar-seed.ts. No editar a mano: regenerar.',
    `-- Generado: ${ahora}`,
    'begin;',
    "do $$ begin if exists (select 1 from festivales) then raise exception 'La base ya tiene festivales: la carga inicial solo se aplica una vez.'; end if; end $$;",
    // El estado final de cada edición ya viene calculado; no dejamos que el trigger lo reescriba
    'alter table interacciones disable trigger interacciones_estado;',
    '',
    inserts('puntuacion_config', [{ activa: true, ...cfg, notas: 'Valores iniciales propuestos; afinar con Rodrigo.' }],
      ['activa', 'pesos', 'afinidad_genero', 'afinidad_publico', 'afinidad_tipo', 'tramos_aforo', 'notas']),
    inserts('festivales', r.festivales, ['id', 'nombre', 'pais', 'tipo', 'generos', 'perfil_publico', 'notas_publico',
      'web_url', 'formulario_contacto_url', 'idioma_correo', 'fuera_de_alcance', 'campos_pendientes', 'notas']),
    inserts('ediciones', ediciones, ['id', 'festival_id', 'anio', 'fecha_inicio', 'fecha_fin', 'fechas_texto',
      'duracion_dias', 'aforo_min', 'aforo_max', 'estado', 'proxima_accion', 'proxima_accion_fecha', 'conv_apertura',
      'conv_metodo', 'conv_url', 'conv_notas', 'conv_fuente_url', 'conv_revisado_en', 'prioridad_antiguos',
      'acepta_food_trucks', 'puntuacion', 'puntuacion_detalle', 'puntuacion_incompleta', 'puntuacion_calculada_en',
      'participamos', 'ventas_eur', 'resultado_eur', 'notas_resultados']),
    inserts('contactos', r.contactos, ['id', 'festival_id', 'email', 'telefono', 'canal_preferido', 'verificar',
      'motivo_verificar', 'notas']),
    inserts('interacciones', r.interacciones, ['id', 'festival_id', 'edicion_id', 'contacto_id', 'tipo', 'fecha',
      'asunto', 'cuerpo', 'estado_resultante']),
    inserts('fuentes_dato', r.fuentes.map((f) => ({ ...f, metodo: 'import_csv', obtenido_en: ahora })),
      ['id', 'tabla', 'registro_id', 'campo', 'valor', 'url', 'metodo', 'obtenido_en']),
    'alter table interacciones enable trigger interacciones_estado;',
    'commit;',
    '',
  ].join('\n');
}

export function generarInforme(r: ResultadoImportacion): string {
  const lineas = ['# Informe de importación', '',
    `Festivales: ${r.festivales.length} (fuera de alcance: ${r.festivales.filter((f) => f.fuera_de_alcance).length}). ` +
    `Ediciones: ${r.ediciones.length}. Contactos: ${r.contactos.length}. Interacciones: ${r.interacciones.length}.`, '',
    '## Avisos', ''];
  for (const a of r.avisos) lineas.push(`- **${a.festival}**: ${a.aviso}`);
  lineas.push('', '## Campos pendientes de revisar (festivales en alcance)', '',
    'Todos tienen pendiente `ciudad` y `perfil_publico` (no venían en la lista).', '',
    '| Festival | Pendiente |', '|---|---|');
  for (const f of r.festivales.filter((x) => !x.fuera_de_alcance)) {
    const otros = f.campos_pendientes.filter((c) => c !== 'ciudad' && c !== 'perfil_publico');
    if (otros.length) lineas.push(`| ${f.nombre} | ${otros.join(', ')} |`);
  }
  lineas.push('', '## Puntuación 2027 (festivales en alcance, de mayor a menor)', '',
    '| Festival | Puntuación | Datos incompletos |', '|---|---|---|');
  const filas = r.ediciones
    .filter((e) => e.anio === 2027)
    .map((e) => ({ e, f: r.festivales.find((f) => f.id === e.festival_id)! }))
    .filter(({ f }) => !f.fuera_de_alcance)
    .sort((a, b) => (b.e.puntuacion ?? -1) - (a.e.puntuacion ?? -1));
  for (const { e, f } of filas) lineas.push(`| ${f.nombre} | ${e.puntuacion ?? 'sin datos'} | ${e.puntuacion_incompleta ? 'sí' : 'no'} |`);
  return lineas.join('\n') + '\n';
}
