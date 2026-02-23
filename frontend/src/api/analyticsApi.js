import api from './api';

const analyticsApi = {
  getOperationalMonthly: () => api.get('/analytics/operational-monthly'),
  getSavingsRate: () => api.get('/analytics/savings-rate'),
  getBurnRate: () => api.get('/analytics/burn-rate'),
  getNetWorth: () => api.get('/analytics/net-worth'),
  getAssetsLiabilities: () => api.get('/analytics/assets-liabilities'),
  getAccountBalances: () => api.get('/analytics/account-balances'),
};

export default analyticsApi;
