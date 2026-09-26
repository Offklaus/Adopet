-- Fotos enviadas pelo cadastro de animais (upload). O pet guarda o endereço
-- "/api/photos/<id>" na coluna photo, igual a um link externo.

CREATE TABLE pet_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  data         bytea NOT NULL,
  size         integer NOT NULL CHECK (size > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);
