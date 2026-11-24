-- Esquema inicial del CRM de festivales (fase 1).
-- Festival = datos estables; Edición = datos que cambian cada año (fechas, aforo,
-- convocatoria, estado del pipeline, puntuación y resultados propios).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Festivales
-- ---------------------------------------------------------------------------
create table festivales (
  id                      uuid primary key default gen_random_uuid(),
  nombre                  text not null,
  pais                    char(2),                -- ISO 3166-1 alfa-2; null = pendiente
  ciudad                  text,
  tipo                    text not null default 'musica'
                          check (tipo in ('musica', 'comida_vegana', 'gastronomia', 'otro')),
  generos                 text[] not null default '{}',   -- claves de puntuacion_config.afinidad_genero
  perfil_publico          text[] not null default '{}',   -- claves de puntuacion_config.afinidad_publico
  notas_publico           text,
  web_url                 text,
  formulario_contacto_url text,
  instagram_url           text,
  otras_redes             jsonb not null default '{}'::jsonb,
  idioma_correo           text check (idioma_correo in ('es', 'pt', 'en')),
  fuera_de_alcance        boolean not null default false, -- se puede desmarcar desde la ficha
  campos_pendientes       text[] not null default '{}',   -- campos marcados "pendiente de revisar"
  notas                   text,
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now()
);

create unique index festivales_nombre_pais_uq on festivales (lower(nombre), coalesce(pais, ''));

-- ---------------------------------------------------------------------------
-- Ediciones (una por festival y año)
-- ---------------------------------------------------------------------------
create table ediciones (
  id                      uuid primary key default gen_random_uuid(),
  festival_id             uuid not null references festivales (id) on delete cascade,
  anio                    smallint not null check (anio between 2000 and 2100),

  fecha_inicio            date,
  fecha_fin               date,
  fechas_texto            text,            -- cuando solo se sabe "septiembre", etc.
  duracion_dias           smallint check (duracion_dias > 0),  -- no siempre son días seguidos
  aforo_min               integer check (aforo_min >= 0),
  aforo_max               integer check (aforo_max >= 0),

  -- Pipeline
  estado                  text not null default 'por_contactar'
                          check (estado in ('por_contactar', 'contactado', 'respondio', 'interesado',
                                            'convocatoria_enviada', 'aceptado', 'rechazado',
                                            'sin_respuesta', 'descartado')),
  proxima_accion          text,
  proxima_accion_fecha    date,

  -- Convocatoria para vendedores de comida
  conv_apertura           date,
  conv_cierre             date,
  conv_metodo             text check (conv_metodo in ('email', 'formulario', 'web', 'redes')),
  conv_url                text,
  exclusividad            boolean,
  coste_tipo              text check (coste_tipo in ('comision', 'stand', 'ambos', 'desconocido')),
  coste_notas             text,
  prioridad_antiguos      boolean,
  acepta_food_trucks      boolean,
  conv_notas              text,
  conv_fuente_url         text,
  conv_revisado_en        date,

  -- Puntuación de ajuste (calculada; ver puntuacion_config)
  puntuacion              smallint check (puntuacion between 0 and 100),
  puntuacion_detalle      jsonb,
  puntuacion_incompleta   boolean not null default false,
  puntuacion_calculada_en timestamptz,

  -- Resultados propios
  participamos            boolean not null default false,
  ventas_eur              numeric(12, 2),
  resultado_eur           numeric(12, 2),  -- beneficio (+) o pérdida (-)
  margen_pct              numeric(6, 1) generated always as
                          (case when ventas_eur > 0 then round(resultado_eur / ventas_eur * 100, 1) end) stored,
  notas_resultados        text,

  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),

  unique (festival_id, anio),
  check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio),
  check (aforo_max is null or aforo_min is null or aforo_max >= aforo_min),
  check (conv_cierre is null or conv_apertura is null or conv_cierre >= conv_apertura)
);

create index ediciones_anio_estado_idx on ediciones (anio, estado);

-- ---------------------------------------------------------------------------
-- Contactos
-- ---------------------------------------------------------------------------
create table contactos (
  id                 uuid primary key default gen_random_uuid(),
  festival_id        uuid not null references festivales (id) on delete cascade,
  nombre             text,               -- vacío si es un buzón genérico (geral@, info@)
  rol                text,
  email              text,
  telefono           text,
  canal_preferido    text check (canal_preferido in ('email', 'instagram', 'formulario', 'telefono')),
  primer_contacto_en date,
  baja_en            date,               -- marcar baja en cualquier momento
  verificar          boolean not null default false,
  motivo_verificar   text,
  notas              text,
  creado_en          timestamptz not null default now(),
  check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index contactos_festival_idx on contactos (festival_id);
create index contactos_email_idx on contactos (lower(email));

-- ---------------------------------------------------------------------------
-- Interacciones (historial)
-- ---------------------------------------------------------------------------
create table interacciones (
  id                uuid primary key default gen_random_uuid(),
  festival_id       uuid not null references festivales (id) on delete cascade,
  edicion_id        uuid references ediciones (id) on delete set null,
  contacto_id       uuid references contactos (id) on delete set null,
  tipo              text not null
                    check (tipo in ('correo_enviado', 'correo_recibido', 'mensaje_redes',
                                    'formulario_web', 'llamada', 'nota_interna')),
  fecha             date,                -- null cuando la fecha real no se conoce (importación 2026)
  asunto            text,
  cuerpo            text,
  outlook_link      text,
  estado_resultante text
                    check (estado_resultante in ('por_contactar', 'contactado', 'respondio', 'interesado',
                                                 'convocatoria_enviada', 'aceptado', 'rechazado',
                                                 'sin_respuesta', 'descartado')),
  creado_en         timestamptz not null default now()
);

create index interacciones_festival_idx on interacciones (festival_id, fecha desc);

-- ---------------------------------------------------------------------------
-- Configuración de la puntuación (único lugar donde viven los pesos)
-- ---------------------------------------------------------------------------
create table puntuacion_config (
  id               uuid primary key default gen_random_uuid(),
  activa           boolean not null default false,
  pesos            jsonb not null,   -- {"genero":35,"publico":30,"aforo":20,"tipo":15}
  afinidad_genero  jsonb not null,   -- {"electronica":80,...}
  afinidad_publico jsonb not null,
  afinidad_tipo    jsonb not null,
  tramos_aforo     jsonb not null,   -- [{"hasta":5000,"valor":40},...,{"hasta":null,"valor":65}]
  notas            text,
  creado_en        timestamptz not null default now()
);

create unique index puntuacion_config_una_activa on puntuacion_config (activa) where activa;

-- ---------------------------------------------------------------------------
-- Procedencia de los datos (CSV, manual, scraping)
-- ---------------------------------------------------------------------------
create table fuentes_dato (
  id          uuid primary key default gen_random_uuid(),
  tabla       text not null,
  registro_id uuid not null,
  campo       text,                 -- null = el registro entero
  valor       text,
  url         text,
  metodo      text not null check (metodo in ('import_csv', 'manual', 'scraping')),
  obtenido_en timestamptz not null default now()
);

create index fuentes_dato_registro_idx on fuentes_dato (tabla, registro_id);

-- ---------------------------------------------------------------------------
-- Mantenimiento
-- ---------------------------------------------------------------------------
create function tocar_actualizado_en() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger festivales_actualizado before update on festivales
  for each row execute function tocar_actualizado_en();
create trigger ediciones_actualizado before update on ediciones
  for each row execute function tocar_actualizado_en();

-- Una interacción con estado_resultante actualiza el estado de su edición.
create function aplicar_estado_interaccion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado_resultante is not null and new.edicion_id is not null then
    update public.ediciones set estado = new.estado_resultante where id = new.edicion_id;
  end if;
  return new;
end;
$$;

create trigger interacciones_estado after insert on interacciones
  for each row execute function aplicar_estado_interaccion();

-- ---------------------------------------------------------------------------
-- Seguridad: solo usuarios autenticados (Rodrigo y Zac)
-- ---------------------------------------------------------------------------
alter table festivales        enable row level security;
alter table ediciones         enable row level security;
alter table contactos         enable row level security;
alter table interacciones     enable row level security;
alter table puntuacion_config enable row level security;
alter table fuentes_dato      enable row level security;

create policy autenticados_todo on festivales        for all to authenticated using (true) with check (true);
create policy autenticados_todo on ediciones         for all to authenticated using (true) with check (true);
create policy autenticados_todo on contactos         for all to authenticated using (true) with check (true);
create policy autenticados_todo on interacciones     for all to authenticated using (true) with check (true);
create policy autenticados_todo on puntuacion_config for all to authenticated using (true) with check (true);
create policy autenticados_todo on fuentes_dato      for all to authenticated using (true) with check (true);
