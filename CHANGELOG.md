# Registro de cambios

## 2026-11-24

### Añadido
- Esquema inicial de base de datos (`supabase/migrations/20261124000001_esquema_inicial.sql`):
  festivales, ediciones, contactos, interacciones, puntuacion_config y fuentes_dato. RLS: solo usuarios autenticados.
- Separación Festival / Edición: los datos que cambian cada año (fechas, aforo, convocatoria, estado,
  puntuación, resultados) viven en la edición. Motivo: preparar 2027 sin perder el historial de 2026.
- Puntuación de ajuste (`src/scoring/`): media ponderada de género (35), público (30), aforo (20) y tipo (15).
  Si falta un factor, su peso se reparte entre los demás y se marca "datos incompletos"; con solo el tipo no se puntúa.
  Valores iniciales propuestos, pendientes de afinar.
- Importación del CSV original (`src/import/`, `npm run seed`): genera `supabase/seed.sql` y
  `data/informe_importacion.md`. Crea ediciones 2026 (historial) y 2027 (por contactar).
- Boom Festival añadido a mano: solicitud enviada el 05/11/2026, decisión en febrero.
- Vilar de Mouros 2026: ventas 4.900 €, resultado −3.100 € (margen −63,3 %, calculado).
- Festivales fuera de Portugal y España marcados `fuera_de_alcance` (17), desmarcables.
- Pruebas automáticas de puntuación, limpieza, importación y generación SQL (`npm test`).
