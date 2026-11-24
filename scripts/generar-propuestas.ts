// Uso: node scripts/generar-propuestas.ts data/propuestas/lote-01.json > salida.sql
// Convierte un lote de datos encontrados por Claude en INSERTs para la tabla propuestas.
// Cada entrada: { festival, tabla, campo, valor, fuente_url, motivo }
//   - tabla "festivales": dato del festival
//   - tabla "ediciones": dato de la edición 2027
//   - tabla "contactos", campo "nuevo": contacto nuevo { email, nombre, rol, telefono }
// Valida con las mismas reglas que la web y no duplica propuestas pendientes iguales.
import { readFileSync } from 'node:fs';
import { importar, uuidDe } from '../src/import/importar.ts';
import { CONFIG_INICIAL } from '../src/scoring/default-config.ts';
import { validarPropuesta } from '../src/shared/propuestas.ts';
import { lit } from '../src/import/sql.ts';

interface Entrada { festival: string; tabla: string; campo: string; valor: unknown; fuente_url: string; motivo: string }

const archivo = process.argv[2];
if (!archivo) throw new Error('Falta el archivo del lote');
const entradas = JSON.parse(readFileSync(archivo, 'utf8')) as Entrada[];
const { festivales } = importar(readFileSync('data/festivals_2026_original.csv', 'utf8'), CONFIG_INICIAL);

const errores: string[] = [];
const sentencias: string[] = [];
for (const e of entradas) {
  const f = festivales.find((x) => x.nombre === e.festival);
  if (!f) { errores.push(`Festival desconocido: ${e.festival}`); continue; }
  const error = validarPropuesta(e.tabla, e.campo, e.valor);
  if (error) { errores.push(`${e.festival} ${e.tabla}.${e.campo}: ${error}`); continue; }
  if (!/^https?:\/\//.test(e.fuente_url)) { errores.push(`${e.festival} ${e.campo}: falta la fuente`); continue; }

  const registro = e.tabla === 'ediciones' ? uuidDe('edicion', f.id, '2027') : f.id;
  const actual = e.tabla === 'contactos'
    ? 'null'
    : `(select to_jsonb(${e.campo}) from ${e.tabla} where id = ${lit(registro)})`;
  const valor = `${lit(JSON.stringify(e.valor))}::jsonb`;
  sentencias.push(
    `insert into propuestas (tipo, tabla, registro_id, campo, valor_propuesto, valor_actual, motivo, fuente_url)\n` +
    `select 'dato', ${lit(e.tabla)}, ${lit(registro)}, ${lit(e.campo)}, ${valor}, ${actual}, ${lit(e.motivo)}, ${lit(e.fuente_url)}\n` +
    `where not exists (select 1 from propuestas where estado = 'pendiente' and registro_id = ${lit(registro)} and campo = ${lit(e.campo)} and valor_propuesto = ${valor});`,
  );
}
if (errores.length) {
  console.error(errores.join('\n'));
  process.exit(1);
}
console.log(sentencias.join('\n'));
