-- Contas de adotantes (e-mail + senha e/ou conta do Google) e sessões de login.

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  -- Sempre em minúsculas, para "Ana@x.com" e "ana@x.com" serem a mesma conta.
  email         text NOT NULL UNIQUE CHECK (email = lower(email)),
  -- Hash scrypt da senha; vazio em contas criadas só pelo Google.
  password_hash text,
  -- Identificador da conta do Google ("sub" do token).
  google_sub    text UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_has_login CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

CREATE TABLE sessions (
  -- Guardamos só o SHA-256 do token; o token em si fica apenas no cookie do navegador.
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
