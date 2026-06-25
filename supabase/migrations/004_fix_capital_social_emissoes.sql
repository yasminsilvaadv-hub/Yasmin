-- ============================================================
-- Migration 004: Capital social via contribuição por emissão
--
-- Cada operação de emissão passa a ter um campo dedicado:
-- "contribuicao_capital_social" — o valor efetivamente
-- creditado ao capital social naquela subscrição.
-- Isso permite separar o ágio (reserva de capital) do
-- capital registrado, seguindo a lógica de S.A. brasileira.
-- ============================================================

-- 1. Adiciona coluna na tabela de operações
ALTER TABLE operacoes_ativos
  ADD COLUMN IF NOT EXISTS contribuicao_capital_social NUMERIC;

-- 2. Backfill dos dados existentes:
--    Para emissões com preço registrado, contribuição = qtd × preço
UPDATE operacoes_ativos
SET contribuicao_capital_social = quantidade * preco_unitario
WHERE tipo_operacao = 'emissao'
  AND preco_unitario IS NOT NULL
  AND contribuicao_capital_social IS NULL;

-- 3. Recria a função calcular_cap_table usando o novo campo
CREATE OR REPLACE FUNCTION calcular_cap_table(
  p_org_id             UUID,
  p_data_ref           DATE,
  p_incluir_tesouraria BOOLEAN DEFAULT true,
  p_incluir_usufruto   BOOLEAN DEFAULT true
)
RETURNS TABLE (
  ativo_id       UUID,
  codigo         TEXT,
  especie        TEXT,
  nome_classe    TEXT,
  tipo           TEXT,
  titular_id     UUID,
  nome_titular   TEXT,
  quantidade     NUMERIC,
  capital_social NUMERIC
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_capital_social NUMERIC;
BEGIN
  -- Capital social = soma das contribuições de todas as emissões
  -- até a data de referência (emissões sem contribuição somam zero)
  SELECT COALESCE(
    SUM(COALESCE(o.contribuicao_capital_social, 0)),
    0
  )
  INTO v_capital_social
  FROM operacoes_ativos o
  WHERE o.organizacao_id = p_org_id
    AND o.data_operacao::DATE <= p_data_ref
    AND o.tipo_operacao = 'emissao';

  RETURN QUERY
  WITH movimentos AS (
    -- Emissão / bonificação / desdobramento: credita destino
    SELECT
      o.ativo_id,
      o.destino_id  AS titular_id,
      o.quantidade  AS delta
    FROM operacoes_ativos o
    WHERE o.organizacao_id = p_org_id
      AND o.data_operacao::DATE <= p_data_ref
      AND o.tipo_operacao IN ('emissao', 'bonificacao', 'desdobramento')

    UNION ALL

    -- Transferência: credita destino
    SELECT
      o.ativo_id,
      o.destino_id  AS titular_id,
      o.quantidade  AS delta
    FROM operacoes_ativos o
    WHERE o.organizacao_id = p_org_id
      AND o.data_operacao::DATE <= p_data_ref
      AND o.tipo_operacao = 'transferencia'

    UNION ALL

    -- Transferência: debita origem
    SELECT
      o.ativo_id,
      o.origem_id   AS titular_id,
      -o.quantidade AS delta
    FROM operacoes_ativos o
    WHERE o.organizacao_id = p_org_id
      AND o.data_operacao::DATE <= p_data_ref
      AND o.tipo_operacao = 'transferencia'

    UNION ALL

    -- Cancelamento: debita titular
    SELECT
      o.ativo_id,
      o.origem_id   AS titular_id,
      -o.quantidade AS delta
    FROM operacoes_ativos o
    WHERE o.organizacao_id = p_org_id
      AND o.data_operacao::DATE <= p_data_ref
      AND o.tipo_operacao = 'cancelamento'
  ),
  saldos AS (
    SELECT
      m.ativo_id,
      m.titular_id,
      SUM(m.delta) AS quantidade
    FROM movimentos m
    GROUP BY m.ativo_id, m.titular_id
    HAVING SUM(m.delta) > 0
  )
  SELECT
    a.id            AS ativo_id,
    a.codigo,
    a.especie,
    a.nome_classe,
    a.tipo,
    s.titular_id,
    p.nome_completo AS nome_titular,
    s.quantidade,
    v_capital_social AS capital_social  -- total da org, igual em todas as linhas
  FROM saldos s
  JOIN ativos a ON a.id = s.ativo_id
  LEFT JOIN pessoas p ON p.id = s.titular_id
  ORDER BY a.codigo, p.nome_completo;
END;
$$;
