-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- MULTI-TENANCY: organizacoes + membros
-- ============================================================
CREATE TABLE organizacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  tipo_societario TEXT,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE membros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel           TEXT NOT NULL DEFAULT 'viewer' CHECK (papel IN ('admin','editor','viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organizacao_id, user_id)
);

-- ============================================================
-- MÓDULO 5 — PESSOAS (stakeholders)
-- ============================================================
CREATE TABLE pessoas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id    UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome_completo     TEXT NOT NULL,
  cpf_cnpj          TEXT,
  tipo              TEXT NOT NULL DEFAULT 'pessoa_fisica' CHECK (tipo IN ('pessoa_fisica','pessoa_juridica')),
  estado_civil      TEXT,
  profissao         TEXT,
  data_nascimento   DATE,
  nacionalidade     TEXT,
  email_principal   TEXT,
  telefone_principal TEXT,
  anotacoes         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pessoas_org ON pessoas(organizacao_id);

-- ============================================================
-- MÓDULO 2A — ATIVOS
-- ============================================================
CREATE TABLE ativos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('acao','debenture','conversivel','quota')),
  codigo          TEXT NOT NULL,
  especie         TEXT CHECK (especie IN ('ordinaria','preferencial')),
  nome_classe     TEXT,
  votos_por_acao  INTEGER DEFAULT 1,
  parametros      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organizacao_id, codigo)
);

CREATE INDEX idx_ativos_org ON ativos(organizacao_id);

-- ============================================================
-- MÓDULO 2B — OPERAÇÕES (SOURCE OF TRUTH #1, IMUTÁVEL)
-- ============================================================
CREATE TABLE operacoes_ativos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  ativo_id        UUID NOT NULL REFERENCES ativos(id),
  tipo_operacao   TEXT NOT NULL CHECK (tipo_operacao IN (
    'emissao','transferencia','cancelamento',
    'onus_constituicao','onus_extincao',
    'bonificacao','desdobramento','grupamento'
  )),
  origem_id       UUID REFERENCES pessoas(id),
  destino_id      UUID REFERENCES pessoas(id),
  quantidade      NUMERIC NOT NULL CHECK (quantidade > 0),
  preco_unitario  NUMERIC,
  data_operacao   TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo          TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operacoes_org ON operacoes_ativos(organizacao_id);
CREATE INDEX idx_operacoes_ativo ON operacoes_ativos(ativo_id);
CREATE INDEX idx_operacoes_data ON operacoes_ativos(data_operacao);

-- ============================================================
-- MÓDULO 2C — HISTÓRICO DE PREÇO (SOURCE OF TRUTH #2)
-- ============================================================
CREATE TABLE historico_preco_acao (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  ativo_id        UUID NOT NULL REFERENCES ativos(id),
  preco           NUMERIC NOT NULL CHECK (preco > 0),
  data_registro   DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preco_org_ativo ON historico_preco_acao(organizacao_id, ativo_id);
CREATE INDEX idx_preco_data ON historico_preco_acao(data_registro);

-- ============================================================
-- MÓDULO 2D — RODADAS DE INVESTIMENTO
-- ============================================================
CREATE TABLE rodadas_investimento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  data            DATE NOT NULL,
  valuation_pre   NUMERIC,
  valuation_pos   NUMERIC,
  valor_captado   NUMERIC,
  preco_por_acao  NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rodadas_org ON rodadas_investimento(organizacao_id);

-- ============================================================
-- MÓDULO 3A — ÓRGÃOS SOCIAIS
-- ============================================================
CREATE TABLE orgaos_sociais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orgaos_org ON orgaos_sociais(organizacao_id);

CREATE TABLE membros_orgao (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orgao_id        UUID NOT NULL REFERENCES orgaos_sociais(id) ON DELETE CASCADE,
  pessoa_id       UUID NOT NULL REFERENCES pessoas(id),
  cargo           TEXT NOT NULL,
  data_inicio     DATE NOT NULL,
  duracao_mandato INTEGER,
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MÓDULO 3B — EVENTOS
-- ============================================================
CREATE TABLE eventos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  orgao_id        UUID REFERENCES orgaos_sociais(id),
  tipo            TEXT NOT NULL CHECK (tipo IN ('rca','ago','age','rd')),
  nome            TEXT NOT NULL,
  data_hora       TIMESTAMPTZ NOT NULL,
  ordem_do_dia    TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','concluido','cancelado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_org ON eventos(organizacao_id);

CREATE TABLE requisitos_evento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  descricao   TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('cumprido','pendente','atrasado')),
  prazo       DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MÓDULO 3C — LIVROS SOCIETÁRIOS (gerados por trigger)
-- ============================================================
CREATE TABLE livros_societarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id      UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  natureza            TEXT NOT NULL,
  orgao_id            UUID REFERENCES orgaos_sociais(id),
  numero_ordem        INTEGER NOT NULL,
  periodo_inicio      DATE,
  periodo_fim         DATE,
  formato             TEXT NOT NULL DEFAULT 'digital' CHECK (formato IN ('digital','fisico')),
  data_autenticacao   DATE,
  orgao_autenticador  TEXT,
  operacao_id         UUID REFERENCES operacoes_ativos(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_livros_org ON livros_societarios(organizacao_id);

-- Sequence de numero_ordem por (organizacao_id, natureza)
CREATE SEQUENCE IF NOT EXISTS livros_seq;

-- ============================================================
-- MÓDULO 4A — PLANOS EQUITY
-- ============================================================
CREATE TABLE planos_equity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('stock_options','rsu','phantom','sar','partnership')),
  ativo_id        UUID REFERENCES ativos(id),
  pool_total      NUMERIC NOT NULL DEFAULT 0,
  data_inicio     DATE,
  data_fim        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planos_org ON planos_equity(organizacao_id);

CREATE TABLE programas_equity (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id  UUID NOT NULL REFERENCES planos_equity(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  pool      NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MÓDULO 4B — CALENDÁRIOS DE VESTING
-- ============================================================
CREATE TABLE calendarios_vesting (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendarios_org ON calendarios_vesting(organizacao_id);

CREATE TABLE parcelas_vesting (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendario_id   UUID NOT NULL REFERENCES calendarios_vesting(id) ON DELETE CASCADE,
  numero_parcela  INTEGER NOT NULL,
  eh_cliff        BOOLEAN NOT NULL DEFAULT false,
  duracao         INTEGER NOT NULL,
  unidade         TEXT NOT NULL DEFAULT 'meses' CHECK (unidade IN ('anos','meses')),
  prazo_exercicio INTEGER,
  percentual      NUMERIC NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  referencia      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MÓDULO 4C — CONTRATOS EQUITY (SOURCE OF TRUTH #3)
-- ============================================================
CREATE SEQUENCE contratos_equity_seq;

CREATE TABLE contratos_equity (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id            UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  sequencial                INTEGER NOT NULL DEFAULT nextval('contratos_equity_seq'),
  plano_id                  UUID REFERENCES planos_equity(id),
  programa_id               UUID REFERENCES programas_equity(id),
  beneficiario_id           UUID REFERENCES pessoas(id),
  tipo                      TEXT NOT NULL CHECK (tipo IN ('stock_options','rsu','phantom','sar','partnership')),
  status                    TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_assinatura','ativo','cancelado')),
  calendario_id             UUID REFERENCES calendarios_vesting(id),
  quantidade_outorgada      NUMERIC NOT NULL CHECK (quantidade_outorgada > 0),
  -- STRIKE: fixado via historico_preco_acao na data_aprovacao. NUNCA atualizado após criação.
  preco_exercicio_strike    NUMERIC,
  natureza                  TEXT CHECK (natureza IN ('mercantil','gratuita')),
  data_aprovacao            DATE,
  data_assinatura           DATE,
  data_validade             DATE,
  clicksign_envelope_id     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contratos_org ON contratos_equity(organizacao_id);
CREATE INDEX idx_contratos_beneficiario ON contratos_equity(beneficiario_id);

CREATE TABLE historico_contratos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id     UUID NOT NULL REFERENCES contratos_equity(id) ON DELETE CASCADE,
  data_operacao   TIMESTAMPTZ NOT NULL DEFAULT now(),
  quantidade_acoes NUMERIC NOT NULL,
  valor_operacao  NUMERIC,
  saldo_acoes     NUMERIC NOT NULL,
  descricao       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documentos_contrato (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id  UUID NOT NULL REFERENCES contratos_equity(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  url_storage  TEXT NOT NULL,
  formato      TEXT NOT NULL,
  tamanho      INTEGER,
  data_upload  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER: ao inserir operação → gera entrada em livros_societarios
-- ============================================================
CREATE OR REPLACE FUNCTION fn_gerar_livro_societario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_natureza TEXT;
  v_proximo_numero INTEGER;
BEGIN
  -- Determina a natureza do livro conforme o tipo de operação
  v_natureza := CASE NEW.tipo_operacao
    WHEN 'transferencia'      THEN 'Transferência de Ações'
    WHEN 'emissao'            THEN 'Registro de Ações Nominativas'
    WHEN 'onus_constituicao'  THEN 'Registro de Ações Nominativas'
    WHEN 'onus_extincao'      THEN 'Registro de Ações Nominativas'
    ELSE 'Registro de Ações Nominativas'
  END;

  -- Número de ordem sequencial por (org, natureza)
  SELECT COALESCE(MAX(numero_ordem), 0) + 1
    INTO v_proximo_numero
    FROM livros_societarios
   WHERE organizacao_id = NEW.organizacao_id
     AND natureza = v_natureza;

  INSERT INTO livros_societarios (
    organizacao_id, natureza, numero_ordem,
    periodo_inicio, formato, operacao_id
  ) VALUES (
    NEW.organizacao_id, v_natureza, v_proximo_numero,
    NEW.data_operacao::DATE, 'digital', NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_livro_societario
  AFTER INSERT ON operacoes_ativos
  FOR EACH ROW EXECUTE FUNCTION fn_gerar_livro_societario();

-- ============================================================
-- FUNCTION: calcular_cap_table (event sourcing)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_cap_table(
  p_org_id           UUID,
  p_data_ref         DATE,
  p_incluir_tesouraria BOOLEAN DEFAULT true,
  p_incluir_usufruto   BOOLEAN DEFAULT true
)
RETURNS TABLE (
  ativo_id      UUID,
  codigo        TEXT,
  especie       TEXT,
  nome_classe   TEXT,
  tipo          TEXT,
  titular_id    UUID,
  nome_titular  TEXT,
  quantidade    NUMERIC,
  capital_social NUMERIC
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH movimentos AS (
    SELECT
      o.ativo_id,
      o.destino_id   AS titular_id,
      o.quantidade   AS delta,
      o.preco_unitario
    FROM operacoes_ativos o
    WHERE o.organizacao_id = p_org_id
      AND o.data_operacao::DATE <= p_data_ref
      AND o.tipo_operacao IN ('emissao','bonificacao','desdobramento')

    UNION ALL

    SELECT
      o.ativo_id,
      o.destino_id   AS titular_id,
      o.quantidade   AS delta,
      o.preco_unitario
    FROM operacoes_ativos o
    WHERE o.organizacao_id = p_org_id
      AND o.data_operacao::DATE <= p_data_ref
      AND o.tipo_operacao = 'transferencia'

    UNION ALL

    -- Transferência: debita origem
    SELECT
      o.ativo_id,
      o.origem_id    AS titular_id,
      -o.quantidade  AS delta,
      NULL
    FROM operacoes_ativos o
    WHERE o.organizacao_id = p_org_id
      AND o.data_operacao::DATE <= p_data_ref
      AND o.tipo_operacao = 'transferencia'

    UNION ALL

    -- Cancelamento: debita titular
    SELECT
      o.ativo_id,
      o.origem_id    AS titular_id,
      -o.quantidade  AS delta,
      NULL
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
    s.quantidade * COALESCE(
      (SELECT hp.preco FROM historico_preco_acao hp
       WHERE hp.ativo_id = a.id AND hp.data_registro <= p_data_ref
       ORDER BY hp.data_registro DESC LIMIT 1),
      0
    ) AS capital_social
  FROM saldos s
  JOIN ativos a ON a.id = s.ativo_id
  LEFT JOIN pessoas p ON p.id = s.titular_id
  ORDER BY a.codigo, p.nome_completo;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: retorna os organizacao_ids do usuário atual
CREATE OR REPLACE FUNCTION minha_organizacoes()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organizacao_id FROM membros WHERE user_id = auth.uid()
$$;

-- Habilita RLS
ALTER TABLE organizacoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ativos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes_ativos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_preco_acao ENABLE ROW LEVEL SECURITY;
ALTER TABLE rodadas_investimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgaos_sociais     ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_orgao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitos_evento  ENABLE ROW LEVEL SECURITY;
ALTER TABLE livros_societarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_equity      ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas_equity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendarios_vesting ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_vesting   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_equity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_contrato ENABLE ROW LEVEL SECURITY;

-- Policies organizacoes
CREATE POLICY "org_select" ON organizacoes FOR SELECT USING (id IN (SELECT minha_organizacoes()));
CREATE POLICY "org_insert" ON organizacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "org_update" ON organizacoes FOR UPDATE USING (id IN (SELECT minha_organizacoes()));

-- Policies membros
CREATE POLICY "membros_select" ON membros FOR SELECT USING (organizacao_id IN (SELECT minha_organizacoes()));
CREATE POLICY "membros_insert" ON membros FOR INSERT WITH CHECK (organizacao_id IN (SELECT minha_organizacoes()));
CREATE POLICY "membros_update" ON membros FOR UPDATE USING (organizacao_id IN (SELECT minha_organizacoes()));

-- Policy genérica para tabelas com organizacao_id (select/insert/update/delete)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pessoas','ativos','operacoes_ativos','historico_preco_acao',
    'rodadas_investimento','orgaos_sociais','eventos',
    'livros_societarios','planos_equity','calendarios_vesting',
    'contratos_equity'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "%1$s_select" ON %1$s FOR SELECT USING (organizacao_id IN (SELECT minha_organizacoes()))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT WITH CHECK (organizacao_id IN (SELECT minha_organizacoes()))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE USING (organizacao_id IN (SELECT minha_organizacoes()))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE USING (organizacao_id IN (SELECT minha_organizacoes()))',
      t
    );
  END LOOP;
END;
$$;

-- Policies para tabelas sem organizacao_id direto (via FK)
CREATE POLICY "membros_orgao_select" ON membros_orgao FOR SELECT
  USING (orgao_id IN (SELECT id FROM orgaos_sociais WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "membros_orgao_insert" ON membros_orgao FOR INSERT
  WITH CHECK (orgao_id IN (SELECT id FROM orgaos_sociais WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "membros_orgao_update" ON membros_orgao FOR UPDATE
  USING (orgao_id IN (SELECT id FROM orgaos_sociais WHERE organizacao_id IN (SELECT minha_organizacoes())));

CREATE POLICY "requisitos_evento_select" ON requisitos_evento FOR SELECT
  USING (evento_id IN (SELECT id FROM eventos WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "requisitos_evento_insert" ON requisitos_evento FOR INSERT
  WITH CHECK (evento_id IN (SELECT id FROM eventos WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "requisitos_evento_update" ON requisitos_evento FOR UPDATE
  USING (evento_id IN (SELECT id FROM eventos WHERE organizacao_id IN (SELECT minha_organizacoes())));

CREATE POLICY "programas_equity_select" ON programas_equity FOR SELECT
  USING (plano_id IN (SELECT id FROM planos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "programas_equity_insert" ON programas_equity FOR INSERT
  WITH CHECK (plano_id IN (SELECT id FROM planos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "programas_equity_update" ON programas_equity FOR UPDATE
  USING (plano_id IN (SELECT id FROM planos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));

CREATE POLICY "parcelas_vesting_select" ON parcelas_vesting FOR SELECT
  USING (calendario_id IN (SELECT id FROM calendarios_vesting WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "parcelas_vesting_insert" ON parcelas_vesting FOR INSERT
  WITH CHECK (calendario_id IN (SELECT id FROM calendarios_vesting WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "parcelas_vesting_update" ON parcelas_vesting FOR UPDATE
  USING (calendario_id IN (SELECT id FROM calendarios_vesting WHERE organizacao_id IN (SELECT minha_organizacoes())));

CREATE POLICY "historico_contratos_select" ON historico_contratos FOR SELECT
  USING (contrato_id IN (SELECT id FROM contratos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "historico_contratos_insert" ON historico_contratos FOR INSERT
  WITH CHECK (contrato_id IN (SELECT id FROM contratos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));

CREATE POLICY "documentos_contrato_select" ON documentos_contrato FOR SELECT
  USING (contrato_id IN (SELECT id FROM contratos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "documentos_contrato_insert" ON documentos_contrato FOR INSERT
  WITH CHECK (contrato_id IN (SELECT id FROM contratos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));
CREATE POLICY "documentos_contrato_delete" ON documentos_contrato FOR DELETE
  USING (contrato_id IN (SELECT id FROM contratos_equity WHERE organizacao_id IN (SELECT minha_organizacoes())));
