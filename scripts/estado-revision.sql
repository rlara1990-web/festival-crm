-- Estado para la revisión de Outlook (docs/revision-outlook.md). Devuelve un único JSON.
select json_build_object(
  'hoy', to_char(now() at time zone 'Europe/Lisbon', 'YYYY-MM-DD'),
  'ahora', now(),
  'ultima_revision', (select valor #>> '{}' from ajustes where clave = 'ultima_revision_outlook'),
  'contactos', coalesce((select json_agg(json_build_object('id', id, 'email', lower(email), 'festival_id', festival_id,
      'organizacion_id', organizacion_id, 'primer_contacto_en', primer_contacto_en, 'baja_en', baja_en))
    from contactos where email is not null), '[]'),
  'festivales', (select json_agg(json_build_object('id', id, 'nombre', nombre, 'web_url', web_url)) from festivales),
  'organizaciones', coalesce((select json_agg(json_build_object('id', id, 'nombre', nombre)) from organizaciones), '[]'),
  'vinculos', coalesce((select json_agg(json_build_object('festival_id', festival_id, 'organizacion_id', organizacion_id, 'rol', rol))
    from festival_organizacion), '[]'),
  'ediciones', (select json_agg(json_build_object('id', id, 'festival_id', festival_id, 'estado', estado,
      'recontactos', recontactos, 'proximo_recontacto', proximo_recontacto))
    from (select distinct on (festival_id) * from ediciones order by festival_id, anio desc) e),
  'ids_registrados', coalesce((select json_agg(outlook_message_id) from interacciones where outlook_message_id is not null), '[]')
) as estado;
