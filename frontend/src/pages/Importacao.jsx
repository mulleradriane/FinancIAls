import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  CreditCard,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import api from '@/api/api';
import PrivateValue from '@/components/ui/PrivateValue';

const STEP_CONFIG = 1;
const STEP_PREVIEW = 2;
const STEP_SUCCESS = 3;

export default function Importacao() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP_CONFIG);
  const [fileType, setFileType] = useState('conta');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await api.get('/accounts/');
        setAccounts(response.data);
      } catch (error) {
        toast.error('Erro ao carregar contas');
      }
    };
    fetchAccounts();
  }, []);

  const handleDownloadTemplate = () => {
    const content = 'data,titulo,entrada,saida,categoria,descricao\n01/02/2026,Salário,5000.00,,Salário,Depósito mensal\n05/02/2026,Mercado,,150.50,Alimentação,Compras da semana';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_ronromia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
    } else {
      toast.error('Selecione um arquivo CSV válido');
    }
  };

  const handleAnalyze = async () => {
    if (!file || !selectedAccountId) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', selectedAccountId);
    formData.append('file_type', fileType);

    try {
      const response = await api.post('/transactions/import-csv/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(response.data);
      setSelectedRows(response.data.to_import.map(r => r.row_index));
      setStep(STEP_PREVIEW);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar arquivo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleRow = (rowIndex) => {
    setSelectedRows(prev =>
      prev.includes(rowIndex)
        ? prev.filter(i => i !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  const handleConfirmImport = async () => {
    if (selectedRows.length === 0) return;

    setIsImporting(true);
    const allRows = [...previewData.to_import, ...previewData.duplicates];
    const rowsToConfirm = allRows
      .filter(r => selectedRows.includes(r.row_index))
      .map(r => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        nature: r.nature,
        category_name: r.categoria
      }));

    try {
      const response = await api.post('/transactions/import-csv/confirm', {
        account_id: selectedAccountId,
        rows: rowsToConfirm
      });
      setImportedCount(response.data.imported);
      setStep(STEP_SUCCESS);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao confirmar importação');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredAccounts = accounts.filter(acc =>
    fileType === 'cartao' ? acc.type === 'cartao_credito' : acc.type !== 'cartao_credito'
  );

  const formatCurrency = (val) => {
    const absVal = Math.abs(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return val < 0 ? `- ${absVal}` : val > 0 ? `+ ${absVal}` : absVal;
  };

  const getAmountColor = (row) => {
    if (row.nature === 'INCOME') return 'text-emerald-600 dark:text-emerald-400';
    if (row.nature === 'EXPENSE') return 'text-red-600 dark:text-red-400';
    if (row.nature === 'TRANSFER') return 'text-blue-600 dark:text-blue-400';
    return '';
  };

  if (step === STEP_SUCCESS) {
    const accountName = accounts.find(a => a.id === selectedAccountId)?.name || 'conta selecionada';
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Importação concluída!</h1>
        <p className="text-foreground/60 mb-8">
          {importedCount} transações foram importadas com sucesso para <strong>{accountName}</strong>.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/transactions')}>
            Ver Transações
          </Button>
          <Button onClick={() => {
            setStep(STEP_CONFIG);
            setFile(null);
            setPreviewData(null);
            setSelectedRows([]);
          }}>
            Importar Outro Arquivo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Extrato</h1>
          <p className="text-foreground/60">
            Importe transações de qualquer banco. Escolha o tipo de arquivo, selecione a conta e faça o upload.
          </p>
        </div>
        {step === STEP_PREVIEW && (
          <Button variant="ghost" onClick={() => setStep(STEP_CONFIG)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        )}
      </div>

      {step === STEP_CONFIG && (
        <div className="grid gap-6 animate-in fade-in duration-500">
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all border-2 ${fileType === 'conta' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
              onClick={() => { setFileType('conta'); setSelectedAccountId(''); }}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Landmark className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Extrato Conta Corrente</CardTitle>
                  <CardDescription>PIX, débito, transferências.</CardDescription>
                </div>
                <Badge variant="secondary">Formato Ronromia</Badge>
              </CardHeader>
              <CardContent className="text-sm text-foreground/70 dark:text-foreground/60">
                Para extratos de conta bancária. Use o template padronizado para facilitar a importação.
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}>
                  <Download className="w-4 h-4" /> Baixar Template CSV
                </Button>
              </CardFooter>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${fileType === 'cartao' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
              onClick={() => { setFileType('cartao'); setSelectedAccountId(''); }}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Fatura Cartão de Crédito</CardTitle>
                  <CardDescription>Exportação nativa do C6 Bank.</CardDescription>
                </div>
                <Badge variant="secondary">Formato C6 Bank</Badge>
              </CardHeader>
              <CardContent className="text-sm text-foreground/70 dark:text-foreground/60">
                Exporte o CSV diretamente no app do C6 Bank e importe aqui sem precisar ajustar nada.
              </CardContent>
              <CardFooter>
                <div className="h-9 w-full" />
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Conta destino</label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de destino" />
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
                    Nenhuma conta do tipo {fileType === 'cartao' ? 'Cartão de Crédito' : 'Corrente/Outros'} encontrada.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload do arquivo</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center gap-2">
                    {file ? (
                      <>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-foreground/60">Clique para trocar o arquivo</p>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-muted/50 rounded-full">
                          <Upload className="w-8 h-8 text-foreground/60" />
                        </div>
                        <p className="font-medium">Arraste o arquivo CSV ou clique para selecionar</p>
                        <p className="text-xs text-foreground/60">Apenas arquivos .csv são aceitos</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t pt-6">
              <Button
                className="w-full h-12 text-lg gap-2"
                disabled={!file || !selectedAccountId || isAnalyzing}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Analisando arquivo...
                  </>
                ) : (
                  <>Analisar Arquivo</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === STEP_PREVIEW && previewData && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Revisar Transações</h2>
            <p className="text-foreground/60">
              Verifique os dados abaixo antes de confirmar a importação. Transações duplicadas foram desmarcadas automaticamente.
            </p>
          </div>

          {previewData.to_import.length > 0 && (
            <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                    {previewData.to_import.length} transações prontas
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
                  onClick={() => {
                    const allIds = previewData.to_import.map(r => r.row_index);
                    const areAllSelected = allIds.every(id => selectedRows.includes(id));
                    if (areAllSelected) {
                      setSelectedRows(prev => prev.filter(id => !allIds.includes(id)));
                    } else {
                      setSelectedRows(prev => [...new Set([...prev, ...allIds])]);
                    }
                  }}
                >
                  {previewData.to_import.every(r => selectedRows.includes(r.row_index)) ? 'Desmarcar todas' : 'Marcar todas'}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-emerald-100 dark:border-emerald-900/30 bg-emerald-100/50 dark:bg-emerald-900/20">
                      <th className="px-4 py-3 text-left w-10"></th>
                      <th className="px-4 py-3 text-left font-medium text-emerald-900 dark:text-emerald-100">Data</th>
                      <th className="px-4 py-3 text-left font-medium text-emerald-900 dark:text-emerald-100">Descrição</th>
                      <th className="px-4 py-3 text-right font-medium text-emerald-900 dark:text-emerald-100">Valor</th>
                      <th className="px-4 py-3 text-left font-medium text-emerald-900 dark:text-emerald-100">Categoria</th>
                      <th className="px-4 py-3 text-left font-medium text-emerald-900 dark:text-emerald-100">Avisos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/20">
                    {previewData.to_import.map((row) => (
                      <tr key={row.row_index} className="hover:bg-emerald-100/30 dark:hover:bg-emerald-900/10 transition-colors">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedRows.includes(row.row_index)}
                            onCheckedChange={() => handleToggleRow(row.row_index)}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(row.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 max-w-[250px] truncate" title={row.description}>
                          {row.description}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${getAmountColor(row)}`}>
                          <PrivateValue value={formatCurrency(row.amount)} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="outline">{row.categoria}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.is_installment && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                Parcela {row.installment_info}
                              </Badge>
                            )}
                            {row.is_transfer && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                Pagamento
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {previewData.duplicates.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-900/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    {previewData.duplicates.length} possíveis duplicatas detectadas
                  </h3>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Estas transações já existem no sistema com a mesma data, valor e descrição. Estão desmarcadas por padrão.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm opacity-80">
                  <thead>
                    <tr className="border-b border-amber-100 dark:border-amber-900/30 bg-amber-100/50 dark:bg-amber-900/20">
                      <th className="px-4 py-3 text-left w-10"></th>
                      <th className="px-4 py-3 text-left font-medium">Data</th>
                      <th className="px-4 py-3 text-left font-medium">Descrição</th>
                      <th className="px-4 py-3 text-right font-medium">Valor</th>
                      <th className="px-4 py-3 text-left font-medium">Categoria</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 dark:divide-amber-900/20">
                    {previewData.duplicates.map((row) => (
                      <tr key={row.row_index} className="hover:bg-amber-100/30 dark:hover:bg-amber-900/10 transition-colors">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedRows.includes(row.row_index)}
                            onCheckedChange={() => handleToggleRow(row.row_index)}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(row.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 max-w-[250px] truncate">
                          {row.description}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${getAmountColor(row)}`}>
                          <PrivateValue value={formatCurrency(row.amount)} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="outline">{row.categoria}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-100/50">Já existe</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {previewData.errors.length > 0 && (
            <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-base text-red-900 dark:text-red-100">
                    {previewData.errors.length} linhas com erro (não serão importadas)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-1">
                  {previewData.errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700 dark:text-red-400 flex gap-2">
                      <span className="font-semibold">Linha {error.row_index}:</span>
                      <span>{error.message}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t p-4 z-50 lg:left-[260px]">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="w-4 h-4 text-primary" />
                <span>
                  {selectedRows.length} de {previewData.to_import.length + previewData.duplicates.length} selecionadas para importação
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(STEP_CONFIG)}>
                  Voltar
                </Button>
                <Button
                  disabled={selectedRows.length === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="min-w-[180px]"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...
                    </>
                  ) : (
                    'Confirmar Importação'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
