USE amen_bank;

-- Enforce one bank account per client
ALTER TABLE bank_accounts ADD UNIQUE INDEX idx_one_account_per_client (client_id);

-- Enforce one card per client
ALTER TABLE account_cards ADD UNIQUE INDEX idx_one_card_per_client (client_id);
