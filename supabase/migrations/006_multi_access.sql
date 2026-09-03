-- ============================================================
-- Migration 006: Multi-access (admin / operacional / participante_sop)
-- ============================================================

-- 1. Adiciona pessoa_id em membros para vincular participante SOP à sua pessoa
ALTER TABLE membros ADD COLUMN IF NOT EXISTS pessoa_id UUID REFERENCES pessoas(id);
CREATE INDEX IF NOT EXISTS idx_membros_pessoa_id ON membros(pessoa_id);

-- 2. Renomeia papel 'editor' → 'operacional' (retroativo)
UPDATE membros SET papel = 'operacional' WHERE papel = 'editor';
UPDATE membros SET papel = 'operacional' WHERE papel = 'viewer';
