// Uso: npm run demo-data
// Genera web/src/data/demo-data.ts (no se sube al repositorio) con los datos de la importación,
// para probar la interfaz en local con ?demo sin conectarse a Supabase.
import { readFileSync, writeFileSync } from 'node:fs';
import { ARCHIVO_CSV, importar } from '../src/import/importar.ts';
import { CONFIG_INICIAL } from '../src/scoring/default-config.ts';

const r = importar(readFileSync(ARCHIVO_CSV, 'utf8'), CONFIG_INICIAL);
const ahora = '2026-11-24T12:00:00.000Z';
const nulos = (o: object, campos: string[]) => ({ ...Object.fromEntries(campos.map((c) => [c, null])), ...o });

const datos = {
  festivales: r.festivales.map((f) => nulos(f, ['ciudad', 'instagram_url'])),
  ediciones: r.ediciones.map((e) => ({
    ...nulos(e, ['conv_apertura', 'conv_cierre', 'conv_metodo', 'conv_url', 'exclusividad', 'coste_tipo', 'coste_notas',
      'prioridad_antiguos', 'acepta_food_trucks', 'conv_notas', 'conv_fuente_url', 'conv_revisado_en', 'proxima_accion',
      'proxima_accion_fecha', 'experiencia', 'comentario_experiencia', 'proximo_recontacto']),
    recontactos: 0,
  })),
  contactos: r.contactos.map((c) => nulos(c, ['nombre', 'rol', 'primer_contacto_en', 'baja_en'])),
  interacciones: r.interacciones.map((i) => ({ ...i, creado_en: ahora })),
  comentarios: r.comentarios.map((c) => ({ ...c, resuelto: false, creado_en: ahora })),
  config: CONFIG_INICIAL,
};
writeFileSync('web/src/data/demo-data.ts', `// Generado por scripts/generar-demo.ts. No editar.\nexport const DATOS = ${JSON.stringify(datos)};\n`);
console.log(`Demo: ${datos.festivales.length} festivales`);
