-- Organizaciones (acordado con Rodrigo el 24/11/2026): empresas que gestionan la comida de
-- varios festivales, productoras o agencias. Un contacto o una interacción pueden ser de un
-- festival o de una organización.

create table organizaciones (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  tipo           text not null default 'gestora_comida'
                 check (tipo in ('gestora_comida', 'productora', 'agencia', 'otro')),
  web_url        text,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index organizaciones_nombre_uq on organizaciones (lower(nombre));
create trigger organizaciones_actualizado before update on organizaciones
  for each row execute function tocar_actualizado_en();

-- Qué organización cumple qué rol en cada festival
create table festival_organizacion (
  festival_id     uuid not null references festivales (id) on delete cascade,
  organizacion_id uuid not null references organizaciones (id) on delete cascade,
  rol             text not null default 'gestion_comida'
                  check (rol in ('gestion_comida', 'productora', 'otro')),
  notas           text,
  creado_en       timestamptz not null default now(),
  primary key (festival_id, organizacion_id, rol)
);
create index festival_organizacion_org_idx on festival_organizacion (organizacion_id);

-- Contactos: de un festival o de una organización (exactamente uno de los dos)
alter table contactos alter column festival_id drop not null;
alter table contactos
  add column organizacion_id uuid references organizaciones (id) on delete cascade,
  add constraint contactos_un_dueno check ((festival_id is null) <> (organizacion_id is null));
create index contactos_organizacion_idx on contactos (organizacion_id);
create unique index contactos_un_principal_org on contactos (organizacion_id) where principal;

-- Interacciones: de un festival, de una organización o de ambos (p. ej. la gestora ofrece un festival)
alter table interacciones alter column festival_id drop not null;
alter table interacciones
  add column organizacion_id uuid references organizaciones (id) on delete set null,
  add constraint interacciones_con_dueno check (festival_id is not null or organizacion_id is not null);
create index interacciones_organizacion_idx on interacciones (organizacion_id, fecha desc);

alter table organizaciones        enable row level security;
alter table festival_organizacion enable row level security;
create policy autenticados_todo on organizaciones        for all to authenticated using (true) with check (true);
create policy autenticados_todo on festival_organizacion for all to authenticated using (true) with check (true);
