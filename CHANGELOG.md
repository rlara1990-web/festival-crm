# Registro de cambios

## 2026-11-24 (modelo v2)

### Cambiado
- Pipeline nuevo: por contactar, esperando respuesta, recontacto 1 y 2, sin respuesta, en conversación,
  reunión agendada, convocatoria enviada, aceptado, rechazado, descartado.
- Ediciones: se quitan ventas, resultado y margen (viven en el ERP); se añaden experiencia, comentario de
  experiencia, contador y fecha de recontacto.
- Puntuación con siete factores: experiencia 30, género 20, público 15, acampada 10, duración 10, tipo 10, aforo 5.
  Solo se puntúa la edición objetivo (2027), con la experiencia más reciente.
- Textos generados por la importación, en inglés (la interfaz será en inglés).

### Añadido
- Festivales: acampada y "parecido a". Contactos: contacto principal. Interacciones: reuniones, hilo de Outlook y origen.
- Tablas nuevas: comentarios, propuestas, documentos (con bucket privado de Storage), solicitudes y ajustes.
- Experiencias 2026 dadas por Rodrigo (Waking Life, Paredes de Coura, NOS Primavera Sound, RFM Somnii, Vilar de Mouros)
  y Basilar (rechazado, parecido a Waking Life).

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
