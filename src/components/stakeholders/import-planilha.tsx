'use client'

import * as React from 'react'
import { UploadIcon, FileSpreadsheetIcon, CheckCircle2Icon, AlertCircleIcon, XIcon, DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { importarPessoas, type PessoaImportRow } from '@/app/actions/stakeholders'

interface Props {
  orgSlug: string
  onSuccess: () => void
}

// Colunas aceitas (case-insensitive, com variações)
const CAMPO_MAP: Record<string, keyof PessoaImportRow> = {
  'nome': 'nome_completo', 'nome completo': 'nome_completo', 'name': 'nome_completo',
  'cpf': 'cpf_cnpj', 'cnpj': 'cpf_cnpj', 'cpf/cnpj': 'cpf_cnpj', 'cpf_cnpj': 'cpf_cnpj',
  'tipo': 'tipo', 'type': 'tipo',
  'email': 'email_principal', 'e-mail': 'email_principal', 'email_principal': 'email_principal',
  'telefone': 'telefone_principal', 'phone': 'telefone_principal', 'telefone_principal': 'telefone_principal', 'celular': 'telefone_principal',
  'nacionalidade': 'nacionalidade', 'nationality': 'nacionalidade',
  'profissao': 'profissao', 'profissão': 'profissao', 'occupation': 'profissao',
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(line => {
    const row: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if ((c === ',' || c === ';') && !inQ) { row.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    row.push(cur.trim())
    return row
  })
}

function csvToRows(text: string): PessoaImportRow[] {
  const grid = parseCSV(text)
  if (grid.length < 2) return []

  const headers = grid[0].map(h => h.toLowerCase().replace(/['"]/g, '').trim())
  const fieldMap: (keyof PessoaImportRow | null)[] = headers.map(h => CAMPO_MAP[h] ?? null)

  return grid.slice(1).map(cells => {
    const row: Partial<PessoaImportRow> = {}
    cells.forEach((val, i) => {
      const field = fieldMap[i]
      if (field && val) (row as Record<string, string>)[field] = val
    })
    return row as PessoaImportRow
  }).filter(r => r.nome_completo)
}

export function ImportPlanilha({ orgSlug, onSuccess }: Props) {
  const [open, setOpen] = React.useState(false)
  const [preview, setPreview] = React.useState<PessoaImportRow[]>([])
  const [fileName, setFileName] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [resultado, setResultado] = React.useState<{ importados: number; erros: string[] } | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    setResultado(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = csvToRows(text)
      setPreview(rows)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (!preview.length) return
    setLoading(true)
    const r = await importarPessoas(orgSlug, preview)
    setResultado(r)
    setLoading(false)
    if (r.importados > 0 && r.erros.length === 0) {
      setTimeout(() => { setOpen(false); onSuccess() }, 1500)
    }
  }

  function reset() {
    setPreview([])
    setFileName('')
    setResultado(null)
  }

  function downloadModelo() {
    const csv = [
      'nome_completo,cpf_cnpj,tipo,email,telefone,nacionalidade,profissao',
      'João Silva,123.456.789-00,pessoa_fisica,joao@email.com,(11) 99999-9999,Brasileiro,Engenheiro',
      'Empresa ABC Ltda,12.345.678/0001-99,pessoa_juridica,contato@abc.com,(11) 3333-4444,,',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modelo_stakeholders.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true) }}>
        <UploadIcon />
        Importar planilha
      </Button>

      <Sheet open={open} onOpenChange={v => { if (!v) reset(); setOpen(v) }}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle>Importar stakeholders via planilha</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Baixar modelo */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Modelo CSV</p>
                <p className="text-xs text-muted-foreground mt-0.5">Colunas: nome, cpf_cnpj, tipo, email, telefone…</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadModelo}>
                <DownloadIcon />
                Baixar modelo
              </Button>
            </div>

            {/* Drop zone */}
            {!preview.length && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <FileSpreadsheetIcon className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Arraste o arquivo aqui</p>
                  <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar · CSV ou TSV</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="sr-only"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && !resultado && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{preview.length} registros encontrados</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={reset}><XIcon /></Button>
                </div>
                <div className="rounded-lg border overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {['Nome', 'CPF/CNPJ', 'Tipo', 'E-mail', 'Telefone'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-1.5 font-medium">{r.nome_completo}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.cpf_cnpj ?? '—'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.tipo ?? 'PF'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.email_principal ?? '—'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.telefone_principal ?? '—'}</td>
                        </tr>
                      ))}
                      {preview.length > 10 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
                            + {preview.length - 10} registros não exibidos
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Resultado */}
            {resultado && (
              <div className="space-y-3">
                {resultado.importados > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <CheckCircle2Icon className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-800 font-medium">
                      {resultado.importados} stakeholder{resultado.importados > 1 ? 's' : ''} importado{resultado.importados > 1 ? 's' : ''} com sucesso
                    </p>
                  </div>
                )}
                {resultado.erros.length > 0 && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircleIcon className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-sm font-medium text-destructive">{resultado.erros.length} erro{resultado.erros.length > 1 ? 's' : ''}</p>
                    </div>
                    {resultado.erros.map((e, i) => (
                      <p key={i} className="text-xs text-destructive pl-6">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="border-t px-5 py-3 flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Fechar</Button>
            {preview.length > 0 && !resultado && (
              <Button onClick={handleImport} disabled={loading} className="flex-1">
                {loading ? 'Importando…' : `Importar ${preview.length} registros`}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
