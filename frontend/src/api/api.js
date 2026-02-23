import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

export const goalsApi = {
  getGoals: () => api.get('/goals/'),
  getGoal: (id) => api.get(`/goals/${id}`),
  createGoal: (goal) => api.post('/goals/', goal),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
};

export default api;
