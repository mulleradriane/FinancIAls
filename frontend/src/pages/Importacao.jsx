import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertCircle, ArrowLeft, FileText, Loader2,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Info, Download,
  Landmark, CreditCard, FileCode, FileSearch, X, HelpCircle,
  ChevronRight, Smartphone, Monitor, Globe, CheckCheck,
  Lightbulb, TriangleAlert, ArrowRight
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

// ── Dados detalhados por banco / formato ────────────���───────────────────────────

const BANK_GUIDES = {
  itau: {
    name: 'Itaú', color: 'bg-orange-500', steps: [
      { via: 'App', steps: ['Abra o app Itaú', 'Toque em "Extrato"', 'Selecione a conta e o período desejado', 'Role até o final e toque em "Exportar"', 'Escolha o formato "OFX"', 'Salve o arquivo no seu celular e faça upload aqui'] },
      { via: 'Internet Banking', steps: ['Acesse iBank (itau.com.br)', 'Menu → Extrato e Comprovantes → Extrato', 'Selecione a conta e o período', 'Clique em "Exportar" → "Salvar em OFX"'] },
    ],
  },
  bradesco: {
    name: 'Bradesco', color: 'bg-red-600', steps: [
      { via: 'Internet Banking', steps: ['Acesse Bradesco Net Empresa ou Net Pessoa Física', 'Menu → Consultas → Extrato de conta', 'Defina o período (máx. 90 dias)', 'Clique em "Exportar" → selecione "OFX"'] },
      { via: 'App Next (Bradesco)', steps: ['Abra o app Next', 'Toque em "Extrato"', 'Ajuste o período', 'Ícone de compartilhar → "Exportar OFX"'] },
    ],
  },
  santander: {
    name: 'Santander', color: 'bg-red-500', steps: [
      { via: 'Internet Banking', steps: ['Acesse way.santander.com.br', 'Menu → Conta → Extrato', 'Selecione o período', 'Botão "Exportar" → "OFX / Money"'] },
    ],
  },
  bb: {
    name: 'Banco do Brasil', color: 'bg-yellow-500', steps: [
      { via: 'App BB', steps: ['Abra o app Banco do Brasil', 'Extratos → selecione a conta', 'Período desejado', 'Ícone de exportar → "Salvar em OFX"'] },
      { via: 'Internet Banking', steps: ['Acesse bb.com.br → Auto Atendimento', 'Conta Corrente → Extratos', 'Período e conta', 'Exportar → formato OFX'] },
    ],
  },
  caixa: {
    name: 'Caixa', color: 'bg-blue-700', steps: [
      { via: 'Internet Banking', steps: ['Acesse caixa.gov.br e faça login', 'Menu → Extrato → Conta Corrente/Poupança', 'Defina o período (até 90 dias)', 'Clique em "Exportar" → "OFX"'] },
    ],
  },
  inter: {
    name: 'Banco Inter', color: 'bg-orange-400', steps: [
      { via: 'App Inter', steps: ['Abra o app do Inter', 'Toque em "Extrato"', 'Selecione o período desejado', 'Botão "Exportar" (ícone de seta) → escolha "OFX"', 'Faça upload do arquivo aqui'] },
    ],
  },
  nubank: {
    name: 'Nubank (conta)', color: 'bg-purple-600', steps: [
      { via: 'App Nubank', steps: ['Abra o app do Nubank', 'Toque no ícone do Nu (perfil)', 'Extrato → Filtrar por período', 'Toque nos 3 pontos → "Exportar extrato"', 'Escolha formato "OFX"'] },
    ],
  },
};

const FORMATS = [
  {
    id: 'conta',
    label: 'Extrato Genérico',
    subtitle: 'CSV personalizado',
    icon: Landmark,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    accept: '.csv',
    badge: 'Qualquer banco',
    badgeColor: 'bg-primary/10 text-primary',
    description: 'Use nosso template para inserir transações de qualquer banco — ideal para quem não encontra opção de exportar OFX.',
    tips: [
      'Cada linha é uma transação. Preencha data, descrição, e valor de entrada OU saída.',
      'A coluna "categoria" é opcional — se não preencher, usaremos "Outros".',
      'Datas devem estar no formato DD/MM/AAAA.',
      'Use ponto ou vírgula como separador decimal.',
    ],
    faq: [
      { q: 'Posso importar cartão de crédito por aqui?', a: 'Sim! Basta deixar a coluna "entrada" em branco e preencher "saída" com o valor gasto.' },
      { q: 'E se eu errar uma linha?', a: 'O sistema mostra exatamente qual linha tem erro e qual é o problema. Corrija no Excel/Planilhas e importe novamente.' },
    ],
    template: true,
  },
  {
    id: 'cartao',
    label: 'C6 Bank',
    subtitle: 'Fatura do cartão',
    icon: CreditCard,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500',
    accept: '.csv',
    badge: 'Cartão C6',
    badgeColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    description: 'Exporte diretamente no app do C6 Bank o CSV da fatura do seu cartão — não precisa ajustar nada.',
    howto: {
      via: 'App C6 Bank',
      platform: 'smartphone',
      steps: [
        { step: 'Abra o app do C6 Bank no celular' },
        { step: 'Na tela inicial, toque em "Cartão de Crédito"' },
        { step: 'Selecione "Fatura" no menu inferior' },
        { step: 'Escolha o mês que deseja exportar' },
        { step: 'Toque nos 3 pontinhos (⋮) no canto superior direito' },
        { step: 'Selecione "Exportar extrato" → "CSV"' },
        { step: 'Salve o arquivo e faça upload aqui' },
      ],
    },
    tips: [
      'Exporte uma fatura fechada por vez para melhores resultados.',
      'Pagamentos de fatura aparecem como "Transferência" automaticamente.',
      'Parcelamentos são detectados automaticamente (ex: 2/12).',
    ],
    faq: [
      { q: 'Posso importar a fatura aberta (atual)?', a: 'Sim, mas lembre-se que ela pode ainda ter transações pendentes.' },
      { q: 'O sistema vai duplicar transações se eu importar duas vezes?', a: 'Não! O sistema detecta duplicatas automaticamente e as desmarca por padrão.' },
    ],
  },
  {
    id: 'ofx',
    label: 'OFX / QFX',
    subtitle: 'Padrão bancário universal',
    icon: FileCode,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    accept: '.ofx,.qfx',
    badge: 'Itaú · Bradesco · Inter · BB · +',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    description: 'OFX é o padrão bancário universal — a forma mais confiável de importar extratos. Compatível com os principais bancos brasileiros.',
    bankGuides: BANK_GUIDES,
    tips: [
      'Exporte no máximo 3 meses de cada vez para melhor desempenho.',
      'Arquivos .qfx (formato Quicken) também são aceitos.',
      'Se o banco perguntar "Money" ou "Quicken", escolha qualquer um — ambos geram OFX.',
    ],
    faq: [
      { q: 'Não encontro a opção OFX no meu banco. O que faço?', a: 'Procure por "Money", "Quicken", "Microsoft Money" ou "Ofx" — todos geram o mesmo formato. Se não encontrar, use a opção de CSV genérico ou PDF.' },
      { q: 'Posso importar conta e cartão no mesmo arquivo?', a: 'Geralmente bancos geram arquivos separados por conta. Importe um de cada vez, selecionando a conta correta aqui.' },
      { q: 'O arquivo OFX é seguro?', a: 'Sim. O arquivo OFX contém apenas as transações (data, valor, descrição). Nunca inclui senha, token ou dados sensíveis.' },
    ],
  },
  {
    id: 'pdf',
    label: 'PDF',
    subtitle: 'Extrato em PDF',
    icon: FileSearch,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    accept: '.pdf',
    badge: 'BETA',
    badgeColor: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
    beta: true,
    description: 'Importe o extrato PDF gerado pelo app do seu banco. O sistema tenta detectar as transações automaticamente — revise antes de confirmar.',
    howto: {
      via: 'Qualquer banco',
      platform: 'both',
      steps: [
        { step: 'No app ou Internet Banking do seu banco, acesse "Extrato"' },
        { step: 'Selecione o período desejado' },
        { step: 'Procure a opção "Exportar", "Baixar" ou "Imprimir" → escolha PDF' },
        { step: 'Salve o arquivo PDF no seu dispositivo' },
        { step: 'Faça upload aqui e revise cuidadosamente as transações detectadas' },
      ],
    },
    tips: [
      'PDFs "nativos" (gerados digitalmente) funcionam melhor que PDFs de escaneamento.',
      'Se poucas transações forem detectadas, tente o formato OFX ou CSV.',
      'Revise sempre com atenção — PDFs variam muito de banco para banco.',
    ],
    faq: [
      { q: 'Por que o PDF às vezes não reconhece todas as transações?', a: 'Cada banco formata o PDF de maneira diferente. O sistema faz o melhor possível, mas PDFs são menos estruturados que OFX ou CSV.' },
      { q: 'Meu PDF está em branco após importar. O que aconteceu?', a: 'Alguns bancos geram PDFs protegidos ou baseados em imagem (escaneados). Esses não podem ser lidos automaticamente. Use OFX ou CSV.' },
    ],
  },
];

// ── Sub-componentes de UI ───────────────────��──────────────────────────────────

function StepDot({ n, done, active }) {
  return (
    <div className={cn(
      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
      done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
    )}>
      {done ? <CheckCheck className="w-3.5 h-3.5" /> : n}
    </div>
  );
}

function Stepper({ current }) {
  const labels = ['Configurar', 'Revisar', 'Concluído'];
  return (
    <div className="flex items-center gap-0 mb-6">
      {labels.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <StepDot n={i + 1} done={i < current} active={i === current} />
            <span className={cn('text-xs font-medium', i === current ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={cn('flex-1 h-0.5 mb-5', i < current ? 'bg-emerald-500' : 'bg-border')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Guia detalhado por banco (OFX) ─────────────────────────────────────────────

function BankGuidePanel({ guides }) {
  const banks = Object.entries(guides);
  const [active, setActive] = useState(banks[0][0]);
  const guide = guides[active];

  return (
    <div className="space-y-3">
      {/* Bank picker */}
      <div className="flex flex-wrap gap-2">
        {banks.map(([key, g]) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
              active === key
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
            )}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Steps per access method */}
      {guide.steps.map((method, mi) => (
        <div key={mi} className="rounded-xl border bg-muted/20 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
            {method.via === 'App' || method.via?.includes('App')
              ? <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              : <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
            }
            <span className="text-xs font-semibold text-muted-foreground">{method.via}</span>
          </div>
          <ol className="px-3 py-2.5 space-y-1.5">
            {method.steps.map((s, si) => (
              <li key={si} className="flex gap-2 text-xs">
                <span className="text-primary font-bold shrink-0">{si + 1}.</span>
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

// ── Painel de instruções ──────────────────────────��────────────────────────────

function FormatGuide({ format, onDownloadTemplate }) {
  const [faqOpen, setFaqOpen] = useState(null);

  return (
    <div className="space-y-4">
      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{format.description}</p>

      {/* How to export */}
      {format.bankGuides ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Como exportar por banco</p>
          <BankGuidePanel guides={format.bankGuides} />
        </div>
      ) : format.howto ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Passo a passo</p>
          <div className="rounded-xl border bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
              {format.howto.platform === 'smartphone'
                ? <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                : <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              }
              <span className="text-xs font-semibold text-muted-foreground">{format.howto.via}</span>
            </div>
            <ol className="px-3 py-2.5 space-y-2">
              {format.howto.steps.map(({ step }, si) => (
                <li key={si} className="flex gap-2 text-xs">
                  <span className="text-primary font-bold shrink-0">{si + 1}.</span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : format.template ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Como usar o template</p>
          <div className="rounded-xl border bg-muted/20 overflow-hidden">
            <div className="grid grid-cols-6 text-[10px] font-mono divide-x border-b bg-muted/50">
              {['data', 'titulo', 'entrada', 'saida', 'categoria', 'descricao'].map(h => (
                <div key={h} className="px-2 py-1.5 font-bold text-primary">{h}</div>
              ))}
            </div>
            <div className="grid grid-cols-6 text-[10px] font-mono divide-x border-b">
              {['01/01/2026', 'Salário', '5000,00', '', 'Salário', 'Depósito'].map((v, i) => (
                <div key={i} className={cn('px-2 py-1.5 text-muted-foreground', v === '' && 'bg-muted/30')}>{v}</div>
              ))}
            </div>
            <div className="grid grid-cols-6 text-[10px] font-mono divide-x">
              {['05/01/2026', 'iFood', '', '45,90', 'Alimentação', ''].map((v, i) => (
                <div key={i} className={cn('px-2 py-1.5 text-muted-foreground', v === '' && 'bg-muted/30')}>{v}</div>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 w-full" onClick={onDownloadTemplate}>
            <Download className="w-3.5 h-3.5" /> Baixar template CSV vazio
          </Button>
        </div>
      ) : null}

      {/* Tips */}
      {format.tips?.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-3 space-y-1.5">
          <p className="text-xs font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <Lightbulb className="w-3.5 h-3.5" /> Dicas
          </p>
          {format.tips.map((tip, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-400 flex gap-1.5">
              <span className="shrink-0">·</span>{tip}
            </p>
          ))}
        </div>
      )}

      {/* FAQ */}
      {format.faq?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dúvidas frequentes</p>
          {format.faq.map((item, i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              >
                <span className="text-xs font-medium">{item.q}</span>
                {faqOpen === i
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                }
              </button>
              {faqOpen === i && (
                <div className="px-3 pb-3 pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status badge na tabela ────────────────────────��────────────────────────────

function StatusBadge({ row }) {
  if (row.is_duplicate) return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 gap-1 whitespace-nowrap">
      <AlertTriangle className="w-3 h-3" /> Duplicata
    </Badge>
  );
  if (row.is_recurring_match) return (
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 gap-1 whitespace-nowrap" title={`Parece ser "${row.recurring_description}" (${Math.round((row.recurring_similarity || 0) * 100)}% similar)`}>
      <RefreshCw className="w-3 h-3" /> Recorrente?
    </Badge>
  );
  if (row.is_installment) return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 gap-1 whitespace-nowrap">
      Parcela {row.installment_info}
    </Badge>
  );
  if (row.is_transfer) return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1">Pagamento</Badge>
  );
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1 whitespace-nowrap">
      <CheckCircle className="w-3 h-3" /> Nova
    </Badge>
  );
}

function amountColor(row) {
  if (row.nature === 'INCOME') return 'text-emerald-600 dark:text-emerald-400';
  if (row.nature === 'EXPENSE') return 'text-red-600 dark:text-red-400';
  return 'text-blue-600 dark:text-blue-400';
}

function fmtCurrency(val) {
  const abs = Math.abs(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return val < 0 ? `- ${abs}` : val > 0 ? `+ ${abs}` : abs;
}

// ── Tabela de transações no preview ──────────────────────��────────────────────

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
                className={cn('transition-colors hover:bg-muted/20 cursor-pointer', !selectedRows.includes(row.row_index) && 'opacity-40')}
                onClick={() => onToggle(row.row_index)}
              >
                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selectedRows.includes(row.row_index)} onCheckedChange={() => onToggle(row.row_index)} />
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                  {parseLocalDate(row.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-2.5 max-w-[200px]">
                  <span className="block truncate font-medium text-sm" title={row.description}>{row.description}</span>
                  {row.is_recurring_match && (
                    <span className="text-[11px] text-orange-500 dark:text-orange-400">
                      Possível recorrente: "{row.recurring_description}"
                    </span>
                  )}
                </td>
                <td className={cn('px-4 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums text-sm', amountColor(row))}>
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

// ── Componente principal ───────────────────────────────���───────────────────────

const STEP_CONFIG = 0;
const STEP_PREVIEW = 1;
const STEP_SUCCESS = 2;

export default function Importacao() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(STEP_CONFIG);
  const [format, setFormat] = useState(null);
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

  function handleFileSelect(f) {
    if (!format) { toast.error('Selecione um formato primeiro'); return; }
    const accepted = format.accept.split(',').map(s => s.trim());
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!accepted.includes(ext)) {
      toast.error(`Formato inválido. Esperado: ${format.accept}`);
      return;
    }
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }

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
      setSelectedRows(data.to_import.map(r => r.row_index));
      setStep(STEP_PREVIEW);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao analisar arquivo');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleConfirmImport() {
    if (!selectedRows.length) return;
    setIsImporting(true);
    const allRows = [...(previewData.to_import || []), ...(previewData.duplicates || [])];
    const rows = allRows
      .filter(r => selectedRows.includes(r.row_index))
      .map(r => ({ date: r.date, description: r.description, amount: r.amount, nature: r.nature, category_name: r.categoria }));
    try {
      const { data } = await api.post('/transactions/import-csv/confirm', { account_id: selectedAccountId, rows });
      setImportedCount(data.imported);
      setStep(STEP_SUCCESS);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao confirmar importação');
    } finally {
      setIsImporting(false);
    }
  }

  function toggleRow(idx) {
    setSelectedRows(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }
  function toggleAll(idxs, select) {
    setSelectedRows(prev => select ? [...new Set([...prev, ...idxs])] : prev.filter(i => !idxs.includes(i)));
  }

  function reset() {
    setStep(STEP_CONFIG); setFile(null); setPreviewData(null); setSelectedRows([]); setShowErrors(false);
  }

  const toImport = previewData?.to_import || [];
  const duplicates = previewData?.duplicates || [];
  const totalRows = [...toImport, ...duplicates];
  const recurringRows = toImport.filter(r => r.is_recurring_match);
  const newRows = toImport.filter(r => !r.is_recurring_match);
  const selectedCount = selectedRows.length;

  // ── SUCCESS ─────────────────────────────────────────��────────────────────────

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

  // ── PREVIEW ───────────────────────────────────────────────────────────────────

  if (step === STEP_PREVIEW && previewData) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-28 animate-in fade-in duration-400">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revisar transações</h1>
            <p className="text-muted-foreground text-sm">
              Confira os dados antes de importar. Marque ou desmarque o que quiser.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setStep(STEP_CONFIG)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>

        <Stepper current={1} />

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Novas', value: newRows.length, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Recorrentes', value: recurringRows.length, color: 'text-orange-500 dark:text-orange-400' },
            { label: 'Duplicatas', value: duplicates.length, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Erros', value: previewData.errors.length, color: 'text-red-500 dark:text-red-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recurring warning */}
        {recurringRows.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-4 py-3 text-orange-700 dark:text-orange-400">
            <RefreshCw className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>{recurringRows.length} transação(ões)</strong> parecem corresponder a despesas recorrentes já cadastradas.
              Estão <strong>selecionadas</strong> — se a recorrente já foi gerada automaticamente, desmarque para não duplicar.
            </div>
          </div>
        )}

        {/* Duplicate info */}
        {duplicates.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>{duplicates.length} transação(ões)</strong> já existem no sistema com a mesma data, valor e descrição.
              Estão <strong>desmarcadas</strong> por padrão — marque só se quiser mesmo importar novamente.
            </div>
          </div>
        )}

        {newRows.length > 0 && (
          <TransactionTable
            rows={newRows} selectedRows={selectedRows} onToggle={toggleRow} onToggleAll={toggleAll}
            label="Transações novas" colorClass="border-emerald-200 dark:border-emerald-900/40"
          />
        )}
        {recurringRows.length > 0 && (
          <TransactionTable
            rows={recurringRows} selectedRows={selectedRows} onToggle={toggleRow} onToggleAll={toggleAll}
            label="Possíveis recorrentes (revise)" colorClass="border-orange-200 dark:border-orange-900/40"
          />
        )}
        {duplicates.length > 0 && (
          <TransactionTable
            rows={duplicates} selectedRows={selectedRows} onToggle={toggleRow} onToggleAll={toggleAll}
            label="Duplicatas (já existem no sistema)" colorClass="border-amber-200 dark:border-amber-900/40"
          />
        )}

        {previewData.errors.length > 0 && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 overflow-hidden">
            <button
              className="flex items-center gap-2 w-full px-4 py-3 bg-red-50/50 dark:bg-red-950/10 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100/30 transition-colors"
              onClick={() => setShowErrors(v => !v)}
            >
              <AlertCircle className="w-4 h-4" />
              {previewData.errors.length} linha(s) com erro — não serão importadas
              {showErrors ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>
            {showErrors && (
              <ul className="px-4 py-3 space-y-1">
                {previewData.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400 flex gap-2">
                    <span className="font-semibold shrink-0">Linha {err.row_index}:</span>
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t z-50 lg:left-[260px]">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">{selectedCount} de {totalRows.length} selecionadas</span>
              {recurringRows.filter(r => selectedRows.includes(r.row_index)).length > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                  {recurringRows.filter(r => selectedRows.includes(r.row_index)).length} recorrentes incluídas
                </Badge>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => setStep(STEP_CONFIG)}>Voltar</Button>
              <Button disabled={selectedCount === 0 || isImporting} onClick={handleConfirmImport} className="min-w-[160px]">
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

  // ── CONFIG ────────────────────────────────────────────────────────────���───────

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Extrato</h1>
        <p className="text-muted-foreground text-sm">Traga suas transações do banco sem digitar nada manualmente.</p>
      </div>

      <Stepper current={0} />

      {/* Step 1 — Format */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</div>
          <h2 className="font-semibold">Escolha o formato do extrato</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FORMATS.map(fmt => {
            const Icon = fmt.icon;
            const selected = format?.id === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => { setFormat(fmt); setFile(null); setSelectedAccountId(''); }}
                className={cn(
                  'relative flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md',
                  selected ? `${fmt.border} bg-muted/30 shadow-sm` : 'border-border hover:border-muted-foreground/40',
                )}
              >
                <div className={cn('p-2 rounded-xl', fmt.bg)}>
                  <Icon className={cn('w-5 h-5', fmt.color)} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm leading-tight">{fmt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmt.subtitle}</p>
                </div>
                <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', fmt.badgeColor)}>
                  {fmt.badge}
                </span>
                {selected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {format && (
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Left: detailed guide */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">?</div>
              <h2 className="font-semibold">Como usar: {format.label}</h2>
              {format.beta && <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">BETA</Badge>}
            </div>
            <div className="rounded-2xl border bg-card p-4 space-y-4 max-h-[520px] overflow-y-auto">
              <FormatGuide format={format} onDownloadTemplate={handleDownloadTemplate} />
            </div>
          </section>

          {/* Right: account + upload */}
          <section className="space-y-5">
            {/* Step 2: account */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</div>
                <h2 className="font-semibold">Selecione a conta destino</h2>
              </div>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Escolha a conta onde lançar as transações..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredAccounts.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Nenhuma conta {format.id === 'cartao' ? 'de cartão de crédito' : 'bancária'} cadastrada.
                  <button className="underline font-medium ml-1" onClick={() => navigate('/contas')}>Cadastrar agora →</button>
                </p>
              )}
            </div>

            {/* Step 3: file */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</div>
                <h2 className="font-semibold">Faça o upload do arquivo</h2>
                <span className="text-xs text-muted-foreground ml-auto">Aceito: {format.accept}</span>
              </div>

              <div
                className={cn(
                  'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                  isDragging ? 'border-primary bg-primary/5 scale-[1.01]'
                    : file ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20',
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
                    <div className="p-3 bg-emerald-500/10 rounded-full">
                      <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · Clique para trocar</p>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                    >
                      <X className="w-3 h-3" /> Remover arquivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-muted/50 rounded-full">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm">Arraste o arquivo aqui</p>
                    <p className="text-xs text-muted-foreground">ou <span className="text-primary underline">clique para selecionar</span></p>
                    <p className="text-xs text-muted-foreground/60">{format.accept}</p>
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
                : <><FileSearch className="w-5 h-5" /> Analisar e ver prévia <ArrowRight className="w-4 h-4 ml-1" /></>
              }
            </Button>

            {/* Quick tips for action */}
            {!file && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                Você vai poder revisar todas as transações antes de confirmar. Nada é salvo sem sua aprovação.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Empty state: no format selected */}
      {!format && (
        <div className="text-center py-12 text-muted-foreground">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione um formato acima para começar</p>
        </div>
      )}
    </div>
  );
}
