# Festival CRM — contexto del proyecto

## Qué es
Herramienta interna de Moche Verde (comida peruana inspirada, vendida en festivales de música en Portugal y España). Sirve para:
1. Llevar un listado de festivales con datos clave y puntuación de ajuste al público.
2. Seguir cada contacto (estado, notas, próxima acción) desde el primer correo hasta la respuesta.
3. Generar borradores de correo para postular como vendedor de comida.
4. Más adelante: encontrar festivales nuevos y revisar convocatorias abiertas.

Usuario: Rodrigo (fundador de Moche Verde, junto con Zac). Idioma de la interfaz y de los textos: español. Los correos a organizadores pueden ser en español, portugués o inglés según el país.

## Decisiones ya tomadas
- Aplicación web con base de datos. Usar Supabase (igual que el ERP de Moche Verde).
- Repositorio privado. Este archivo es la fuente de contexto para cualquier sesión de Claude Code.
- Alcance inicial: festivales de la lista de 2026 en Portugal y España. Fuera de ese alcance, solo en fase posterior.
- Nada se envía sin confirmación explícita de Rodrigo. Se generan borradores; el envío es un paso separado con botón de confirmación.
- Correo: Outlook de la cuenta de Moche Verde (Microsoft 365). Los borradores se crean en Outlook; el envío también pasa por confirmación.
- Scraping: respetar robots.txt, frecuencia baja, y guardar la URL y la fecha de cada dato extraído.
- Datos de contacto: guardar la fecha del primer contacto y permitir marcar baja en cualquier momento.
- No incluir logística ni requisitos de cumplimiento en esta fase. Se verán en etapas posteriores de la postulación.

## Modelo de datos (acordado el 24/11/2026)
Fuente de verdad: `supabase/migrations/`. Resumen:
- `festivales`: datos estables (nombre, país ISO, ciudad, tipo, géneros, perfil de público, web, formulario de contacto, redes, idioma de correo). `fuera_de_alcance` (desmarcable) y `campos_pendientes` (lo que falta revisar, nunca inventado).
- `ediciones`: una por festival y año. Fechas (o `fechas_texto`), duración, aforo min/max, estado del pipeline, próxima acción, convocatoria (apertura, cierre, método, URL, exclusividad, coste, prioridad a antiguos, food trucks, fuente y fecha de revisión), puntuación con su detalle, y resultados propios (ventas, resultado en €, margen % calculado).
- `contactos`: nombre, rol, email, teléfono, canal preferido, primer contacto, baja, `verificar` + motivo.
- `interacciones`: tipo (correo enviado/recibido, mensaje en redes, formulario web, llamada, nota interna), fecha, asunto, cuerpo, enlace a Outlook, estado resultante (un trigger actualiza el estado de la edición).
- `puntuacion_config`: único lugar de pesos y afinidades (una fila activa). El cálculo está en `src/scoring/score.ts`.
- `fuentes_dato`: procedencia de cada dato (CSV, manual, scraping) con URL y fecha.

Estados del pipeline: por_contactar, contactado, respondio, interesado, convocatoria_enviada, aceptado, rechazado (lo deciden ellos), sin_respuesta, descartado (lo decidimos nosotros).
La edición 2026 es historial; el trabajo real es la edición 2027.

## Datos de partida y problemas conocidos
El archivo `data/festivals_2026_original.csv` es la lista original que armamos el año pasado. Tiene problemas que hay que limpiar al importarla:
- Todas las fechas son de 2026 y ya pasaron. La lista sirve de plantilla; el objetivo real es la temporada 2027.
- Algunas filas tienen columnas desplazadas: el correo aparece en la columna de web, y algunas anotaciones están en campos de contacto.
- Algunas filas tienen saltos de línea dentro de campos entre comillas (por ejemplo, Nos Alive y Paredes de Coura).
- Hay correos repetidos para festivales distintos (rrhh@holika.es aparece en Holika y en Bilbao BBK Live). Verificar antes de usarlos.
- Varios festivales no tienen aforo, género o contacto. Marcarlos como "pendiente de revisar" en vez de inventar datos.
- Anotaciones útiles que deben pasar a campos propios:
  - Nos Alive: dan prioridad a vendedores antiguos y abren plazas a nuevos si hay espacio.
  - Him Dub: no tienen food trucks.
  - Aquasella: aplicación de vendedores de comida en abril.
  - Vila de Mouros: rock, pop punk; el público no fue adecuado para Moche Verde (usar como ejemplo de bajo ajuste).

## Fases
1. Modelo de datos, importación del CSV limpio, pantalla de lista y ficha de festival, puntuación de ajuste, historial de interacciones y estados.
2. Generación de borradores de correo en Outlook (Microsoft 365), con plantillas por idioma, y registro del envío tras confirmación.
3. Lectura de respuestas desde Outlook para actualizar el estado automáticamente.
4. Scraping y revisión de webs y redes para encontrar ventanas de convocatoria; búsqueda de festivales nuevos.

## Preferencias de trabajo
- Antes de cambiar la estructura de datos, explicar el cambio y su motivo.
- Pruebas automáticas para la puntuación de ajuste y la importación.
- Mantener un registro de cambios en `CHANGELOG.md`.
- Commits pequeños con mensajes claros.
