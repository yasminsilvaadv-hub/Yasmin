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
}

interface CapTableRow {
  ativo_id: string
  codigo: string
  especie: string | null
  nome_classe: string | null
  tipo: string
  titular_id: string | null
  nome_titular: string | null
  cpf_cnpj_titular: string | null
  quantidade: number
}

interface Operacao {
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
  // origem
  origem_id: string | null
  origem_nome: string | null
  origem_doc: string | null
  origem_tipo: string | null
  // destino
  destino_id: string | null
  destino_nome: string | null
  destino_doc: string | null
  destino_tipo: string | null
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

function fPct(n: number, total: number): string {
  if (total === 0) return '0,00%'
  return ((n / total) * 100).toFixed(2).replace('.', ',') + '%'
}

function fDate(iso: string): string {
  try {
    return format(new Date(iso.includes('T') ? iso : iso + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}

function fDateTime(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
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

function fCurrency(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function tipoLabel(tipo: string, metadata?: Record<string, unknown> | null): string {
  const original = metadata?.tipo_original as string | undefined
  const map: Record<string, string> = {
    emissao: 'Emissão',
    subscricao: 'Subscrição',
    transferencia: 'Transferência',
    cancelamento: 'Cancelamento',
    conversao: 'Conversão',
    onus_constituicao: 'Ônus — Constituição',
    onus_extincao: 'Ônus — Extinção',
    bonificacao: 'Bonificação',
    desdobramento: 'Desdobramento',
    grupamento: 'Grupamento',
  }
  if (original && map[original]) return map[original]
  return map[tipo] ?? tipo
}

function acoesLabel(codigo: string, especie: string | null, nomeClasse: string | null): string {
  const especieMap: Record<string, string> = {
    ordinaria: 'ON',
    preferencial: 'PN',
  }
  const sigla = especie ? (especieMap[especie] ?? especie.toUpperCase()) : ''
  if (nomeClasse) return `${sigla} Classe ${nomeClasse}`
  return sigla || codigo
}

function acoesDescricao(codigo: string, especie: string | null, nomeClasse: string | null): string {
  const especieMap: Record<string, string> = {
    ordinaria: 'ordinária',
    preferencial: 'preferencial',
  }
  const tipo = especie ? (especieMap[especie] ?? especie) : ''
  if (nomeClasse) return `${tipo} classe ${nomeClasse}`
  return tipo || codigo
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function LivroRegistroPage({ params }: Props) {
  const { orgSlug } = await params
  const sb = getServiceClient()

  // 1. Organização
  const { data: orgRaw } = await sb
    .from('organizacoes')
    .select('id, nome, cnpj')
    .eq('slug', orgSlug)
    .single()

  if (!orgRaw) notFound()

  const org: Organizacao = orgRaw

  // 2. Livro de registro de ações nominativas
  const { data: livroRaw } = await sb
    .from('livros_societarios')
    .select('numero_ordem, periodo_inicio, periodo_fim')
    .eq('organizacao_id', org.id)
    .ilike('natureza', '%Registro de Ações Nominativas%')
    .order('numero_ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const livro: Livro = livroRaw ?? { numero_ordem: 1, periodo_inicio: null, periodo_fim: null }

  // 3. Cap table (current holdings)
  const { data: capData } = await sb.rpc('calcular_cap_table', {
    p_org_id: org.id,
    p_data_ref: new Date().toISOString().split('T')[0],
    p_incluir_tesouraria: false,
    p_incluir_usufruto: false,
  })

  // Join cpf_cnpj_titular — calcular_cap_table may not return it; fetch from pessoas
  const capRows: CapTableRow[] = (capData ?? []) as CapTableRow[]

  // Enrich with cpf_cnpj_titular
  const titularIds = Array.from(new Set(capRows.map((r) => r.titular_id).filter(Boolean))) as string[]
  const pessoasMap = new Map<string, { cpf_cnpj: string | null }>()
  if (titularIds.length > 0) {
    const { data: pessoasRaw } = await sb
      .from('pessoas')
      .select('id, cpf_cnpj')
      .in('id', titularIds)
    for (const p of pessoasRaw ?? []) {
      pessoasMap.set(p.id, { cpf_cnpj: p.cpf_cnpj })
    }
  }

  // 4. Operações
  const { data: opsRaw } = await sb
    .from('operacoes_ativos')
    .select(`
      id, data_operacao, tipo_operacao, quantidade, preco_unitario, motivo, metadata,
      ativos!inner ( codigo, especie, nome_classe ),
      origem:pessoas!operacoes_ativos_origem_id_fkey ( id, nome_completo, cpf_cnpj, tipo ),
      destino:pessoas!operacoes_ativos_destino_id_fkey ( id, nome_completo, cpf_cnpj, tipo )
    `)
    .eq('organizacao_id', org.id)
    .order('data_operacao', { ascending: true })

  const operacoes: Operacao[] = (opsRaw ?? []).map((o: Record<string, unknown>) => {
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
      destino_id: destino?.id as string ?? null,
      destino_nome: destino?.nome_completo as string ?? null,
      destino_doc: destino?.cpf_cnpj as string ?? null,
      destino_tipo: destino?.tipo as string ?? null,
    }
  })

  // 5. Compute ônus per person per ativo
  const onusMap = new Map<string, number>() // key: `${pessoa_id}:${codigo}`
  for (const op of operacoes) {
    if (op.tipo_operacao === 'onus_constituicao') {
      const key = `${op.origem_id}:${op.ativo_codigo}`
      onusMap.set(key, (onusMap.get(key) ?? 0) + op.quantidade)
    } else if (op.tipo_operacao === 'onus_extincao') {
      const key = `${op.origem_id}:${op.ativo_codigo}`
      onusMap.set(key, Math.max(0, (onusMap.get(key) ?? 0) - op.quantidade))
    }
  }

  // 6. Build per-shareholder data from cap table
  // Group cap table by titular
  interface ShareholderHolding {
    titular_id: string | null
    nome: string
    cpf_cnpj: string | null
    holdings: Array<{
      ativo_codigo: string
      ativo_especie: string | null
      ativo_nome_classe: string | null
      quantidade: number
    }>
    total: number
    oneradas: number
    livres: number
    operacoes: Operacao[]
  }

  const shareholderMap = new Map<string, ShareholderHolding>()
  for (const row of capRows) {
    if (!row.titular_id) continue
    const key = row.titular_id
    if (!shareholderMap.has(key)) {
      const cpf = pessoasMap.get(row.titular_id)?.cpf_cnpj ?? null
      shareholderMap.set(key, {
        titular_id: row.titular_id,
        nome: row.nome_titular ?? 'Desconhecido',
        cpf_cnpj: cpf,
        holdings: [],
        total: 0,
        oneradas: 0,
        livres: 0,
        operacoes: [],
      })
    }
    const sh = shareholderMap.get(key)!
    sh.holdings.push({
      ativo_codigo: row.codigo,
      ativo_especie: row.especie,
      ativo_nome_classe: row.nome_classe,
      quantidade: row.quantidade,
    })
    sh.total += row.quantidade
    const onusKey = `${row.titular_id}:${row.codigo}`
    sh.oneradas += onusMap.get(onusKey) ?? 0
  }

  // Assign livres
  shareholderMap.forEach((sh) => {
    sh.livres = sh.total - sh.oneradas
    // Filter operations relevant to this shareholder (as origem or destino)
    sh.operacoes = operacoes.filter(
      (op) => op.origem_id === sh.titular_id || op.destino_id === sh.titular_id
    )
  })

  const shareholders: ShareholderHolding[] = []
  shareholderMap.forEach((sh) => shareholders.push(sh))
  shareholders.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  // 7. Totals for the cover page
  const totalAcoes = shareholders.reduce((s, sh) => s + sh.total, 0)
  const totalOneradas = shareholders.reduce((s, sh) => s + sh.oneradas, 0)
  const totalLivres = totalAcoes - totalOneradas

  // Per-class totals (for display on cover)
  const classMap = new Map<string, { especie: string | null; nome_classe: string | null; total: number }>()
  for (const row of capRows) {
    if (!row.titular_id) continue
    const key = row.codigo
    if (!classMap.has(key)) {
      classMap.set(key, { especie: row.especie, nome_classe: row.nome_classe, total: 0 })
    }
    classMap.get(key)!.total += row.quantidade
  }

  const classes = Array.from(classMap.entries()).map(([codigo, v]) => ({ codigo, ...v }))

  // 8. Cover page: total summary line
  const classSummary = classes
    .map((c) => `${fNum(c.total)} ${acoesLabel(c.codigo, c.especie, c.nome_classe)}`)
    .join(', ')

  // One ordinárias group for oneradas
  const onusSummary = totalOneradas > 0
    ? `${fNum(totalOneradas)} ordinárias`
    : '—'

  // Compute running totals per shareholder per operation
  function getRunningTotals(sh: ShareholderHolding) {
    let runTotal = 0
    let runOneradas = 0
    return sh.operacoes.map((op) => {
      let delta = 0
      if (op.destino_id === sh.titular_id) {
        delta = op.quantidade
      } else if (op.origem_id === sh.titular_id) {
        // Transfers out, cancellations, ônus constitutions (moves ônus not qty)
        if (op.tipo_operacao === 'onus_constituicao') {
          // ônus: qty doesn't change, only oneradas
        } else if (op.tipo_operacao === 'onus_extincao') {
          // no qty change
        } else {
          delta = -op.quantidade
        }
      }

      let deltaOnus = 0
      if (op.tipo_operacao === 'onus_constituicao' && op.origem_id === sh.titular_id) {
        deltaOnus = op.quantidade
      } else if (op.tipo_operacao === 'onus_extincao' && op.origem_id === sh.titular_id) {
        deltaOnus = -op.quantidade
      }

      runTotal += delta
      runOneradas = Math.max(0, runOneradas + deltaOnus)
      const runLivres = Math.max(0, runTotal - runOneradas)

      return {
        op,
        delta,
        deltaOnus,
        runTotal,
        runOneradas,
        runLivres,
        sign: delta >= 0 ? '+' : '',
      }
    })
  }

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
          font-size: 10pt;
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
          margin-top: 52px; /* space for toolbar on screen */
        }

        @media print {
          .print-document { margin-top: 0; }
          html, body { margin: 0; padding: 0; }
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 18mm 18mm 22mm 18mm;
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

        /* ── Header ──────────────────────────────────────────── */
        .doc-header {
          text-align: center;
          margin-bottom: 14pt;
          border-bottom: 2px solid #000;
          padding-bottom: 8pt;
        }
        .doc-header h1 {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }
        .doc-header h2 {
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 3pt;
        }
        .doc-header p {
          font-size: 9.5pt;
          margin-top: 3pt;
        }

        /* ── Section titles ───────────────────────────────────── */
        .section-title {
          font-size: 10pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.3pt;
          border-bottom: 1px solid #000;
          padding-bottom: 3pt;
          margin-bottom: 8pt;
          margin-top: 12pt;
        }

        /* ── Info grid ───────────────────────────────────────── */
        .info-row {
          display: flex;
          gap: 0;
          margin-bottom: 4pt;
          font-size: 10pt;
        }
        .info-label {
          font-weight: bold;
          white-space: nowrap;
          min-width: 120pt;
        }
        .info-value { flex: 1; }

        /* ── Tables ──────────────────────────────────────────── */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
          margin-top: 8pt;
        }
        th {
          background: #e8e8e8;
          border: 1px solid #555;
          padding: 4pt 5pt;
          text-align: left;
          font-size: 8pt;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.3;
        }
        td {
          border: 1px solid #888;
          padding: 3pt 5pt;
          vertical-align: top;
          line-height: 1.4;
        }
        tr:nth-child(even) td { background: #fafafa; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .nowrap { white-space: nowrap; }

        /* ── Totals row ───────────────────────────────────────── */
        .total-row td {
          background: #e8e8e8 !important;
          font-weight: bold;
          border-top: 2px solid #333;
        }

        /* ── Footer ──────────────────────────────────────────── */
        .doc-footer {
          margin-top: auto;
          padding-top: 10pt;
          border-top: 1px solid #aaa;
          font-size: 7.5pt;
          color: #555;
          text-align: center;
          position: absolute;
          bottom: 18mm;
          left: 18mm;
          right: 18mm;
        }

        /* ── Summary stats on cover ───────────────────────────── */
        .stats-block {
          background: #f5f5f5;
          border: 1px solid #ccc;
          padding: 8pt 10pt;
          margin-bottom: 8pt;
          font-size: 9.5pt;
        }
        .stats-block strong { font-weight: bold; }

        /* ── Positive/negative delta ─────────────────────────── */
        .delta-pos { color: #166534; font-weight: bold; }
        .delta-neg { color: #991b1b; font-weight: bold; }

        /* ── Page number ──────────────────────────────────────── */
        .page-num {
          text-align: right;
          font-size: 8pt;
          color: #666;
          margin-bottom: 4pt;
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="screen-toolbar">
        <span style={{ fontWeight: 700 }}>Livro de Registro de Ações Nominativas</span>
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
            // Short delay so page renders fully
            setTimeout(function() { window.print(); }, 600);
          }`,
        }}
      />

      <div className="print-document">
        {/* ════════════════════════════════════════════════════════
            PAGE 1: CAPA / QUADRO CONSOLIDADO
            ════════════════════════════════════════════════════════ */}
        <div className="page">
          <div className="page-num">1/{shareholders.length + 1}</div>

          {/* Header */}
          <div className="doc-header">
            <h1>{org.nome}</h1>
            {org.cnpj && <p>CNPJ: {org.cnpj}</p>}
            <h2>Livro de Registro de Ações Nominativas</h2>
            <p>
              Nº de ordem: {livro.numero_ordem}
              {(livro.periodo_inicio || livro.periodo_fim) && (
                <> &nbsp;&bull;&nbsp; Período de escrituração:{' '}
                  {livro.periodo_inicio ? fDate(livro.periodo_inicio) : '…'} –{' '}
                  {livro.periodo_fim ? fDate(livro.periodo_fim) : '…'}
                </>
              )}
            </p>
          </div>

          {/* Summary stats */}
          <div className="section-title">Quadro de ações consolidado</div>

          <div className="stats-block">
            <p>
              <strong>Total de ações:</strong>{' '}
              {fNum(totalAcoes)}
              {classSummary && ` (${classSummary})`}
            </p>
            <p>
              <strong>Total de ações oneradas:</strong>{' '}
              {fNum(totalOneradas)}
              {totalOneradas > 0 && ` (${onusSummary})`}
            </p>
            <p>
              <strong>Total de ações livres:</strong>{' '}
              {fNum(totalLivres)}
            </p>
          </div>

          {/* Consolidated table */}
          <table>
            <thead>
              <tr>
                <th>Acionista</th>
                <th>Anotações</th>
                {classes.map((c) => (
                  <th key={c.codigo} className="text-right nowrap">
                    {acoesLabel(c.codigo, c.especie, c.nome_classe)}
                  </th>
                ))}
                <th className="text-right nowrap">Total de ações</th>
                <th className="text-right nowrap">% Capital social</th>
                <th className="text-right nowrap">Ações oneradas</th>
                <th className="text-right nowrap">Ações livres</th>
              </tr>
            </thead>
            <tbody>
              {shareholders.map((sh) => (
                <tr key={sh.titular_id}>
                  <td>
                    <strong>{sh.nome}</strong>
                    {sh.cpf_cnpj && (
                      <>
                        <br />
                        <span style={{ fontSize: '7.5pt', color: '#555' }}>
                          {sh.cpf_cnpj}
                        </span>
                      </>
                    )}
                  </td>
                  <td>—</td>
                  {classes.map((c) => {
                    const h = sh.holdings.find((hh) => hh.ativo_codigo === c.codigo)
                    return (
                      <td key={c.codigo} className="text-right">
                        {h ? `${fNum(h.quantidade)} ${acoesLabel(c.codigo, c.especie, c.nome_classe)}` : '—'}
                      </td>
                    )
                  })}
                  <td className="text-right font-bold">{fNum(sh.total)}</td>
                  <td className="text-right">{fPct(sh.total, totalAcoes)}</td>
                  <td className="text-right">{sh.oneradas > 0 ? fNum(sh.oneradas) : '—'}</td>
                  <td className="text-right">{fNum(sh.livres)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="total-row">
                <td colSpan={2} className="font-bold">Total</td>
                {classes.map((c) => {
                  const tot = c.total
                  return (
                    <td key={c.codigo} className="text-right font-bold">
                      {fNum(tot)}
                    </td>
                  )
                })}
                <td className="text-right font-bold">{fNum(totalAcoes)}</td>
                <td className="text-right font-bold">100,00%</td>
                <td className="text-right font-bold">{fNum(totalOneradas)}</td>
                <td className="text-right font-bold">{fNum(totalLivres)}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div className="doc-footer">
            Este livro foi gerado pela plataforma Gestão Societária em {printTime} de {printDate} &bull; ID: {printId}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            PAGES 2..N: ONE PAGE PER SHAREHOLDER
            ════════════════════════════════════════════════════════ */}
        {shareholders.map((sh, idx) => {
          const runningRows = getRunningTotals(sh)

          const holdingsSummary = sh.holdings
            .map((h) => `${fNum(h.quantidade)} ${acoesDescricao(h.ativo_codigo, h.ativo_especie, h.ativo_nome_classe)}`)
            .join(' / ')

          return (
            <div key={sh.titular_id} className="page">
              <div className="page-num">{idx + 2}/{shareholders.length + 1}</div>

              {/* Header */}
              <div className="doc-header">
                <h1>{org.nome}</h1>
                {org.cnpj && <p>CNPJ: {org.cnpj}</p>}
                <h2>Livro de Registro de Ações Nominativas</h2>
                <p>
                  Nº de ordem: {livro.numero_ordem}
                  {(livro.periodo_inicio || livro.periodo_fim) && (
                    <> &nbsp;&bull;&nbsp; Período:{' '}
                      {livro.periodo_inicio ? fDate(livro.periodo_inicio) : '…'} –{' '}
                      {livro.periodo_fim ? fDate(livro.periodo_fim) : '…'}
                    </>
                  )}
                </p>
              </div>

              {/* Shareholder info */}
              <div className="section-title">Identificação do acionista</div>

              <div className="info-row">
                <span className="info-label">Nome/Razão Social:</span>
                <span className="info-value">{sh.nome}</span>
              </div>
              <div className="info-row">
                <span className="info-label">CPF/CNPJ:</span>
                <span className="info-value">{sh.cpf_cnpj ?? '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Endereço:</span>
                <span className="info-value">—</span>
              </div>
              <div className="info-row">
                <span className="info-label">Anotações:</span>
                <span className="info-value">—</span>
              </div>

              <div style={{ marginTop: '10pt', marginBottom: '6pt', fontSize: '9.5pt' }}>
                <strong>Total de ações:</strong> {fNum(sh.total)}{holdingsSummary ? ` (${holdingsSummary})` : ''}
                &nbsp;&bull;&nbsp;
                <strong>Ações oneradas:</strong> {sh.oneradas > 0 ? fNum(sh.oneradas) : '—'}
                &nbsp;&bull;&nbsp;
                <strong>Ações livres:</strong> {fNum(sh.livres)}
              </div>

              {/* Operations table */}
              <div className="section-title">Histórico de operações</div>

              {runningRows.length === 0 ? (
                <p style={{ fontSize: '9pt', color: '#666', fontStyle: 'italic' }}>
                  Nenhuma operação registrada para este acionista.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th className="nowrap">Data e hora</th>
                      <th>ID operação</th>
                      <th>Operação</th>
                      <th>Ação</th>
                      <th className="text-right">Quantidade</th>
                      <th>Contraparte</th>
                      <th className="text-right">Valor</th>
                      <th className="text-right">Capital realizado</th>
                      <th>Anotações</th>
                      <th className="text-right nowrap">Total após op.</th>
                      <th className="text-right">Livres</th>
                      <th className="text-right">Oneradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningRows.map(({ op, delta, runTotal, runLivres, runOneradas }) => {
                      const isPos = delta > 0
                      const isNeg = delta < 0
                      const contraparte =
                        op.destino_id === sh.titular_id
                          ? op.origem_nome
                          : op.destino_nome

                      return (
                        <tr key={op.id}>
                          <td className="nowrap">{fDateTime(op.data_operacao)}</td>
                          <td style={{ fontSize: '7pt', color: '#666' }}>
                            {op.id.slice(0, 8)}…
                          </td>
                          <td>{tipoLabel(op.tipo_operacao, op.metadata)}</td>
                          <td className="nowrap">
                            {acoesLabel(op.ativo_codigo, op.ativo_especie, op.ativo_nome_classe)}
                          </td>
                          <td
                            className={`text-right font-bold nowrap ${
                              isPos ? 'delta-pos' : isNeg ? 'delta-neg' : ''
                            }`}
                          >
                            {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${fNum(delta)}`}
                          </td>
                          <td>{contraparte ?? '—'}</td>
                          <td className="text-right">
                            {op.preco_unitario != null && delta !== 0
                              ? fCurrency(Math.abs(delta) * op.preco_unitario)
                              : '—'}
                          </td>
                          <td className="text-right">
                            {op.preco_unitario != null && isPos
                              ? fCurrency(delta * op.preco_unitario)
                              : '—'}
                          </td>
                          <td style={{ fontSize: '7.5pt', color: '#555' }}>
                            {op.motivo ?? '—'}
                          </td>
                          <td className="text-right font-bold">{fNum(runTotal)}</td>
                          <td className="text-right">{fNum(runLivres)}</td>
                          <td className="text-right">{fNum(runOneradas)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {/* Footer */}
              <div className="doc-footer">
                Este livro foi gerado pela plataforma Gestão Societária em {printTime} de {printDate} &bull; ID: {printId}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
