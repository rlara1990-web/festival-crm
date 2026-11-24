-- Puntuación: los factores sin dato cuentan como valor neutro en vez de repartir su peso
-- (decidido con Rodrigo el 24/11/2026: con el reparto, festivales con pocos datos quedaban arriba).
alter table puntuacion_config
  add column valor_faltante smallint not null default 50 check (valor_faltante between 0 and 100);

-- Porcentaje del peso total que tiene datos reales (indicador de confianza en la ficha).
alter table ediciones
  add column puntuacion_cobertura smallint check (puntuacion_cobertura between 0 and 100);
