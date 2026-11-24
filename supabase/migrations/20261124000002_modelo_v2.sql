-- Modelo v2 (acordado con Rodrigo el 24/11/2026).
-- Se aplica sobre la base vacía: no hay datos que migrar.

-- ---------------------------------------------------------------------------
-- Pipeline nuevo
-- ---------------------------------------------------------------------------
alter table ediciones drop constraint ediciones_estado_check;
alter table ediciones add constraint ediciones_estado_check check (estado in (
  'por_contactar', 'esperando_respuesta', 'recontacto_1', 'recontacto_2', 'sin_respuesta',
  'en_conversacion', 'reunion_agendada', 'convocatoria_enviada', 'aceptado', 'rechazado', 'descartado'));

alter table interacciones drop constraint interacciones_estado_resultante_check;
alter table interacciones add constraint interacciones_estado_resultante_check check (estado_resultante in (
  'por_contactar', 'esperando_respuesta', 'recontacto_1', 'recontacto_2', 'sin_respuesta',
  'en_conversacion', 'reunion_agendada', 'convocatoria_enviada', 'aceptado', 'rechazado', 'descartado'));

-- ---------------------------------------------------------------------------
-- Festivales
-- ---------------------------------------------------------------------------
alter table festivales
  add column acampada   boolean,                        -- null = desconocido
  add column parecido_a uuid[] not null default '{}';   -- referencia, no puntúa

-- ---------------------------------------------------------------------------
-- Ediciones: fuera resultados económicos (viven en el ERP), dentro experiencia y seguimiento
-- ---------------------------------------------------------------------------
alter table ediciones
  drop column margen_pct,
  drop column ventas_eur,
  drop column resultado_eur,
  drop column notas_resultados,
  add column experiencia text
    check (experiencia in ('muy_positiva', 'positiva', 'neutra', 'negativa', 'muy_negativa')),
  add column comentario_experiencia text,
  add column recontactos smallint not null default 0 check (recontactos between 0 and 2),
  add column proximo_recontacto date;

-- ---------------------------------------------------------------------------
-- Contactos: contacto principal (uno por festival como máximo)
-- ---------------------------------------------------------------------------
alter table contactos add column principal boolean not null default false;
create unique index contactos_un_principal on contactos (festival_id) where principal;

-- ---------------------------------------------------------------------------
-- Interacciones: reuniones, hilo de Outlook y origen
-- ---------------------------------------------------------------------------
alter table interacciones drop constraint interacciones_tipo_check;
alter table interacciones add constraint interacciones_tipo_check check (tipo in (
  'correo_enviado', 'correo_recibido', 'mensaje_redes', 'formulario_web', 'llamada', 'reunion', 'nota_interna'));

alter table interacciones
  add column fecha_hora              timestamptz,   -- para reuniones
  add column enlace_reunion          text,
  add column outlook_message_id      text,
  add column outlook_conversation_id text,
  add column origen                  text not null default 'manual'
    check (origen in ('manual', 'claude', 'import_csv'));

create unique index interacciones_outlook_msg_uq on interacciones (outlook_message_id) where outlook_message_id is not null;
create index interacciones_outlook_conv_idx on interacciones (outlook_conversation_id);

-- ---------------------------------------------------------------------------
-- Comentarios por campo (estilo Google Docs)
-- ---------------------------------------------------------------------------
create table comentarios (
  id          uuid primary key default gen_random_uuid(),
  tabla       text not null,
  registro_id uuid not null,
  campo       text,                    -- null = comentario sobre el registro entero
  texto       text not null,
  autor       text not null check (autor in ('equipo', 'claude')),
  resuelto    boolean not null default false,
  creado_en   timestamptz not null default now()
);
create index comentarios_registro_idx on comentarios (tabla, registro_id);

-- ---------------------------------------------------------------------------
-- Propuestas de Claude (se aprueban en el CRM)
-- ---------------------------------------------------------------------------
create table propuestas (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('dato', 'festival_nuevo', 'cambio_estado')),
  tabla           text,
  registro_id     uuid,
  campo           text,
  valor_propuesto jsonb not null,
  valor_actual    jsonb,
  motivo          text,                -- explicación breve, en inglés
  fuente_url      text,
  obtenido_en     timestamptz not null default now(),
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  resuelto_en     timestamptz,
  check (campo is distinct from 'experiencia')   -- la experiencia solo la ponen Rodrigo o Zac
);
create index propuestas_pendientes_idx on propuestas (estado, obtenido_en desc);

-- ---------------------------------------------------------------------------
-- Documentos (archivos en Supabase Storage, bucket "documentos")
-- ---------------------------------------------------------------------------
create table documentos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  descripcion   text,
  ruta_storage  text not null unique,
  tipo_mime     text,
  tamano_bytes  bigint,
  festival_id   uuid references festivales (id) on delete set null,  -- null = general
  creado_en     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Solicitudes a Claude desde el CRM (se procesan en cada revisión)
-- ---------------------------------------------------------------------------
create table solicitudes (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('completar_datos', 'preparar_correo', 'preparar_recontacto', 'otro')),
  festival_id  uuid references festivales (id) on delete cascade,
  edicion_id   uuid references ediciones (id) on delete cascade,
  detalle      text,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'hecha', 'descartada')),
  resultado    text,
  creado_en    timestamptz not null default now(),
  procesado_en timestamptz
);
create index solicitudes_pendientes_idx on solicitudes (estado, creado_en);

-- ---------------------------------------------------------------------------
-- Ajustes generales (clave / valor)
-- ---------------------------------------------------------------------------
create table ajustes (
  clave          text primary key,
  valor          jsonb not null,
  descripcion    text,
  actualizado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Puntuación: nuevos factores
-- ---------------------------------------------------------------------------
alter table puntuacion_config
  add column afinidad_experiencia jsonb not null,
  add column valores_acampada     jsonb not null,   -- {"si":100,"no":40}
  add column tramos_duracion      jsonb not null;   -- [{"hasta":1,"valor":30},...,{"hasta":null,"valor":100}]

-- ---------------------------------------------------------------------------
-- Seguridad
-- ---------------------------------------------------------------------------
alter table comentarios enable row level security;
alter table propuestas  enable row level security;
alter table documentos  enable row level security;
alter table solicitudes enable row level security;
alter table ajustes     enable row level security;

create policy autenticados_todo on comentarios for all to authenticated using (true) with check (true);
create policy autenticados_todo on propuestas  for all to authenticated using (true) with check (true);
create policy autenticados_todo on documentos  for all to authenticated using (true) with check (true);
create policy autenticados_todo on solicitudes for all to authenticated using (true) with check (true);
create policy autenticados_todo on ajustes     for all to authenticated using (true) with check (true);

-- Bucket privado para documentos (solo existe el esquema storage en Supabase)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false)
      on conflict (id) do nothing;
    execute $p$create policy documentos_autenticados on storage.objects for all to authenticated
      using (bucket_id = 'documentos') with check (bucket_id = 'documentos')$p$;
  end if;
end $$;
