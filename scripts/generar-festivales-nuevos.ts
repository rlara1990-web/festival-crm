// Uso: node scripts/generar-festivales-nuevos.ts data/propuestas/nuevos-01.json > salida.sql
// Convierte una lista de festivales o eventos nuevos encontrados por Claude en propuestas (tipo 'festival_nuevo').
// Cada entrada: los campos de FestivalNuevo (src/shared/propuestas.ts) más fuente_url.
// Valida con las mismas reglas que la web y no propone lo que ya está en la lista o pendiente con el mismo nombre.
import { readFileSync } from 'node:fs';
import { validarFestivalNuevo, type FestivalNuevo } from '../src/shared/propuestas.ts';
import { lit } from '../src/import/sql.ts';

const archivo = process.argv[2];
if (!archivo) throw new Error('Falta el archivo del lote');
const entradas = JSON.parse(readFileSync(archivo, 'utf8')) as (FestivalNuevo & { fuente_url: string })[];

const errores: string[] = [];
const sentencias: string[] = [];
for (const { fuente_url, ...v } of entradas) {
  const error = validarFestivalNuevo(v);
  if (error) { errores.push(`${v.nombre}: ${error}`); continue; }
  if (!/^https?:\/\//.test(fuente_url ?? '')) { errores.push(`${v.nombre}: falta la fuente`); continue; }
  const nombre = lit(v.nombre.trim().toLowerCase());
  sentencias.push(
    `insert into propuestas (tipo, valor_propuesto, motivo, fuente_url)\n` +
    `select 'festival_nuevo', ${lit(JSON.stringify(v))}::jsonb, ${lit(v.por_que)}, ${lit(fuente_url)}\n` +
    `where not exists (select 1 from festivales where lower(trim(nombre)) = ${nombre})\n` +
    `  and not exists (select 1 from propuestas where tipo = 'festival_nuevo' and estado = 'pendiente' and lower(trim(valor_propuesto->>'nombre')) = ${nombre});`,
  );
}
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }
console.log(`begin;\n${sentencias.join('\n')}\ncommit;`);
