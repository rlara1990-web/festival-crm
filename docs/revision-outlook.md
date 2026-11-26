# Revisión de Outlook (etapa 3)

Procedimiento que sigue Claude en cada revisión programada (10:00, 15:00 y 18:00, hora de Lisboa). Proyecto Supabase `mabgenlzxpefappjlmgd`, cuenta info@mocheverde.com.

## Reglas
- Solo lectura de Outlook. Nunca enviar correos. Borradores solo si Rodrigo o Zac lo pidieron (tabla `solicitudes`) y el conector tiene Mail.ReadWrite.
- Casos claros (correo enviado a un festival, plazo vencido): se aplican solos y quedan en el historial.
- Respuestas de festivales: solo resumen + propuesta de cambio de estado (`propuestas`, tipo `cambio_estado`). Nunca cambiar el estado directamente.
- Avisos automáticos (noreply, no-reply, mailer-daemon…): se registran sin propuesta.
- No tocar `experiencia` ni datos de festivales.
- Resúmenes y notas en inglés.

## Pasos
1. Estado: ejecutar `scripts/estado-revision.sql` con `execute_sql` y guardar el JSON (el objeto `estado`) en `estado.json` (scratchpad) **completo y sin cambios**, aunque no haya correos: nunca recortarlo ni escribirlo a mano. El script lo rechaza si está incompleto.
2. Ventana: desde `ultima_revision` (o 30 días atrás si es nula) hasta ahora.
3. Correos: `outlook_email_search` con `folderName` "Sent Items" y luego "Inbox", `afterDateTime` = inicio de la ventana, paginando con `offset` hasta cubrir `totalResultCount`.
4. `mensajes.json`: un objeto por correo con `id` (id de Outlook), `conversation_id` (si se conoce), `direccion` (`enviado` / `recibido`), `fecha` (ISO), `de`, `para` (to + cc), `asunto`. Para recibidos de un festival (dominio o dirección conocidos), leer el correo y añadir `resumen` (1–2 frases en inglés) y `estado_sugerido` (`en_conversacion`, `reunion_agendada`, `convocatoria_enviada`, `aceptado`, `rechazado`; por defecto `en_conversacion`).
5. `node scripts/revision-outlook.ts estado.json mensajes.json salida.sql > informe.md`.
6. Aplicar `salida.sql` con `execute_sql` (es una transacción; los ids ya registrados no se duplican).
7. Solicitudes pendientes (`solicitudes` con estado pendiente): procesarlas si es posible; si requieren escritura en Outlook y no hay permiso, dejarlas pendientes.
8. Terminar con el informe (en español, breve). Si no hubo novedades, decirlo en una línea.

## Seguimiento
Reglas en `src/shared/seguimiento.ts`: 2 días hábiles (lunes a viernes, sin festivos) → Recontacto 1 → Recontacto 2 → Sin respuesta. El estado solo avanza a Recontacto 2 o Sin respuesta si el recontacto anterior se envió de verdad.
