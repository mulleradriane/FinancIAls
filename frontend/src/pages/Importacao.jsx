import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertCircle, ArrowLeft,
  FileText, Loader2, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Info, Download, Landmark,
  CreditCard, FileCode, FileSearch, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import api from '@/api/api';
import PrivateValue from '@/components/ui/PrivateValue';
import { parseLocalDate, cn } from '@/lib/utils';

// ── Formato / banco configs ────────────────────────────────────────────────────

const FORMATS = [
  {
    id: 'conta',
    label: 'Extrato Genérico',
    subtitle: 'Template Ronromia',
    icon: Landmark,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    accept: '.csv',
    banks: ['Qualquer banco'],
    howto: [
      'Baixe o template CSV clicando no botão abaixo',
      'Preencha com suas transações (data, título, entrada, saída, categoria)',
      'Faça o upload do arquivo preenchido',
    ],
    template: true,
  },
  {
    id: 'cartao',
    label: 'C6 Bank',
    subtitle: 'Fatura CSV',
    icon: CreditCard,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500',
    accept: '.csv',
    banks: ['C6 Bank'],
    howto: [
      'Abra o app do C6 Bank',
      'Acesse Fatura → Exportar extrato',
      'Escolha o período e baixe o CSV',
      'Faça o upload aqui',
    ],
  },
  {
    id: 'ofx',
    label: 'OFX / QFX',
    subtitle: 'Padrão bancário',
    icon: FileCode,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    accept: '.ofx,.qfx',
    banks: ['Itaú', 'Bradesco', 'Santander', 'BB', 'Caixa', 'Inter', 'Nubank'],
    howto: [
      'Acesse o Internet Banking do seu banco',
      'Vá em Extrato → Exportar / Baixar extrato',
      'Escolha o formato OFX ou QFX',
      'Faça o upload do arquivo aqui',
    ],
  },
  {
    id: 'pdf',
    label: 'PDF Genérico',
    subtitle: 'Qualquer extrato em PDF',
    icon: FileSearch,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    accept: '.pdf',
    banks: ['Nubank', 'Inter', 'C6', 'Outros'],
    howto: [
      'Baixe o PDF do extrato diretamente no app ou Internet Banking do seu banco',
      'Faça o upload aqui — o sistema tentará detectar automaticamente as transações',
      'Revise cuidadosamente, pois PDFs podem ter variações de formato',
    ],
    beta: true,
  },
];

// ── Stepper ────────────────────────────────────────────────────────────────────

const STEPS = ['Configurar', 'Revisar', 'Concluído'];

function Stepper({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn('text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mb-5 transition-colors', done ? 'bg-emerald-500' : 'bg-border')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Row status badge ───────────────────────────────────────────────────────────

function StatusBadge({ row }) {
  if (row.is_duplicate) return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 gap-1">
      <AlertTriangle className="w-3 h-3" /> Duplicata
    </Badge>
  );
  if (row.is_recurring_match) return (
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 gap-1" title={`Parece ser "${row.recurring_description}" (${Math.round((row.recurring_similarity || 0) * 100)}% similar)`}>
      <RefreshCw className="w-3 h-3" /> Recorrente?
    </Badge>
  );
  if (row.is_installment) return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 gap-1">
      Parcela {row.installment_info}
    </Badge>
  );
  if (row.is_transfer) return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1">
      Pagamento
    </Badge>
  );
  return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1">
    <CheckCircle className="w-3 h-3" /> Nova
  </Badge>;
}

// ── Row color ──────────────────────────────────────────────────────────────────

function amountColor(row) {
  if (row.nature === 'INCOME') return 'text-emerald-600 dark:text-emerald-400';
  if (row.nature === 'EXPENSE') return 'text-red-600 dark:text-red-400';
  return 'text-blue-600 dark:text-blue-400';
}

function fmtCurrency(val) {
  const abs = Math.abs(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return val < 0 ? `- ${abs}` : val > 0 ? `+ ${abs}` : abs;
}

// ── Transaction table ──────────────────────────────────────────────────────────

function TransactionTable({ rows, selectedRows, onToggle, onToggleAll, label, colorClass }) {
  const allSelected = rows.every(r => selectedRows.includes(r.row_index));

  return (
    <div className={cn('rounded-2xl border overflow-hidden', colorClass)}>
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => onToggleAll(rows.map(r => r.row_index), !allSelected)}
          />
          <span className="font-semibold text-sm">{label}</span>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {rows.filter(r => selectedRows.includes(r.row_index)).length} selecionadas
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-muted-foreground">
              <th className="px-4 py-2 w-8" />
              <th className="px-4 py-2 text-left font-medium whitespace-nowrap">Data</th>
              <th className="px-4 py-2 text-left font-medium">Descrição</th>
              <th className="px-4 py-2 text-right font-medium whitespace-nowrap">Valor</th>
              <th className="px-4 py-2 text-left font-medium">Categoria</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(row => (
              <tr
                key={row.row_index}
                className={cn(
                  'transition-colors hover:bg-muted/20 cursor-pointer',
                  !selectedRows.includes(row.row_index) && 'opacity-40',
                )}
                onClick={() => onToggle(row.row_index)}
              >
                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedRows.includes(row.row_index)}
                    onCheckedChange={() => onToggle(row.row_index)}
                  />
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                  {parseLocalDate(row.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-2.5 max-w-[220px]">
                  <span className="block truncate" title={row.description}>{row.description}</span>
                  {row.is_recurring_match && (
                    <span className="text-xs text-orange-500 dark:text-orange-400">
                      → já existe como recorrente: "{row.recurring_description}"
                    </span>
                  )}
                </td>
                <td className={cn('px-4 py-2.5 text-right font-medium whitespace-nowrap tabular-nums', amountColor(row))}>
                  <PrivateValue value={fmtCurrency(row.amount)} />
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-xs">{row.categoria}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const STEP_CONFIG = 0;
const STEP_PREVIEW = 1;
const STEP_SUCCESS = 2;

export default function Importacao() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(STEP_CONFIG);
  const [format, setFormat] = useState(null);       // FORMATS item
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [importedCount, setImportedCount] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    api.get('/accounts/').then(r => setAccounts(r.data)).catch(() => toast.error('Erro ao carregar contas'));
  }, []);

  const filteredAccounts = accounts.filter(acc =>
    format?.id === 'cartao' ? acc.type === 'cartao_credito' : acc.type !== 'cartao_credito'
  );

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFileSelect(selectedFile) {
    if (!format) { toast.error('Selecione um formato primeiro'); return; }
    const accepted = format.accept.split(',').map(s => s.trim());
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!accepted.includes(ext)) {
      toast.error(`Formato inválido. Esperado: ${format.accept}`);
      return;
    }
    setFile(selectedFile);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }

  // ── Template download ──────────────────────────────────────────────────────

  function handleDownloadTemplate() {
    const content = 'data,titulo,entrada,saida,categoria,descricao\n01/02/2026,Salário,5000.00,,Salário,Depósito mensal\n05/02/2026,Mercado,,150.50,Alimentação,Compras da semana';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_ronromia.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Analyze ────────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!file || !selectedAccountId || !format) return;
    setIsAnalyzing(true);
    const form = new FormData();
    form.append('file', file);
    form.append('account_id', selectedAccountId);
    form.append('file_type', format.id);
    try {
      const { data } = await api.post('/transactions/import-csv/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(data);
      // Default: select new + recurring matches (not exact duplicates)
      setSelectedRows(data.to_import.map(r => r.row_index));
      setStep(STEP_PREVIEW);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao analisar arquivo');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ── Confirm import ─────────────────────────────────────────────────────────

  async function handleConfirmImport() {
    if (!selectedRows.length) return;
    setIsImporting(true);
    const allRows = [...(previewData.to_import || []), ...(previewData.duplicates || [])];
    const rows = allRows
      .filter(r => selectedRows.includes(r.row_index))
      .map(r => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        nature: r.nature,
        category_name: r.categoria,
      }));
    try {
      const { data } = await api.post('/transactions/import-csv/confirm', {
        account_id: selectedAccountId,
        rows,
      });
      setImportedCount(data.imported);
      setStep(STEP_SUCCESS);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao confirmar importação');
    } finally {
      setIsImporting(false);
    }
  }

  // ── Toggle helpers ─────────────────────────────────────────────────────────

  function toggleRow(idx) {
    setSelectedRows(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }

  function toggleAll(idxs, select) {
    setSelectedRows(prev =>
      select ? [...new Set([...prev, ...idxs])] : prev.filter(i => !idxs.includes(i))
    );
  }

  // ── Stats for preview ──────────────────────────────────────────────────────

  const totalRows = [...(previewData?.to_import || []), ...(previewData?.duplicates || [])];
  const recurringRows = (previewData?.to_import || []).filter(r => r.is_recurring_match);
  const newRows = (previewData?.to_import || []).filter(r => !r.is_recurring_match);
  const selectedCount = selectedRows.length;

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    setStep(STEP_CONFIG);
    setFile(null);
    setPreviewData(null);
    setSelectedRows([]);
    setShowErrors(false);
  }

  // ── RENDER: Success ────────────────────────────────────────────────────────

  if (step === STEP_SUCCESS) {
    const accName = accounts.find(a => a.id === selectedAccountId)?.name || 'conta';
    return (
      <div className="max-w-lg mx-auto py-16 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        <Stepper current={2} />
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Importação concluída!</h2>
        <p className="text-muted-foreground mb-8">
          <strong>{importedCount}</strong> transações importadas para <strong>{accName}</strong>.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/transactions')}>Ver Transações</Button>
          <Button onClick={reset}>Importar outro arquivo</Button>
        </div>
      </div>
    );
  }

  // ── RENDER: Preview ────────────────────────────────────────────────────────

  if (step === STEP_PREVIEW && previewData) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-28 animate-in fade-in duration-400">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revisar Transações</h1>
            <p className="text-muted-foreground text-sm">
              Selecione quais transações importar. Duplicatas e recorrentes estão destacadas.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setStep(STEP_CONFIG)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>

        <Stepper current={1} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Novas', value: newRows.length, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Recorrentes', value: recurringRows.length, color: 'text-orange-600 dark:text-orange-400' },
            { label: 'Duplicatas', value: previewData.duplicates.length, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Erros', value: previewData.errors.length, color: 'text-red-600 dark:text-red-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recurring warning banner */}
        {recurringRows.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-4 py-3 text-orange-700 dark:text-orange-400">
            <RefreshCw className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>{recurringRows.length} transação(ões)</strong> parecem corresponder a despesas recorrentes já cadastradas.
              Elas estão <strong>selecionadas</strong> — desmarque-as se já tiverem sido geradas automaticamente.
            </div>
          </div>
        )}

        {/* New transactions */}
        {newRows.length > 0 && (
          <TransactionTable
            rows={newRows}
            selectedRows={selectedRows}
            onToggle={toggleRow}
            onToggleAll={toggleAll}
            label="Transações novas"
            colorClass="border-emerald-200 dark:border-emerald-900/50"
          />
        )}

        {/* Recurring matches */}
        {recurringRows.length > 0 && (
          <TransactionTable
            rows={recurringRows}
            selectedRows={selectedRows}
            onToggle={toggleRow}
            onToggleAll={toggleAll}
            label="Possíveis recorrentes"
            colorClass="border-orange-200 dark:border-orange-900/50"
          />
        )}

        {/* Duplicates */}
        {previewData.duplicates.length > 0 && (
          <TransactionTable
            rows={previewData.duplicates}
            selectedRows={selectedRows}
            onToggle={toggleRow}
            onToggleAll={toggleAll}
            label="Duplicatas detectadas (já existem no sistema)"
            colorClass="border-amber-200 dark:border-amber-900/50"
          />
        )}

        {/* Errors */}
        {previewData.errors.length > 0 && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 overflow-hidden">
            <button
              className="flex items-center gap-2 w-full px-4 py-3 bg-red-50/50 dark:bg-red-950/10 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100/50 transition-colors"
              onClick={() => setShowErrors(v => !v)}
            >
              <AlertCircle className="w-4 h-4" />
              {previewData.errors.length} linha(s) com erro (não serão importadas)
              {showErrors ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>
            {showErrors && (
              <ul className="px-4 py-3 space-y-1">
                {previewData.errors.map((err, i) => (
                  <li key={i} className="text-sm text-red-700 dark:text-red-400 flex gap-2">
                    <span className="font-semibold shrink-0">Linha {err.row_index}:</span>
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Fixed bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t z-50 lg:left-[260px]">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">
                {selectedCount} de {totalRows.length} selecionadas para importar
              </span>
              {recurringRows.filter(r => selectedRows.includes(r.row_index)).length > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  {recurringRows.filter(r => selectedRows.includes(r.row_index)).length} recorrentes incluídas
                </Badge>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => setStep(STEP_CONFIG)}>Voltar</Button>
              <Button
                disabled={selectedCount === 0 || isImporting}
                onClick={handleConfirmImport}
                className="min-w-[160px]"
              >
                {isImporting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...</>
                  : `Importar ${selectedCount} transaç${selectedCount === 1 ? 'ão' : 'ões'}`
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Config ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Extrato</h1>
        <p className="text-muted-foreground text-sm">Importe transações do seu banco em segundos.</p>
      </div>

      <Stepper current={0} />

      {/* Format selector */}
      <div>
        <p className="text-sm font-medium mb-3">1. Escolha o formato do seu extrato</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FORMATS.map(fmt => {
            const Icon = fmt.icon;
            const selected = format?.id === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => { setFormat(fmt); setFile(null); setSelectedAccountId(''); }}
                className={cn(
                  'relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md',
                  selected ? `${fmt.border} bg-muted/30 shadow-sm` : 'border-border hover:border-muted-foreground/40',
                )}
              >
                {fmt.beta && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold bg-orange-500/20 text-orange-600 rounded-full px-1.5 py-0.5">BETA</span>
                )}
                <div className={cn('p-2 rounded-xl', fmt.bg)}>
                  <Icon className={cn('w-5 h-5', fmt.color)} />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{fmt.label}</p>
                  <p className="text-xs text-muted-foreground">{fmt.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fmt.banks.slice(0, 3).map(b => (
                    <span key={b} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{b}</span>
                  ))}
                  {fmt.banks.length > 3 && (
                    <span className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">+{fmt.banks.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {format && (
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Instructions */}
          <div className="rounded-2xl border bg-muted/20 p-5 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Como exportar: {format.label}
            </p>
            <ol className="space-y-2">
              {format.howto.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            {format.template && (
              <Button variant="outline" size="sm" className="gap-2 mt-2" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4" /> Baixar Template CSV
              </Button>
            )}
          </div>

          {/* Account + Upload */}
          <div className="space-y-4">
            {/* Account selector */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">2. Selecione a conta destino</p>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Escolha a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredAccounts.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Nenhuma conta {format.id === 'cartao' ? 'de cartão de crédito' : 'corrente/poupança'} cadastrada.
                </p>
              )}
            </div>

            {/* File drop zone */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">3. Faça o upload do arquivo</p>
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
                  isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20',
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={format.accept}
                  onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); }}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                    >
                      <X className="w-3 h-3" /> Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-muted/50 rounded-full">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm">Arraste o arquivo ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground">Aceito: {format.accept}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Analyze button */}
            <Button
              className="w-full h-12 text-base gap-2 rounded-xl"
              disabled={!file || !selectedAccountId || isAnalyzing}
              onClick={handleAnalyze}
            >
              {isAnalyzing
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Analisando arquivo...</>
                : <><FileSearch className="w-5 h-5" /> Analisar e Continuar</>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
