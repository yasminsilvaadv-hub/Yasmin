-- ============================================================
-- Migration 002: Livros de Atas + suporte a Conversão/Subscrição
-- Aplicar via Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Adiciona coluna evento_id em livros_societarios
ALTER TABLE livros_societarios
  ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES eventos(id);

-- 2. Adiciona coluna deliberacao para registrar a deliberação do evento/operação
ALTER TABLE livros_societarios
  ADD COLUMN IF NOT EXISTS deliberacao TEXT;

-- 3. Adiciona coluna anotacoes para contexto adicional
ALTER TABLE livros_societarios
  ADD COLUMN IF NOT EXISTS anotacoes TEXT;

-- 4. Atualiza a função fn_gerar_livro_societario para incluir
--    deliberacao e anotacoes do metadata da operação
CREATE OR REPLACE FUNCTION fn_gerar_livro_societario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_natureza      TEXT;
  v_proximo_numero INTEGER;
  v_deliberacao    TEXT;
  v_anotacoes      TEXT;
BEGIN
  -- Determina a natureza do livro conforme o tipo de operação
  v_natureza := CASE NEW.tipo_operacao
    WHEN 'transferencia'      THEN 'Transferência de Ações'
    WHEN 'emissao'            THEN 'Registro de Ações Nominativas'
    WHEN 'cancelamento'       THEN 'Registro de Ações Nominativas'
    WHEN 'onus_constituicao'  THEN 'Registro de Ações Nominativas'
    WHEN 'onus_extincao'      THEN 'Registro de Ações Nominativas'
    ELSE NULL
  END;

  IF v_natureza IS NULL THEN
    RETURN NEW; -- bonificação/desdobramento/grupamento não geram livro automaticamente
  END IF;

  -- Extrai deliberação e anotações do metadata
  v_deliberacao := NEW.metadata->>'deliberacao';
  v_anotacoes   := NEW.motivo;

  -- Número de ordem sequencial por (org, natureza)
  SELECT COALESCE(MAX(numero_ordem), 0) + 1
    INTO v_proximo_numero
    FROM livros_societarios
   WHERE organizacao_id = NEW.organizacao_id
     AND natureza = v_natureza;

  INSERT INTO livros_societarios (
    organizacao_id, natureza, numero_ordem,
    operacao_id, deliberacao, anotacoes,
    formato, periodo_inicio, periodo_fim
  ) VALUES (
    NEW.organizacao_id, v_natureza, v_proximo_numero,
    NEW.id, v_deliberacao, v_anotacoes,
    'digital', NEW.data_operacao::DATE, NEW.data_operacao::DATE
  );

  RETURN NEW;
END;
$$;

-- 5. Cria trigger para gerar Livros de Atas quando evento é concluído
CREATE OR REPLACE FUNCTION fn_gerar_livro_ata()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_natureza       TEXT;
  v_proximo_numero  INTEGER;
BEGIN
  -- Só gera livro quando o status muda para 'concluido'
  IF NEW.status <> 'concluido' THEN RETURN NEW; END IF;
  IF OLD.status = 'concluido' THEN RETURN NEW; END IF; -- já era concluido, não duplica

  -- Determina a natureza do Livro de Atas conforme o tipo de evento
  v_natureza := CASE NEW.tipo
    WHEN 'ago'  THEN 'Livro de Atas de AGO'
    WHEN 'age'  THEN 'Livro de Atas de AGE'
    WHEN 'rca'  THEN 'Livro de Atas de RCA'
    WHEN 'rd'   THEN 'Livro de Atas de RD'
    ELSE              'Livro de Atas'
  END;

  -- Número de ordem sequencial por (org, natureza)
  SELECT COALESCE(MAX(numero_ordem), 0) + 1
    INTO v_proximo_numero
    FROM livros_societarios
   WHERE organizacao_id = NEW.organizacao_id
     AND natureza = v_natureza;

  INSERT INTO livros_societarios (
    organizacao_id, natureza, numero_ordem,
    evento_id, deliberacao,
    formato, periodo_inicio, periodo_fim
  ) VALUES (
    NEW.organizacao_id, v_natureza, v_proximo_numero,
    NEW.id, NEW.ordem_do_dia,
    'digital', NEW.data_hora::DATE, NEW.data_hora::DATE
  );

  RETURN NEW;
END;
$$;

-- Cria o trigger em eventos (UPDATE — para quando status muda para concluido)
DROP TRIGGER IF EXISTS trg_livro_ata ON eventos;
CREATE TRIGGER trg_livro_ata
  AFTER INSERT OR UPDATE OF status ON eventos
  FOR EACH ROW EXECUTE FUNCTION fn_gerar_livro_ata();

-- 6. Gera retroativamente os livros de atas dos eventos já concluídos importados
-- (Só precisa rodar uma vez — o trigger cuida dos futuros)
DO $$
DECLARE
  ev RECORD;
  v_natureza TEXT;
  v_proximo_numero INTEGER;
BEGIN
  FOR ev IN
    SELECT * FROM eventos WHERE status = 'concluido'
  LOOP
    v_natureza := CASE ev.tipo
      WHEN 'ago'  THEN 'Livro de Atas de AGO'
      WHEN 'age'  THEN 'Livro de Atas de AGE'
      WHEN 'rca'  THEN 'Livro de Atas de RCA'
      WHEN 'rd'   THEN 'Livro de Atas de RD'
      ELSE              'Livro de Atas'
    END;

    -- Só insere se ainda não existe para este evento
    IF NOT EXISTS (
      SELECT 1 FROM livros_societarios
      WHERE organizacao_id = ev.organizacao_id
        AND evento_id = ev.id
    ) THEN
      SELECT COALESCE(MAX(numero_ordem), 0) + 1
        INTO v_proximo_numero
        FROM livros_societarios
       WHERE organizacao_id = ev.organizacao_id
         AND natureza = v_natureza;

      INSERT INTO livros_societarios (
        organizacao_id, natureza, numero_ordem,
        evento_id, deliberacao,
        formato, periodo_inicio, periodo_fim
      ) VALUES (
        ev.organizacao_id, v_natureza, v_proximo_numero,
        ev.id, ev.ordem_do_dia,
        'digital', ev.data_hora::DATE, ev.data_hora::DATE
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- RESULTADO ESPERADO após aplicar:
--   - livros_societarios.evento_id: FK para eventos
--   - livros_societarios.deliberacao: texto da deliberação
--   - livros_societarios.anotacoes: anotações
--   - Trigger trg_livro_ata em eventos → gera Livro de Atas automaticamente
--   - Livros de Atas gerados retroativamente para AGE/AGC já importados
-- ============================================================
