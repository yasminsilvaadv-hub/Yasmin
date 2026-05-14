import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Supabase service client (bypasses RLS) ──────────────────────────────────

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Organizacao {
  id: string
  nome: string
  cnpj: string | null
  municipio?: string | null
  uf?: string | null
}

interface Transferencia {
  id: string
  data_operacao: string
  tipo_operacao: string
  quantidade: number
  preco_unitario: number | null
  motivo: string | null
  metadata: Record<string, unknown> | null
  // ativo
  ativo_codigo: string
  ativo_especie: string | null
  ativo_nome_classe: string | null
  // origem (cedente)
  origem_id: string | null
  origem_nome: string | null
  origem_doc: string | null
  origem_tipo: string | null
  origem_qualificacao: string | null
  // destino (cessionário)
  destino_id: string | null
  destino_nome: string | null
  destino_doc: string | null
  destino_tipo: string | null
  destino_qualificacao: string | null
}

interface Livro {
  numero_ordem: number
  periodo_inicio: string | null
  periodo_fim: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fNum(n: number): string {
  return n.toLocaleString('pt-BR')
}

function fDate(iso: string): string {
  try {
    return format(new Date(iso.includes('T') ? iso : iso + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}

function fDateLong(iso: string): string {
  try {
    return format(new Date(iso.includes('T') ? iso : iso + 'T00:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return iso
  }
}

/**
 * Convert a number to its Portuguese written form (simplified, for shares up to millions).
 * We handle common cases; for very large numbers we fall back to the numeric form.
 */
function numPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  if (n < 0) return `menos ${numPorExtenso(-n)}`

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

  function centena(num: number): string {
    if (num === 100) return 'cem'
    const c = Math.floor(num / 100)
    const resto = num % 100
    if (resto === 0) return centenas[c]
    const restoStr = resto < 20 ? unidades[resto] : dezenas[Math.floor(resto / 10)] + (resto % 10 !== 0 ? ' e ' + unidades[resto % 10] : '')
    return (c > 0 ? centenas[c] + ' e ' : '') + restoStr
  }

  if (n < 20) return unidades[n]
  if (n < 100) {
    const d = Math.floor(n / 10)
    const u = n % 10
    return dezenas[d] + (u !== 0 ? ' e ' + unidades[u] : '')
  }
  if (n < 1000) return centena(n)
  if (n < 2000) return 'mil' + (n % 1000 !== 0 ? ' e ' + centena(n % 1000) : '')
  if (n < 1_000_000) {
    const m = Math.floor(n / 1000)
    const resto = n % 1000
    return centena(m) + ' mil' + (resto !== 0 ? ' e ' + centena(resto) : '')
  }
  if (n < 2_000_000) {
    const resto = n % 1_000_000
    return 'um milhão' + (resto !== 0 ? ' e ' + fNum(resto) : '')
  }
  if (n < 1_000_000_000) {
    const m = Math.floor(n / 1_000_000)
    const resto = n % 1_000_000
    return fNum(m) + ' milhões' + (resto !== 0 ? ' e ' + fNum(resto) : '')
  }
  return fNum(n)
}

function acoesDescricaoCompleta(
  especie: string | null,
  nomeClasse: string | null,
): string {
  const especieMap: Record<string, string> = {
    ordinaria: 'ordinárias',
    preferencial: 'preferenciais',
  }
  const tipo = especie ? (especieMap[especie] ?? especie) : ''
  if (nomeClasse) return `${tipo} classe ${nomeClasse}`
  return tipo
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function LivroTransferenciasPage({ params }: Props) {
  const { orgSlug } = await params
  const sb = getServiceClient()

  // 1. Organização
  const { data: orgRaw } = await sb
    .from('organizacoes')
    .select('id, nome, cnpj, municipio, uf')
    .eq('slug', orgSlug)
    .single()

  if (!orgRaw) notFound()
  const org: Organizacao = orgRaw

  // 2. Livro de transferência
  const { data: livroRaw } = await sb
    .from('livros_societarios')
    .select('numero_ordem, periodo_inicio, periodo_fim')
    .eq('organizacao_id', org.id)
    .ilike('natureza', '%Transferência%')
    .order('numero_ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const livro: Livro = livroRaw ?? { numero_ordem: 1, periodo_inicio: null, periodo_fim: null }

  // 3. Fetch all transfer operations
  const { data: opsRaw } = await sb
    .from('operacoes_ativos')
    .select(`
      id, data_operacao, tipo_operacao, quantidade, preco_unitario, motivo, metadata,
      ativos!inner ( codigo, especie, nome_classe ),
      origem:pessoas!operacoes_ativos_origem_id_fkey ( id, nome_completo, cpf_cnpj, tipo, qualificacao ),
      destino:pessoas!operacoes_ativos_destino_id_fkey ( id, nome_completo, cpf_cnpj, tipo, qualificacao )
    `)
    .eq('organizacao_id', org.id)
    .eq('tipo_operacao', 'transferencia')
    .order('data_operacao', { ascending: true })

  const transferencias: Transferencia[] = (opsRaw ?? []).map((o: Record<string, unknown>) => {
    const ativo = Array.isArray(o.ativos) ? o.ativos[0] : (o.ativos as Record<string, unknown>)
    const origem = Array.isArray(o.origem) ? o.origem[0] : (o.origem as Record<string, unknown> | null)
    const destino = Array.isArray(o.destino) ? o.destino[0] : (o.destino as Record<string, unknown> | null)
    return {
      id: o.id as string,
      data_operacao: o.data_operacao as string,
      tipo_operacao: o.tipo_operacao as string,
      quantidade: o.quantidade as number,
      preco_unitario: (o.preco_unitario as number) ?? null,
      motivo: (o.motivo as string) ?? null,
      metadata: (o.metadata as Record<string, unknown>) ?? null,
      ativo_codigo: ativo?.codigo as string ?? '',
      ativo_especie: ativo?.especie as string ?? null,
      ativo_nome_classe: ativo?.nome_classe as string ?? null,
      origem_id: origem?.id as string ?? null,
      origem_nome: origem?.nome_completo as string ?? null,
      origem_doc: origem?.cpf_cnpj as string ?? null,
      origem_tipo: origem?.tipo as string ?? null,
      origem_qualificacao: origem?.qualificacao as string ?? null,
      destino_id: destino?.id as string ?? null,
      destino_nome: destino?.nome_completo as string ?? null,
      destino_doc: destino?.cpf_cnpj as string ?? null,
      destino_tipo: destino?.tipo as string ?? null,
      destino_qualificacao: destino?.qualificacao as string ?? null,
    }
  })

  const sede = org.municipio && org.uf
    ? `${org.municipio}/${org.uf}`
    : 'Florianópolis/SC'

  const now = new Date()
  const printDate = fDateLong(now.toISOString())
  const printTime = format(now, 'HH:mm', { locale: ptBR })
  const printId = crypto.randomUUID()

  return (
    <>
      <style>{`
        /* ── Print reset ──────────────────────────────────────── */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #000;
          background: #fff;
        }

        /* Screen preview toolbar */
        .screen-toolbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1000;
          background: #1e293b;
          color: #f8fafc;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: system-ui, sans-serif;
          font-size: 13px;
        }
        .screen-toolbar button {
          background: #3b82f6;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }
        .screen-toolbar button:hover { background: #2563eb; }

        @media print {
          .screen-toolbar { display: none !important; }
        }

        /* ── Page structure ───────────────────────────────────── */
        .print-document {
          margin-top: 52px;
        }

        @media print {
          .print-document { margin-top: 0; }
          html, body { margin: 0; padding: 0; }
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 22mm 22mm 28mm 22mm;
          margin: 0 auto;
          background: #fff;
          position: relative;
        }

        @media screen {
          .page {
            border: 1px solid #ccc;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            margin-bottom: 24px;
          }
        }

        @media print {
          .page {
            margin: 0;
            border: none;
            box-shadow: none;
            page-break-after: always;
            break-after: page;
          }
          .page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }

        /* ── Document title ───────────────────────────────────── */
        .doc-title {
          text-align: center;
          margin-bottom: 20pt;
        }
        .doc-title h1 {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1pt;
          margin-bottom: 6pt;
        }
        .doc-title h2 {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 6pt 0;
          margin-bottom: 6pt;
        }
        .doc-title p {
          font-size: 10pt;
          color: #444;
        }

        /* ── Livro header (mini) ──────────────────────────────── */
        .livro-header {
          display: flex;
          justify-content: space-between;
          font-size: 9pt;
          color: #555;
          margin-bottom: 16pt;
          border-bottom: 1px solid #ccc;
          padding-bottom: 6pt;
        }

        /* ── Page counter ─────────────────────────────────────── */
        .page-counter {
          font-size: 9pt;
          text-align: right;
          color: #666;
          margin-bottom: 4pt;
        }

        /* ── Termo body ───────────────────────────────────────── */
        .termo-body {
          font-size: 11pt;
          line-height: 1.8;
          text-align: justify;
          margin-bottom: 24pt;
          hyphens: auto;
        }
        .termo-body strong { font-weight: bold; }

        /* ── Signatures ───────────────────────────────────────── */
        .assinaturas {
          display: flex;
          justify-content: space-around;
          margin-top: 40pt;
          gap: 20pt;
        }
        .assinatura {
          flex: 1;
          text-align: center;
        }
        .assinatura-linha {
          border-bottom: 1px solid #000;
          margin-bottom: 6pt;
          height: 30pt;
        }
        .assinatura-nome {
          font-size: 10pt;
          font-weight: bold;
        }
        .assinatura-papel {
          font-size: 9.5pt;
          color: #333;
        }

        /* ── Footer ──────────────────────────────────────────── */
        .doc-footer {
          position: absolute;
          bottom: 18mm;
          left: 22mm;
          right: 22mm;
          border-top: 1px solid #aaa;
          padding-top: 6pt;
          font-size: 7.5pt;
          color: #666;
          text-align: center;
          font-family: 'Times New Roman', Times, serif;
        }

        /* ── Empty state ──────────────────────────────────────── */
        .empty-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 250mm;
          gap: 12pt;
          color: #666;
          font-size: 12pt;
          font-style: italic;
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="screen-toolbar">
        <span style={{ fontWeight: 700 }}>Livro de Transferências de Ações Nominativas</span>
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{org.nome}</span>
        <span style={{ marginLeft: 'auto' }}></span>
        <button onClick={() => (typeof window !== 'undefined' && window.print())}>
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Auto-print */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.onload = function() {
            setTimeout(function() { window.print(); }, 600);
          }`,
        }}
      />

      <div className="print-document">
        {transferencias.length === 0 ? (
          <div className="page">
            <div className="empty-page">
              <p>Nenhuma transferência de ações registrada.</p>
            </div>
            <div className="doc-footer">
              Este livro foi gerado pela plataforma Gestão Societária em {printTime} de {printDate} &bull; ID: {printId}
            </div>
          </div>
        ) : (
          transferencias.map((tr, idx) => {
            const termoNum = idx + 1
            const dateFormatted = fDate(tr.data_operacao)
            const dateLong = fDateLong(tr.data_operacao)
            const qtdExtenso = capitalize(numPorExtenso(tr.quantidade))
            const acoesDesc = acoesDescricaoCompleta(tr.ativo_especie, tr.ativo_nome_classe)

            // Onerosa vs. gratuita
            const tipoOriginal = tr.metadata?.tipo_original as string | undefined
            const isOnerosa = tipoOriginal ? tipoOriginal === 'transferencia' : true
            const naturezaTransf = isOnerosa ? 'onerosa' : 'gratuita'
            const naturezaOp = isOnerosa ? 'compra e venda' : 'doação'

            // Annotations from motivo or metadata
            const anotacoes = tr.motivo ?? ''
            const valorTotal = tr.preco_unitario != null
              ? tr.quantidade * tr.preco_unitario
              : null

            const valorStr = valorTotal != null
              ? ` pelo valor de ${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              : ''

            // Build text body
            const cedente = tr.origem_nome ?? 'Cedente não identificado'
            const cessionario = tr.destino_nome ?? 'Cessionário não identificado'
            const cedenteCpf = tr.origem_doc
            const cessionarioCpf = tr.destino_doc
            const cedenteQual = tr.origem_qualificacao ?? ''
            const cessionarioQual = tr.destino_qualificacao ?? ''

            return (
              <div key={tr.id} className="page">
                <div className="page-counter">
                  {termoNum}/{transferencias.length}
                </div>

                {/* Mini livro header */}
                <div className="livro-header">
                  <span>
                    <strong>{org.nome}</strong>
                    {org.cnpj ? ` — CNPJ: ${org.cnpj}` : ''}
                  </span>
                  <span>
                    Livro de Transferências Nº {livro.numero_ordem}
                    {livro.periodo_inicio
                      ? ` — ${fDate(livro.periodo_inicio)}${livro.periodo_fim ? ' a ' + fDate(livro.periodo_fim) : ''}`
                      : ''}
                  </span>
                </div>

                {/* Título do documento */}
                <div className="doc-title">
                  <h1>Transferência de Ações Nominativas</h1>
                  <h2>Termo de Transferência Nº {termoNum}</h2>
                  <p>{dateFormatted}</p>
                </div>

                {/* Corpo do Termo */}
                <div className="termo-body">
                  <p>
                    No dia <strong>{dateLong}</strong>, na sede da Companhia, compareceu
                    o(a) acionista <strong>{cedente}</strong>
                    {cedenteQual ? `, ${cedenteQual}` : ''}
                    {cedenteCpf
                      ? `, inscrito(a) no CPF/MF sob o nº <strong>${cedenteCpf}</strong>`
                      : ''}
                    {' '}
                    (&ldquo;<strong>Cedente</strong>&rdquo;), e declarou a transferência{' '}
                    <strong>{naturezaTransf}</strong> de{' '}
                    <strong>{fNum(tr.quantidade)} ({qtdExtenso})</strong> ações{' '}
                    {acoesDesc && <strong>{acoesDesc}</strong>}, nominativas e sem valor
                    nominal de sua titularidade, por meio de operação de{' '}
                    <strong>{naturezaOp}</strong>{valorStr}, com todos os direitos e
                    obrigações constantes do Estatuto Social, a{' '}
                    <strong>{cessionario}</strong>
                    {cessionarioQual ? `, ${cessionarioQual}` : ''}
                    {cessionarioCpf
                      ? `, inscrito(a) no CPF/CNPJ sob o nº <strong>${cessionarioCpf}</strong>`
                      : ''}
                    {' '}(&ldquo;<strong>Cessionário(a)</strong>&rdquo;).{' '}
                    {anotacoes ? <span>{anotacoes} </span> : ''}
                    Pelo(a) Cessionário(a) foi declarada a aceitação da transferência, das
                    quais se lavrou este Termo de Transferência que assinam conjuntamente.
                  </p>
                </div>

                {/* Local e data */}
                <p style={{ textAlign: 'right', fontSize: '11pt', marginBottom: '8pt' }}>
                  {sede}, {dateLong}.
                </p>

                {/* Assinaturas */}
                <div className="assinaturas">
                  <div className="assinatura">
                    <div className="assinatura-linha" />
                    <p className="assinatura-nome">{cedente}</p>
                    <p className="assinatura-papel">Cedente</p>
                    {cedenteCpf && (
                      <p style={{ fontSize: '8.5pt', color: '#555' }}>CPF/CNPJ: {cedenteCpf}</p>
                    )}
                  </div>
                  <div className="assinatura">
                    <div className="assinatura-linha" />
                    <p className="assinatura-nome">{cessionario}</p>
                    <p className="assinatura-papel">Cessionário(a)</p>
                    {cessionarioCpf && (
                      <p style={{ fontSize: '8.5pt', color: '#555' }}>CPF/CNPJ: {cessionarioCpf}</p>
                    )}
                  </div>
                </div>

                {/* Operation metadata (small) */}
                <p style={{ fontSize: '8pt', color: '#888', marginTop: '16pt', textAlign: 'center' }}>
                  Operação ID: {tr.id} &bull; Data: {fDate(tr.data_operacao)}
                  {tr.preco_unitario != null && ` — Preço unitário: ${tr.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                </p>

                {/* Footer */}
                <div className="doc-footer">
                  Este livro foi gerado pela plataforma Gestão Societária em {printTime} de {printDate} &bull; ID: {printId}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
