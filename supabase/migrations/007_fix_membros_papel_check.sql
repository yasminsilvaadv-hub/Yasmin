-- Atualiza o CHECK constraint de membros.papel para incluir os novos papéis
ALTER TABLE membros DROP CONSTRAINT IF EXISTS membros_papel_check;

ALTER TABLE membros
  ADD CONSTRAINT membros_papel_check
  CHECK (papel IN ('admin', 'operacional', 'participante_sop', 'editor', 'viewer'));
