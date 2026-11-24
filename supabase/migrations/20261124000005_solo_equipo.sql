-- Solo el usuario del equipo puede leer o escribir (24/11/2026).
-- Segunda protección además de tener desactivado el registro de usuarios en Supabase:
-- aunque alguien consiguiera una cuenta, las políticas no le dejan ver ni tocar datos.
-- Para añadir otro usuario: crear una migración que actualice la lista de es_equipo().

create function public.es_equipo() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (array['info@mocheverde.com'])
$$;

drop policy autenticados_todo on festivales;
create policy solo_equipo on festivales for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on ediciones;
create policy solo_equipo on ediciones for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on contactos;
create policy solo_equipo on contactos for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on interacciones;
create policy solo_equipo on interacciones for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on puntuacion_config;
create policy solo_equipo on puntuacion_config for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on fuentes_dato;
create policy solo_equipo on fuentes_dato for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on comentarios;
create policy solo_equipo on comentarios for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on propuestas;
create policy solo_equipo on propuestas for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on documentos;
create policy solo_equipo on documentos for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on solicitudes;
create policy solo_equipo on solicitudes for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on ajustes;
create policy solo_equipo on ajustes for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on organizaciones;
create policy solo_equipo on organizaciones for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));
drop policy autenticados_todo on festival_organizacion;
create policy solo_equipo on festival_organizacion for all to authenticated using ((select public.es_equipo())) with check ((select public.es_equipo()));

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy documentos_autenticados on storage.objects';
    execute $p$create policy documentos_equipo on storage.objects for all to authenticated
      using (bucket_id = 'documentos' and (select public.es_equipo()))
      with check (bucket_id = 'documentos' and (select public.es_equipo()))$p$;
  end if;
end $$;
