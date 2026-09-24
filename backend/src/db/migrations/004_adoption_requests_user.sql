-- Liga o pedido de adoção à conta de quem o fez (quando a pessoa estava logada).
-- Pedidos sem conta continuam com user_id vazio. Se a conta for apagada, o pedido fica.

ALTER TABLE adoption_requests
  ADD COLUMN user_id uuid REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_adoption_requests_user ON adoption_requests (user_id);
