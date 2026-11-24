# Festival CRM — contexto del proyecto

## Qué es
Herramienta interna de Moche Verde (comida peruana inspirada, vendida en festivales de música en Portugal y España). Sirve para:
1. Llevar un listado de festivales y eventos con datos clave y puntuación de ajuste.
2. Seguir cada contacto (estado, notas, próxima acción) desde el primer correo hasta la respuesta y la participación.
3. Preparar correos personalizados para postular como vendedor de comida.
4. Completar datos que faltan y proponer festivales y eventos nuevos (Claude, con aprobación).

Usuarios: Rodrigo y Zac (fundadores). Comparten un solo usuario del CRM y la cuenta de Outlook de Moche Verde.

Idiomas:
- Interfaz del CRM: todo en inglés (Zac no habla español ni portugués).
- Textos generados por el sistema o por Claude que se ven en la interfaz (notas importadas, resúmenes de interacciones, comentarios, propuestas): en inglés.
- Base de datos: nombres de tablas y columnas en español (ya creadas); la interfaz traduce etiquetas y valores.
- Conversación con Rodrigo y documentación del repositorio: español.
- Correos a organizadores: español, portugués o inglés según el país.

## Decisiones ya tomadas
- Aplicación web con base de datos en Supabase, proyecto `festival-crm` (ref `mabgenlzxpefappjlmgd`, eu-west-1), separado del ERP.
- La web se aloja en la nube (no depende de ningún PC encendido). Hosting: plan gratuito de Cloudflare Pages (permite uso comercial; el gratuito de Vercel no).
- Repositorio privado. Este archivo es la fuente de contexto para cualquier sesión de Claude Code.
- Alcance: Portugal y España. Festivales de música y también otros eventos (p. ej. Web Summit). Fuera de PT/ES se marca `fuera_de_alcance` (desmarcable).
- Nada se envía sin confirmación explícita. Claude prepara borradores en Outlook; Rodrigo o Zac los revisan y envían.
- Ventas y márgenes viven en el ERP, no en el CRM. El CRM solo guarda la experiencia (clasificación) y comentarios.
- La clasificación de experiencia la ponen solo Rodrigo o Zac. Claude nunca la propone ni la modifica.
- Claude no escribe directamente datos de festivales: deja propuestas con fuente y fecha, que se aprueban en el CRM. Lo que no encuentra queda en blanco.
- Scraping y búsquedas: respetar robots.txt, frecuencia baja, guardar URL y fecha de cada dato.
- Datos de contacto: guardar la fecha del primer contacto y permitir marcar baja en cualquier momento.
- No incluir logística ni requisitos de cumplimiento en esta fase.

## Workflow
1. Completar datos: Claude busca y deja propuestas; se aprueban o rechazan en el CRM.
2. Priorizar: lista con búsqueda, orden y filtros por cualquier campo.
3. Preparar correo: Claude redacta un borrador personalizado por festival (idioma del país, algo propio del festival) a partir del mensaje base, y lo deja en Borradores de Outlook. No hay plantillas fijas.
4. Envío: Rodrigo o Zac editan y envían desde Outlook (cualquier dispositivo).
5. Detección: Claude revisa Outlook (Enviados y Bandeja de entrada) a las 10:00, 15:00 y 18:00 (hora de Lisboa). Reconoce los correos por la dirección del contacto del festival y el identificador del hilo de Outlook.
   - Casos claros (correo enviado a un festival, recontacto vencido sin respuesta) → Claude cambia el estado solo y lo registra.
   - Respuestas de festivales → Claude resume y deja una propuesta de cambio de estado para confirmar.
6. Seguimiento: a los 2 días hábiles sin respuesta (lunes a viernes, sin festivos) → Recontacto 1; otros 2 días → Recontacto 2; otros 2 días → Sin respuesta.
7. Conversación: si responden pasa a En conversación; una reunión (Zoom u otra) es una interacción de tipo reunión, con fecha, hora, enlace y notas; con confirmación se crea el evento en el calendario de Outlook.
8. Convocatoria: fechas, formulario enviado y fecha esperada de decisión como próxima acción.
9. Resultado: Aceptado o Rechazado. El motivo va como comentario sobre el estado.
10. Después del festival: experiencia + comentario (Rodrigo o Zac).
11. Año siguiente: se crea la edición nueva y hereda lo que siga siendo válido.
12. Nuevos festivales y eventos: Claude los propone con fuentes; si se aceptan entran como Por contactar.

### Mensaje base para los correos
Correo de acercamiento: presentarnos, explicar el concepto y la comida, que entregamos un buen producto, que no hacemos esperar a los clientes (quieren aprovechar el tiempo viendo a sus artistas) sin descuidar el servicio. Incluir web, Instagram y teléfono de contacto (ver "Datos de Moche Verde para los correos").

## Pipeline (estados de cada edición)
```
Por contactar → Esperando respuesta → Recontacto 1 → Recontacto 2 → Sin respuesta
                       ↓ (responden, en cualquier punto)
                  En conversación → Reunión agendada → Convocatoria enviada → Aceptado / Rechazado
Descartado: decisión nuestra, en cualquier momento.
```
Rechazado = lo deciden ellos. Descartado = lo decidimos nosotros. Sin respuesta = nos ignoraron.

## Modelo de datos
Fuente de verdad: `supabase/migrations/`. La migración inicial (24/11/2026) ya está aplicada en Supabase, sin datos cargados. Los cambios marcados como **(v2)** están acordados y pendientes de implementar.

- `festivales`: nombre, país ISO, ciudad, tipo, géneros, perfil de público, web, formulario de contacto, redes, idioma de correo, `fuera_de_alcance`, `campos_pendientes`, notas. **(v2)** `acampada` (sí / no / desconocido), `parecido_a` (lista de festivales, solo referencia, no puntúa).
- `ediciones`: una por festival y año. Fechas (o `fechas_texto`), duración, aforo min/max, estado, próxima acción, convocatoria (apertura, cierre, método, URL, exclusividad, coste, prioridad a antiguos, food trucks, fuente y fecha de revisión), puntuación con detalle. **(v2)** quitar ventas/resultado/margen/notas de resultados; añadir `experiencia` (muy positiva, positiva, neutra, negativa, muy negativa) y `comentario_experiencia`; nuevos estados del pipeline; contador de recontactos y fecha del próximo recontacto.
- `contactos`: nombre, rol, email, teléfono, canal preferido, primer contacto, baja, `verificar` + motivo. **(v2)** `principal` (a quién escribir cuando hay varios).
- `interacciones`: tipo, fecha, asunto, cuerpo, enlace a Outlook, estado resultante. **(v2)** tipo `reunion` (con hora y enlace); identificadores de mensaje e hilo de Outlook; origen (detectado por Claude / manual).
- **(v2)** `comentarios`: comentario sobre cualquier campo de cualquier registro, estilo Google Docs (marca visible y tooltip). Autor: Rodrigo/Zac o Claude. Sustituye al campo separado de comentarios de Claude.
- **(v2)** `propuestas`: dato propuesto por Claude (registro, campo, valor, fuente URL, fecha, estado pendiente/aceptada/rechazada). También festivales/eventos nuevos y cambios de estado a partir de respuestas.
- **(v2)** `documentos`: repositorio de archivos (dossier, menús, fotos) en Supabase Storage, general o ligado a un festival.
- **(v2)** `solicitudes`: pedidos a Claude hechos desde el CRM (botón "Pedir a Claude": completar datos, preparar correo o recontacto). Claude los procesa en la siguiente revisión; para algo inmediato se le pide en una conversación.
- **(v2)** `ajustes`: mensaje base de correo, web/Instagram/teléfono de Moche Verde, días de recontacto (2 hábiles).
- `puntuacion_config`: único lugar de pesos y afinidades (una fila activa). Cálculo en `src/scoring/score.ts`.
- `fuentes_dato`: procedencia de cada dato (CSV, manual, scraping) con URL y fecha.

## Puntuación de ajuste (acordada, v2 pendiente de implementar)
Media ponderada 0–100. Si falta un factor, su peso se reparte entre los demás y se marca "datos incompletos". Sin género, público, aforo ni experiencia no se puntúa.

| Factor | Peso | Valores |
|---|---|---|
| Experiencia propia (la más reciente) | 30 | muy positiva 100, positiva 80, neutra 50, negativa 25, muy negativa 0 |
| Género (media de sus géneros) | 20 | world 90, indie 85, electrónica 80, hippie 75, cultural 75, latino 75, alternativo 75, reggae/dub 70, pop 65, hip hop 60, afrobeat 60, psicodelia 60, jazz 60, ópera 40, blues 40, industrial 35, rock 35, steampunk 30, punk 20, metal 10 |
| Público | 15 | turista internacional 90, mixto 75, familias 60, joven local 50, nicho subcultura 15 |
| Acampada | 10 | sí 100, no 40 |
| Duración | 10 | 1 día 30, 2 días 50, 3 días 70, 4–5 días 85, 6+ días 100 |
| Tipo | 10 | música 90, otro 40, gastronomía 30, comida vegana 30 |
| Aforo | 5 | <5k 40, 5–10k 60, 10–30k 90, 30–60k 80, >60k 65 |

Referencias de Rodrigo: Waking Life y Paredes de Coura (música con acampada) fueron los mejores; Basilar es pequeño pero internacional y bien curado como Waking Life.

## Datos acordados para la carga inicial
- Experiencia 2026: Waking Life muy positiva; Paredes de Coura muy positiva; NOS Primavera Sound positiva; RFM Somnii muy negativa (malas ventas, en la playa, operación tediosa, mal trato con la productora); Vilar de Mouros muy negativa (público no adecuado: rock, pop punk). Los cinco en estado Aceptado en 2026.
- Basilar: no participamos. Rechazado en 2026 (decidieron no ir con nosotros: pocos food vendors y menú muy acotado). Género electrónica, público internacional, parecido a Waking Life.
- Boom Festival: formulario enviado el 05/11/2026 (https://www.boomfestival.org/participate/food-vendors-chaishops); la decisión se comunica en febrero.

## Datos de partida y problemas conocidos
El archivo `data/festivals_2026_original.csv` es la lista original del año pasado. La importación (`src/import/`, `npm run seed`) ya resuelve:
- Fechas de 2026 ya pasadas: se guardan como historial; la temporada objetivo es 2027.
- Columnas desplazadas, saltos de línea entre comillas, varios correos en una celda, URLs de formularios en la columna de email.
- Correo repetido rrhh@holika.es (Holika y Bilbao BBK Live): marcado para verificar.
- Datos faltantes: quedan como "pendiente de revisar", nunca inventados.
- Correcciones por festival documentadas en `src/import/overrides.ts` (NOS Alive, Him Dub, Aquasella, Vilar de Mouros, etc.).

## Etapas
1. Base: modelo v2, carga de datos, CRM web (login, lista con filtros, ficha, comentarios, propuestas, documentos), hosting.
2. Completar datos: Claude propone los datos que faltan con fuentes.
3. Outlook: revisiones 10:00, 15:00 y 18:00, registro de enviados, recontactos, propuestas a partir de respuestas, borradores personalizados, reuniones.
4. Nuevos festivales y eventos en PT/ES.

## Datos de Moche Verde para los correos
- Web: mocheverde.com
- Instagram: @moche.verde
- Teléfono: +351 916 273 966 (Rodrigo). Solo este número: Zac no habla portugués y no queremos perder un lead por teléfono.

## Outlook (verificado el 24/11/2026)
- El conector de Microsoft 365 está conectado a info@mocheverde.com (cuenta correcta).
- Permisos actuales solo de lectura (Mail.Read, Calendars.Read). Para crear borradores y eventos hace falta habilitar la escritura del conector (Mail.ReadWrite / Calendars.ReadWrite). Hasta entonces solo funciona la detección de enviados y respuestas.
- Revisiones en hora de Lisboa.
- Los borradores de recontacto se preparan solo cuando Rodrigo o Zac lo piden, no automáticamente.

## Pendiente de decidir
- Habilitar escritura en el conector de Microsoft 365 (necesario para la etapa 3).

## Preferencias de trabajo
- Antes de cambiar la estructura de datos, explicar el cambio y su motivo.
- Avanzar por pasos y confirmar con Rodrigo antes de cada paso relevante.
- Pruebas automáticas para la puntuación de ajuste y la importación.
- Mantener un registro de cambios en `CHANGELOG.md`.
- Commits pequeños con mensajes claros.
