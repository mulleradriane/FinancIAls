// ─────────────────────────────────────────────────────────────────────────────
// ARQUIVO: frontend/src/hooks/useInvoice.js
// Hook que busca o estado da fatura de um cartão e expõe close/reopen actions
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import api from '@/api/api';

export function useInvoice(accountId, enabled = true) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!accountId || !enabled) return;
    setLoading(true);
    try {
      const res = await api.get(`/accounts/${accountId}/current-invoice`);
      setInvoice(res.data);
    } catch {
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [accountId, enabled]);

  useEffect(() => { fetch(); }, [fetch]);

  const closeInvoice = async () => {
    const res = await api.post(`/accounts/${accountId}/close-invoice`);
    setInvoice(res.data);
    return res.data;
  };

  const reopenInvoice = async () => {
    await api.post(`/accounts/${accountId}/reopen-invoice`);
    fetch();
  };

  const advanceToNext = async () => {
    await api.post(`/accounts/${accountId}/next-invoice`);
    fetch();
  };

  return { invoice, loading, refetch: fetch, closeInvoice, reopenInvoice, advanceToNext };
}


