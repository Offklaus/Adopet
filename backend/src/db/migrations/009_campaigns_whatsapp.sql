-- Campanhas de arrecadação, sem pagamento pelo site: o botão "Doar" abre o WhatsApp da ONG
-- com a mensagem pronta. O valor arrecadado é atualizado pelo administrador quando a ONG recebe.
-- (As tabelas antigas campaigns/donations foram removidas na 008; donations não volta.)

CREATE TABLE campaigns (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  tag         text,
  goal        integer NOT NULL CHECK (goal > 0),
  raised      integer NOT NULL DEFAULT 0 CHECK (raised >= 0),
  -- WhatsApp da ONG responsável: DDD + número, só dígitos (10 ou 11).
  whatsapp    text NOT NULL CHECK (whatsapp ~ '^[0-9]{10,11}$'),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz
);
