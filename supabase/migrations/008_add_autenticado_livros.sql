-- Adiciona campo explícito de autenticação aos livros societários
ALTER TABLE livros_societarios
  ADD COLUMN IF NOT EXISTS autenticado boolean NOT NULL DEFAULT false;

-- Backfill: marca como autenticado se já tem data_autenticacao
UPDATE livros_societarios
  SET autenticado = true
  WHERE data_autenticacao IS NOT NULL;
