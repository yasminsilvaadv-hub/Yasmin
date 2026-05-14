export type TipoOperacao =
  | 'emissao'
  | 'transferencia'
  | 'cancelamento'
  | 'onus_constituicao'
  | 'onus_extincao'
  | 'bonificacao'
  | 'desdobramento'
  | 'grupamento'

export interface PessoaSimples {
  id: string
  nome: string
  cpf_cnpj: string | null
}

export interface AtivoSimples {
  id: string
  codigo: string
  especie: string | null
  tipo: string
  nome_classe: string | null
}

export interface OperacaoRow {
  id: string
  data_operacao: string       // coluna real no banco
  tipo_operacao: TipoOperacao // coluna real no banco
  quantidade: number
  preco_unitario: number | null
  motivo: string | null
  metadata: Record<string, unknown> | null
  ativo: AtivoSimples | null
  pessoa_origem: PessoaSimples | null
  pessoa_destino: PessoaSimples | null
}
