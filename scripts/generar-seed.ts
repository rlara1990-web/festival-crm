// Uso: npm run seed
// Lee data/festivals_2026_original.csv y escribe supabase/seed.sql y data/informe_importacion.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { ARCHIVO_CSV, importar } from '../src/import/importar.ts';
import { generarInforme, generarSql } from '../src/import/sql.ts';
import { CONFIG_INICIAL } from '../src/scoring/default-config.ts';
import { validarConfig } from '../src/scoring/score.ts';

const errores = validarConfig(CONFIG_INICIAL);
if (errores.length) throw new Error(`Configuración de puntuación inválida:\n${errores.join('\n')}`);

const r = importar(readFileSync(ARCHIVO_CSV, 'utf8'), CONFIG_INICIAL);
const ahora = new Date().toISOString();
writeFileSync('supabase/seed.sql', generarSql(r, CONFIG_INICIAL, ahora));
writeFileSync('data/informe_importacion.md', generarInforme(r));
console.log(`OK: ${r.festivales.length} festivales, ${r.ediciones.length} ediciones, ${r.contactos.length} contactos, ` +
  `${r.interacciones.length} interacciones, ${r.avisos.length} avisos.`);
