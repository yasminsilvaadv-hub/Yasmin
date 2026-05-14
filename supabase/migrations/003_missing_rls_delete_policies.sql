-- ============================================================
-- Fix: add missing DELETE (and some UPDATE) RLS policies
-- These tables had SELECT/INSERT/UPDATE but no DELETE,
-- causing silent failures when trying to delete records.
-- ============================================================

-- parcelas_vesting — needed for editing and deleting calendários
CREATE POLICY "parcelas_vesting_delete" ON parcelas_vesting FOR DELETE
  USING (calendario_id IN (
    SELECT id FROM calendarios_vesting
    WHERE organizacao_id IN (SELECT minha_organizacoes())
  ));

-- membros_orgao — needed for removing members from organs
CREATE POLICY "membros_orgao_delete" ON membros_orgao FOR DELETE
  USING (orgao_id IN (
    SELECT id FROM orgaos_sociais
    WHERE organizacao_id IN (SELECT minha_organizacoes())
  ));

-- requisitos_evento — needed for deleting event requirements
CREATE POLICY "requisitos_evento_delete" ON requisitos_evento FOR DELETE
  USING (evento_id IN (
    SELECT id FROM eventos
    WHERE organizacao_id IN (SELECT minha_organizacoes())
  ));

-- programas_equity — needed for deleting programs
CREATE POLICY "programas_equity_delete" ON programas_equity FOR DELETE
  USING (plano_id IN (
    SELECT id FROM planos_equity
    WHERE organizacao_id IN (SELECT minha_organizacoes())
  ));

-- historico_contratos — add update and delete
CREATE POLICY "historico_contratos_update" ON historico_contratos FOR UPDATE
  USING (contrato_id IN (
    SELECT id FROM contratos_equity
    WHERE organizacao_id IN (SELECT minha_organizacoes())
  ));
CREATE POLICY "historico_contratos_delete" ON historico_contratos FOR DELETE
  USING (contrato_id IN (
    SELECT id FROM contratos_equity
    WHERE organizacao_id IN (SELECT minha_organizacoes())
  ));
