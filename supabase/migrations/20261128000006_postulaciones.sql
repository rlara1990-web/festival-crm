-- Postulaciones a festivales (formularios de food vendors) y banco de respuestas (28/11/2026).
-- Motivo: los formularios repiten casi siempre las mismas preguntas y se rellenan entre Rodrigo y Zac
-- en varios días. Cada edición tiene como mucho una postulación con su lista de preguntas y respuestas;
-- Claude pre-rellena las respuestas a partir del banco y ellos revisan y envían.

-- Una postulación por edición (temporada)
create table postulaciones (
  id                uuid primary key default gen_random_uuid(),
  edicion_id        uuid not null unique references ediciones (id) on delete cascade,
  festival_id       uuid not null references festivales (id) on delete cascade,
  formulario_url    text,
  fecha_limite      date,
  estado            text not null default 'preparando' check (estado in ('preparando', 'enviada', 'descartada')),
  enviada_en        date,
  decision_esperada date,
  notas             text,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);
create trigger postulaciones_actualizado before update on postulaciones
  for each row execute function tocar_actualizado_en();

-- Respuestas reutilizables (concepto, menú, medidas del puesto, potencia, equipo, sostenibilidad…)
create table banco_respuestas (
  id             uuid primary key default gen_random_uuid(),
  tema           text not null,               -- etiqueta corta, p. ej. 'Concept', 'Menu & prices'
  pregunta       text not null,               -- pregunta tipo, tal como suele aparecer
  respuesta      text not null,
  idioma         text not null default 'en' check (idioma in ('en', 'pt', 'es')),
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger banco_respuestas_actualizado before update on banco_respuestas
  for each row execute function tocar_actualizado_en();

-- Preguntas del formulario de una postulación y su respuesta
create table postulacion_respuestas (
  id             uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references postulaciones (id) on delete cascade,
  orden          integer not null default 0,
  pregunta       text not null,
  ayuda          text,                        -- opciones, límite de caracteres, si es obligatoria…
  respuesta      text,
  estado         text not null default 'vacia' check (estado in ('vacia', 'borrador', 'revisada')),
  banco_id       uuid references banco_respuestas (id) on delete set null,  -- de qué respuesta del banco salió
  actualizado_en timestamptz not null default now()
);
create index postulacion_respuestas_idx on postulacion_respuestas (postulacion_id, orden);
create trigger postulacion_respuestas_actualizado before update on postulacion_respuestas
  for each row execute function tocar_actualizado_en();

-- Solo el equipo (mismo criterio que el resto de tablas)
alter table postulaciones enable row level security;
alter table banco_respuestas enable row level security;
alter table postulacion_respuestas enable row level security;
create policy solo_equipo on postulaciones for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
create policy solo_equipo on banco_respuestas for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
create policy solo_equipo on postulacion_respuestas for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));

-- "Ask Claude" puede pedir que prepare una postulación (leer el formulario y pre-rellenar)
alter table solicitudes drop constraint solicitudes_tipo_check;
alter table solicitudes add constraint solicitudes_tipo_check
  check (tipo in ('completar_datos', 'preparar_correo', 'preparar_recontacto', 'preparar_postulacion', 'otro'));
