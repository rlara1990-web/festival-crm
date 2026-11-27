# Registro de cambios

## 2026-11-27 (búsqueda de datos, tanda 5)

### Añadido
- Lote 5 de propuestas (`data/propuestas/lote-05.json`): 26 datos para 10 festivales portugueses.

## 2026-11-27 (etapa 4: festivales y eventos nuevos)

### Añadido
- Review: sección "New festivals & events" con una tarjeta por evento (lugar, tipo, fechas 2027, aforo, géneros, público, acampada, contacto, motivo y fuente). Al aceptar se crea el festival con su temporada 2027 en Por contactar; se puede reintentar sin duplicar.
- `scripts/generar-festivales-nuevos.ts` y primer lote `data/propuestas/nuevos-01.json`: 14 eventos en Portugal, cargados en Supabase.
- El contador de Review incluye los festivales nuevos.

## 2026-11-27 (búsqueda de datos, tanda 4)

### Añadido
- Lote 4 de propuestas (`data/propuestas/lote-04.json`): 36 datos para 9 festivales portugueses. Sacred Soul: sin resultados en ninguna fuente.

## 2026-11-27 (mejoras de la web)

### Añadido
- Ask Claude en la ficha: pedir datos, primer correo, recontacto u otra cosa, con nota opcional; se ve el estado y el resultado. Claude los procesa en cada revisión programada (`docs/revision-outlook.md`, paso 7).
- Comentarios en cualquier dato de la ficha (temporada, festival, temporadas pasadas, email de contactos): marca con el número, globo para leer, añadir y resolver.
- Documentos: pestaña Documents (todos, generales o por festival) y sección en la ficha. Archivos en Supabase Storage (bucket privado), máximo 50 MB.

### Cambiado
- Aceptar propuestas se puede reintentar sin duplicar contactos, fuentes ni notas de cambio de estado (pruebas en `tests/aceptar-propuesta.test.ts`).
- Mensaje base de los correos: sostenibilidad.

## 2026-11-26 (etapa 3: revisión de Outlook)

### Añadido
- `src/shared/seguimiento.ts`: reglas de recontacto (2 días hábiles → Recontacto 1 → Recontacto 2 → Sin respuesta).
- `scripts/revision-outlook.ts` y `scripts/estado-revision.sql`: detectan correos enviados y respuestas de festivales (por dirección del contacto o dominio), registran interacciones, aplican plazos vencidos y dejan propuestas de cambio de estado para las respuestas. Los avisos automáticos (noreply) se registran sin propuesta; los contactos dados de baja se ignoran.
- `docs/revision-outlook.md`: procedimiento de las revisiones programadas.

## 2026-11-26 (búsqueda de datos, tanda 2)

### Añadido
- Lote 3 de propuestas (`data/propuestas/lote-03.json`): 44 datos para los festivales 11–20, la mayoría de webs oficiales.

## 2026-11-24 (búsqueda de datos)

### Añadido
- Columna City en la lista de festivales (ordenable).
- Lotes 1 y 2 de propuestas (`data/propuestas/`): 41 datos para los 10 festivales con mejor puntuación, 24 con la web oficial como fuente.
- `scripts/frases_web.py`: extrae frases relevantes de una página descargada (incluido texto dentro de scripts).

## 2026-11-24 (bandeja de revisión)

### Añadido
- Pestaña Review: propuestas de Claude agrupadas por festival, con valor actual, propuesto, fuente y motivo.
  Aceptar copia el dato, registra la fuente en `fuentes_dato` y recalcula puntuación y pendientes; rechazar lo descarta.
- Aviso en la ficha del festival cuando tiene propuestas pendientes; contador en la navegación.
- `src/shared/propuestas.ts`: campos que se pueden proponer y su validación (con pruebas). La experiencia no se puede proponer.
- `scripts/generar-propuestas.ts`: convierte un lote de datos encontrados (JSON en `data/propuestas/`) en SQL validado.

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
