-- Endereço e coordenadas do animal (campos da antiga tabela "animal").
-- O antigo "location" ("São Paulo, SP") vira city + state.

ALTER TABLE pets
  ADD COLUMN street       text,
  ADD COLUMN neighborhood text,
  ADD COLUMN city         text,
  ADD COLUMN state        text,
  ADD COLUMN latitude     double precision CHECK (latitude BETWEEN -90 AND 90),
  ADD COLUMN longitude    double precision CHECK (longitude BETWEEN -180 AND 180);

UPDATE pets
SET city  = trim(split_part(location, ',', 1)),
    state = upper(trim(split_part(location, ',', 2)));

ALTER TABLE pets
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN state SET NOT NULL,
  ADD CONSTRAINT pets_state_uf CHECK (state ~ '^[A-Z]{2}$'),
  -- Latitude e longitude andam juntas: as duas ou nenhuma.
  ADD CONSTRAINT pets_coordinates_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
  ADD CONSTRAINT pets_sex_valid CHECK (sex IN ('Macho', 'Fêmea')),
  ADD CONSTRAINT pets_size_valid CHECK (size IN ('Porte pequeno', 'Porte médio', 'Porte grande'));

ALTER TABLE pets DROP COLUMN location;

CREATE INDEX idx_pets_city ON pets (city);
