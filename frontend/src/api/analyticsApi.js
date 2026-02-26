import api from './api';

const analyticsApi = {
  getOperationalMonthly: () => api.get('/analytics/operational-monthly'),
  getSavingsRate: () => api.get('/analytics/savings-rate'),
  getBurnRate: () => api.get('/analytics/burn-rate'),
  getNetWorth: () => api.get('/analytics/net-worth'),
  getAssetsLiabilities: () => api.get('/analytics/assets-liabilities'),
  getAccountBalances: () => api.get('/analytics/account-balances'),
  getGoalsProgress: () => api.get('/analytics/goals-progress'),
  getForecast: () => api.get('/analytics/forecast'),
  getDailyExpenses: (year, month) => api.get(`/analytics/daily-expenses?year=${year}&month=${month}`),
  getSankeyData: (year, month) => api.get(`/analytics/sankey?year=${year}&month=${month}`),
};

export default analyticsApi;
