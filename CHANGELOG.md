# Registro de cambios

## 2026-11-24 (publicación)

### Añadido
- Solo el usuario info@mocheverde.com puede leer o escribir datos (`supabase/migrations/20261124000005_solo_equipo.sql`,
  función `es_equipo()`), además de tener desactivado el registro de usuarios en Supabase.
- Publicación automática en GitHub Pages (`.github/workflows/publicar.yml`): al cambiar `main` se ejecutan las
  pruebas, se compila la web y se publica en crm.mocheverde.com (`web/public/CNAME`).

### Cambiado
- Hosting: GitHub Pages en lugar de Cloudflare Pages (todo en el mismo lugar que el ERP). Repositorio público.
- Comentario de experiencia de RFM Somnii acortado (sin referencia a la productora), en el código y en Supabase.

## 2026-11-24 (organizaciones)

### Añadido
- Organizaciones (`supabase/migrations/20261124000004_organizaciones.sql`): empresas que gestionan la comida de
  varios festivales, productoras o agencias, vinculadas a festivales con un rol. Contactos e interacciones
  pueden pertenecer a una organización. Motivo: la misma empresa gestiona la comida de Paredes de Coura y
  NOS Primavera Sound y ofrece postulaciones a distintos eventos.
- Web: pestaña Organisations (lista y ficha con festivales, contactos e historial), sección Organisations en la
  ficha del festival, "Who to contact" indica la gestora, filtro por organización en la lista.
- Las piezas comunes de la interfaz pasan a `web/src/components/`.

## 2026-11-24 (web, etapa 1b)

### Añadido
- Aplicación web en inglés (`web/`, React + Vite, hosting estático): login, lista de festivales y ficha.
- Lista: búsqueda, orden por cualquier columna y filtros (país, estado, género, público, tipo, acampada,
  experiencia, puntuación mínima, ocultar "sin food trucks", mostrar fuera de alcance). Recuerda los filtros.
- Ficha: temporada objetivo (estado, próxima acción, fechas, aforo, convocatoria), datos del festival,
  puntuación con desglose y cobertura, temporadas pasadas con experiencia, contactos (principal, alta, baja,
  verificar) e historial (registrar actividad, cambio de estado con motivo).
- Al guardar se recalculan la puntuación y los campos pendientes (`web/src/data/recalcular.ts`,
  `src/shared/pendientes.ts` con pruebas).
- Comentarios existentes visibles como marca con tooltip (crear comentarios: etapa 1c).
- Modo demo solo en desarrollo (`npm run demo-data`, luego `npm run dev` y abrir `/?demo`); no se publica.

## 2026-11-24 (modelo v2)

### Cambiado
- Pipeline nuevo: por contactar, esperando respuesta, recontacto 1 y 2, sin respuesta, en conversación,
  reunión agendada, convocatoria enviada, aceptado, rechazado, descartado.
- Ediciones: se quitan ventas, resultado y margen (viven en el ERP); se añaden experiencia, comentario de
  experiencia, contador y fecha de recontacto.
- Puntuación con siete factores: experiencia 30, género 20, público 15, acampada 10, duración 10, tipo 10, aforo 5.
  Solo se puntúa la edición objetivo (2027), con la experiencia más reciente.
- Textos generados por la importación, en inglés (la interfaz será en inglés).

- Puntuación: los factores sin dato cuentan como neutros (50) en vez de repartir su peso; se guarda la cobertura.
  Motivo: con el reparto, Him Dub (solo aforo, duración y tipo) quedaba primero, por encima de Waking Life.
  Resultado 2027: Waking Life 82, Paredes de Coura 75, NOS Primavera Sound 72, RFM Somnii 48, Vilar de Mouros 41.
- La carga inicial se genera en lotes de 40 filas por sentencia.

- Datos cargados en Supabase (proyecto festival-crm): 72 festivales, 143 ediciones, 31 contactos, 45 interacciones.

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
