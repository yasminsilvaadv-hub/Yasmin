export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TipoAtivo = 'acao' | 'debenture' | 'conversivel' | 'quota'
export type EspecieAtivo = 'ordinaria' | 'preferencial'
export type TipoOperacao =
  | 'emissao'
  | 'transferencia'
  | 'cancelamento'
  | 'onus_constituicao'
  | 'onus_extincao'
  | 'bonificacao'
  | 'desdobramento'
  | 'grupamento'
export type TipoEvento = 'rca' | 'ago' | 'age' | 'rd'
export type StatusEvento = 'pendente' | 'concluido' | 'cancelado'
export type TipoEquity = 'stock_options' | 'rsu' | 'phantom' | 'sar' | 'partnership'
export type StatusContrato = 'rascunho' | 'em_assinatura' | 'ativo' | 'cancelado'
export type NaturezaContrato = 'mercantil' | 'gratuita'
export type TipoPessoa = 'pessoa_fisica' | 'pessoa_juridica'
export type FormatoLivro = 'digital' | 'fisico'
export type PapelMembro = 'admin' | 'editor' | 'viewer'
export type UnidadeVesting = 'anos' | 'meses'
export type TipoParcela = 'normal' | 'performance'
export type StatusRequisito = 'cumprido' | 'pendente' | 'atrasado'

export interface Database {
  public: {
    Tables: {
      organizacoes: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          tipo_societario: string | null
          slug: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizacoes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['organizacoes']['Insert']>
      }
      membros: {
        Row: {
          id: string
          organizacao_id: string
          user_id: string
          papel: PapelMembro
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['membros']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['membros']['Insert']>
      }
      pessoas: {
        Row: {
          id: string
          organizacao_id: string
          nome_completo: string
          cpf_cnpj: string | null
          tipo: TipoPessoa
          estado_civil: string | null
          profissao: string | null
          data_nascimento: string | null
          nacionalidade: string | null
          email_principal: string | null
          telefone_principal: string | null
          anotacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pessoas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pessoas']['Insert']>
      }
      ativos: {
        Row: {
          id: string
          organizacao_id: string
          tipo: TipoAtivo
          codigo: string
          especie: EspecieAtivo | null
          nome_classe: string | null
          votos_por_acao: number | null
          parametros: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ativos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ativos']['Insert']>
      }
      operacoes_ativos: {
        Row: {
          id: string
          organizacao_id: string
          ativo_id: string
          tipo_operacao: TipoOperacao
          origem_id: string | null
          destino_id: string | null
          quantidade: number
          preco_unitario: number | null
          data_operacao: string
          motivo: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['operacoes_ativos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['operacoes_ativos']['Insert']>
      }
      historico_preco_acao: {
        Row: {
          id: string
          organizacao_id: string
          ativo_id: string
          preco: number
          data_registro: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['historico_preco_acao']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['historico_preco_acao']['Insert']>
      }
      rodadas_investimento: {
        Row: {
          id: string
          organizacao_id: string
          nome: string
          data: string
          valuation_pre: number | null
          valuation_pos: number | null
          valor_captado: number | null
          preco_por_acao: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['rodadas_investimento']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['rodadas_investimento']['Insert']>
      }
      orgaos_sociais: {
        Row: {
          id: string
          organizacao_id: string
          nome: string
          tipo: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['orgaos_sociais']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['orgaos_sociais']['Insert']>
      }
      membros_orgao: {
        Row: {
          id: string
          orgao_id: string
          pessoa_id: string
          cargo: string
          data_inicio: string
          duracao_mandato: number | null
          status: 'ativo' | 'inativo'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['membros_orgao']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['membros_orgao']['Insert']>
      }
      eventos: {
        Row: {
          id: string
          organizacao_id: string
          orgao_id: string | null
          tipo: TipoEvento
          nome: string
          data_hora: string
          ordem_do_dia: string | null
          status: StatusEvento
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['eventos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['eventos']['Insert']>
      }
      requisitos_evento: {
        Row: {
          id: string
          evento_id: string
          descricao: string
          tipo: string
          status: StatusRequisito
          prazo: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['requisitos_evento']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['requisitos_evento']['Insert']>
      }
      livros_societarios: {
        Row: {
          id: string
          organizacao_id: string
          natureza: string
          orgao_id: string | null
          numero_ordem: number
          periodo_inicio: string | null
          periodo_fim: string | null
          formato: FormatoLivro
          data_autenticacao: string | null
          orgao_autenticador: string | null
          operacao_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['livros_societarios']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['livros_societarios']['Insert']>
      }
      planos_equity: {
        Row: {
          id: string
          organizacao_id: string
          nome: string
          tipo: TipoEquity
          ativo_id: string | null
          pool_total: number
          data_inicio: string | null
          data_fim: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['planos_equity']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['planos_equity']['Insert']>
      }
      programas_equity: {
        Row: {
          id: string
          plano_id: string
          nome: string
          pool: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['programas_equity']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['programas_equity']['Insert']>
      }
      calendarios_vesting: {
        Row: {
          id: string
          organizacao_id: string
          nome: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['calendarios_vesting']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['calendarios_vesting']['Insert']>
      }
      parcelas_vesting: {
        Row: {
          id: string
          calendario_id: string
          numero_parcela: number
          eh_cliff: boolean
          duracao: number
          unidade: UnidadeVesting
          prazo_exercicio: number | null
          percentual: number
          referencia: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['parcelas_vesting']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['parcelas_vesting']['Insert']>
      }
      contratos_equity: {
        Row: {
          id: string
          organizacao_id: string
          plano_id: string | null
          programa_id: string | null
          beneficiario_id: string | null
          tipo: TipoEquity
          status: StatusContrato
          calendario_id: string | null
          quantidade_outorgada: number
          preco_exercicio_strike: number | null
          natureza: NaturezaContrato | null
          data_aprovacao: string | null
          data_assinatura: string | null
          data_validade: string | null
          clicksign_envelope_id: string | null
          sequencial: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['contratos_equity']['Row'], 'id' | 'created_at' | 'sequencial'>
        Update: Partial<Database['public']['Tables']['contratos_equity']['Insert']>
      }
      historico_contratos: {
        Row: {
          id: string
          contrato_id: string
          data_operacao: string
          quantidade_acoes: number
          valor_operacao: number | null
          saldo_acoes: number
          descricao: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['historico_contratos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['historico_contratos']['Insert']>
      }
      documentos_contrato: {
        Row: {
          id: string
          contrato_id: string
          nome: string
          url_storage: string
          formato: string
          tamanho: number | null
          data_upload: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['documentos_contrato']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['documentos_contrato']['Insert']>
      }
    }
    Functions: {
      calcular_cap_table: {
        Args: {
          p_org_id: string
          p_data_ref: string
          p_incluir_tesouraria: boolean
          p_incluir_usufruto: boolean
        }
        Returns: {
          ativo_id: string
          codigo: string
          especie: string
          nome_classe: string
          tipo: string
          titular_id: string | null
          nome_titular: string | null
          quantidade: number
          capital_social: number
        }[]
      }
    }
  }
}
