// ─────────────────────────────────────────────────────────────────────────────
// PATCH para frontend/src/components/TransactionForm.jsx
//
// Duas mudanças cirúrgicas — aplique manualmente no arquivo existente:
//
// 1. Carregamento autônomo de categorias/contas quando props chegam vazias
//    (necessário quando o form é aberto pelo MainLayout sem dados pré-carregados)
//
// 2. Suporte à prop `prefill` para pré-preencher campos vindos do quick-add
// ─────────────────────────────────────────────────────────────────────────────

// ── MUDANÇA 1 ─────────────────────────────────────────────────────────────────
// Localizar no TransactionForm o trecho onde categories e accounts chegam como props:
//
//   const TransactionForm = ({ transaction, categories, accounts, onTransactionCreated, onClose }) => {
//
// Substituir por:
//
//   const TransactionForm = ({ transaction, categories: categoriesProp = [], accounts: accountsProp = [], prefill, onTransactionCreated, onClose }) => {
//
// Depois, logo após os useState iniciais (antes do primeiro useEffect), adicionar:

/*
  // Carrega categorias e contas autonomamente se não foram passadas via props
  const [internalCategories, setInternalCategories] = useState([]);
  const [internalAccounts, setInternalAccounts] = useState([]);

  useEffect(() => {
    const loadIfNeeded = async () => {
      try {
        const [catsRes, accsRes] = await Promise.allSettled([
          categoriesProp.length === 0 ? api.get('/categories/') : Promise.resolve(null),
          accountsProp.length === 0   ? api.get('/accounts/')   : Promise.resolve(null),
        ]);
        if (catsRes.status === 'fulfilled' && catsRes.value) {
          setInternalCategories(catsRes.value.data);
        }
        if (accsRes.status === 'fulfilled' && accsRes.value) {
          setInternalAccounts(accsRes.value.data);
        }
      } catch { /* silencioso */ }
    };
    loadIfNeeded();
  }, [categoriesProp.length, accountsProp.length]);

  // Merge: usa props se disponíveis, senão usa interno
  const categories = categoriesProp.length > 0 ? categoriesProp : internalCategories;
  const accounts   = accountsProp.length > 0   ? accountsProp   : internalAccounts;
*/


// ── MUDANÇA 2 ─────────────────────────────────────────────────────────────────
// Adicionar suporte à prop `prefill` que vem do quick-add.
// Localizar o useEffect que inicializa formData (o que usa fullTransaction):
//
//   const [formData, setFormData] = useState({
//     description: fullTransaction ? fullTransaction.description : '',
//     ...
//   });
//
// Substituir a inicialização do useState para considerar `prefill`:
//
//   const [formData, setFormData] = useState({
//     description: fullTransaction ? fullTransaction.description : (prefill?.description || ''),
//     amount: fullTransaction ? fullTransaction.amount : (prefill?.amount || 0),
//     displayAmount: fullTransaction
//       ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fullTransaction.amount)
//       : (prefill?.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prefill.amount) : ''),
//     date: fullTransaction ? fullTransaction.date : (prefill?.date || new Date().toISOString().split('T')[0]),
//     categoryId: extractCategoryId(fullTransaction) || (prefill?.categoryId || ''),
//     accountId: extractAccountId(fullTransaction) || (prefill?.accountId || ''),
//     isRecurring: false,
//     recurring: {
//       type: 'subscription',
//       frequency: 'monthly',
//       totalInstallments: '',
//     }
//   });


// ─────────────────────────────────────────────────────────────────────────────
// RESUMO DOS DOIS PONTOS DE MUDANÇA:
//
// Linha ~40:  Adicionar prefill à assinatura do componente
// Linha ~50:  Adicionar os dois useEffect + merge de categories/accounts
// Linha ~90:  Ajustar useState de formData para usar prefill como fallback
// ─────────────────────────────────────────────────────────────────────────────

// ── MUDANÇA 3 (opcional mas recomendada) ──────────────────────────────────────
// Remover os console.log de debug que existem no componente atual:
//
//   console.log('🖼️ [RENDER] TransactionForm renderizando', { ... })
//   console.log('✅ [SUBMIT] Validando formulário', { ... })
//   console.log('📤 [SUBMIT] Enviando payload', payload)
//
// Eles poluem o console em produção. Basta deletar ou comentar essas 3 linhas.
