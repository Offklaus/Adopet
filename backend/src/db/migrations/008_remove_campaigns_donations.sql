-- O site deixou de ter campanhas e doações: nenhuma movimentação de dinheiro passa pelo sistema.
-- Doações referenciam campanhas, então saem primeiro.

DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS campaigns;
