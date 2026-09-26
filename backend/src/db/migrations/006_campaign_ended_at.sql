-- Encerrar campanha: active = false e a data do encerramento.
-- Campanha encerrada sai da página Doar e não recebe novas doações.

ALTER TABLE campaigns ADD COLUMN ended_at timestamptz;

UPDATE campaigns SET ended_at = now() WHERE NOT active;
