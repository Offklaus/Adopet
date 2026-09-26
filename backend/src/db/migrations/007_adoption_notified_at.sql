-- Quando o adotante foi avisado da decisão (aprovado ou recusado) pelo WhatsApp.
-- Vazio: ainda não avisado.

ALTER TABLE adoption_requests ADD COLUMN notified_at timestamptz;
