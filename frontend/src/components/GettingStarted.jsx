import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, X,
  Landmark, Tag, ArrowRightLeft, RefreshCw, Target,
  Upload, Plus, Sparkles, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/api/api';

const STORAGE_KEY = 'getting_started_dismissed';

const STEPS = [
  {
    id: 'account',
    icon: Landmark,
    title: 'Cadastre sua conta bancária',
    description: 'Adicione seus bancos, cartões e carteiras para começar a registrar.',
    action: { label: 'Ir para Contas', path: '/contas' },
    required: true,
    check: ({ accounts }) => accounts?.length > 0,
    doneText: (data) => {
      const n = data.accounts?.length || 0;
      return `${n} conta${n !== 1 ? 's' : ''} cadastrada${n !== 1 ? 's' : ''}`;
    },
  },
  {
    id: 'category',
    icon: Tag,
    title: 'Crie ou personalize suas categorias',
    description: 'Categorias organizam seus gastos. Você precisa de pelo menos uma para lançar transações.',
    action: { label: 'Ir para Categorias', path: '/categories' },
    required: true,
    check: ({ categories }) => categories?.length > 0,
    doneText: (data) => {
      const n = data.categories?.length || 0;
      return `${n} categoria${n !== 1 ? 's' : ''} disponível${n !== 1 ? 'is' : ''}`;
    },
  },
  {
    id: 'transaction',
    icon: ArrowRightLeft,
    title: 'Adicione sua primeira transação',
    description: 'Lance manualmente ou importe o extrato do seu banco.',
    actions: [
      { label: 'Importar extrato', path: '/importacao', variant: 'outline' },
    ],
    onboardingAction: 'new_transaction',
    required: true,
    check: ({ hasTransactions }) => hasTransactions,
    doneText: () => 'Você já tem transações registradas',
  },
  {
    id: 'recurring',
    icon: RefreshCw,
    title: 'Configure despesas recorrentes',
    description: 'Assinaturas, parcelas e receitas fixas — cadastre uma vez, esqueça o resto.',
    action: { label: 'Ir para Recorrentes', path: '/recorrentes' },
    required: false,
    check: ({ hasRecurring }) => hasRecurring,
    doneText: () => 'Despesas recorrentes configuradas',
  },
  {
    id: 'goal',
    icon: Target,
    title: 'Crie uma meta financeira',
    description: 'Defina um objetivo de poupança ou patrimônio e acompanhe seu progresso.',
    action: { label: 'Ir para Metas', path: '/metas' },
    required: false,
    check: ({ goals }) => goals?.length > 0,
    doneText: (data) => {
      const n = data.goals?.length || 0;
      return `${n} meta${n !== 1 ? 's' : ''} criada${n !== 1 ? 's' : ''}`;
    },
  },
];

export default function GettingStarted({ accounts, categories, goals, onNewTransaction }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [collapsed, setCollapsed] = useState(false);
  const [hasTransactions, setHasTransactions] = useState(false);
  const [hasRecurring, setHasRecurring] = useState(false);

  useEffect(() => {
    // Quick checks: does user have any transactions or recurring?
    api.get('/transactions/', { params: { limit: 1 } })
      .then(r => setHasTransactions((r.data?.items?.length ?? r.data?.length ?? 0) > 0))
      .catch(() => {});

    api.get('/recurring-expenses/')
      .then(r => setHasRecurring((r.data?.length ?? 0) > 0))
      .catch(() => {});
  }, []);

  const data = { accounts, categories, goals, hasTransactions, hasRecurring };

  const completedRequired = STEPS.filter(s => s.required && s.check(data)).length;
  const totalRequired = STEPS.filter(s => s.required).length;
  const completedOptional = STEPS.filter(s => !s.required && s.check(data)).length;
  const totalOptional = STEPS.filter(s => !s.required).length;
  const allRequiredDone = completedRequired === totalRequired;
  const totalCompleted = completedRequired + completedOptional;
  const totalSteps = STEPS.length;
  const progressPct = Math.round((totalCompleted / totalSteps) * 100);

  // Auto-hide once everything (including optional) is done
  if (dismissed) return null;
  if (totalCompleted === totalSteps) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none bg-gradient-to-r from-primary/8 to-transparent border-b"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="p-2 bg-primary/10 rounded-xl">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">Primeiros passos</h3>
            {allRequiredDone && (
              <span className="text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Essencial concluído!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {totalCompleted}/{totalSteps} etapas
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            onClick={e => { e.stopPropagation(); handleDismiss(); }}
            title="Dispensar"
          >
            <X className="w-4 h-4" />
          </button>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronUp className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y">
          {STEPS.map((step, idx) => {
            const done = step.check(data);
            const Icon = step.icon;
            const isLast = idx === STEPS.length - 1;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-4 px-5 py-4 transition-colors',
                  done ? 'bg-muted/20' : 'hover:bg-muted/10',
                )}
              >
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <Circle className={cn('w-5 h-5', step.required ? 'text-primary/60' : 'text-muted-foreground/40')} />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={cn(
                      'p-1 rounded-lg shrink-0',
                      done ? 'bg-emerald-500/10' : step.required ? 'bg-primary/10' : 'bg-muted',
                    )}>
                      <Icon className={cn(
                        'w-3.5 h-3.5',
                        done ? 'text-emerald-600 dark:text-emerald-400' : step.required ? 'text-primary' : 'text-muted-foreground',
                      )} />
                    </div>
                    <span className={cn(
                      'font-medium text-sm',
                      done && 'line-through text-muted-foreground',
                    )}>
                      {step.title}
                    </span>
                    {!step.required && (
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                        opcional
                      </span>
                    )}
                  </div>

                  {done ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 ml-[28px]">
                      ✓ {step.doneText(data)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-[28px]">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {!done && (
                  <div className="flex items-center gap-2 shrink-0 mt-0.5 flex-wrap justify-end">
                    {step.onboardingAction === 'new_transaction' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs rounded-lg gap-1"
                        onClick={onNewTransaction}
                      >
                        <Plus className="w-3 h-3" /> Nova transação
                      </Button>
                    )}
                    {step.actions?.map(a => (
                      <Button
                        key={a.path}
                        size="sm"
                        variant={a.variant || 'outline'}
                        className="h-7 text-xs rounded-lg gap-1"
                        onClick={() => navigate(a.path)}
                      >
                        <Upload className="w-3 h-3" /> {a.label}
                      </Button>
                    ))}
                    {step.action && (
                      <Button
                        size="sm"
                        variant={step.onboardingAction ? 'outline' : 'default'}
                        className="h-7 text-xs rounded-lg"
                        onClick={() => navigate(step.action.path)}
                      >
                        {step.action.label} →
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {!collapsed && !allRequiredDone && (
        <div className="px-5 py-3 bg-muted/20 border-t text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="text-primary font-medium">{totalRequired - completedRequired} etapa{(totalRequired - completedRequired) !== 1 ? 's' : ''} obrigatória{(totalRequired - completedRequired) !== 1 ? 's' : ''} restante{(totalRequired - completedRequired) !== 1 ? 's' : ''}</span>
          · Você pode dispensar este guia a qualquer momento clicando no ×
        </div>
      )}
      {!collapsed && allRequiredDone && totalCompleted < totalSteps && (
        <div className="px-5 py-3 bg-emerald-500/5 border-t text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Essencial concluído! Complete as etapas opcionais para aproveitar ao máximo o app.
        </div>
      )}
    </div>
  );
}
