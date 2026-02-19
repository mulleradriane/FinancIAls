import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import FluxoCaixa from './pages/FluxoCaixa';
import Contas from './pages/Contas';
import Patrimonio from './pages/Patrimonio';
import Recorrentes from './pages/Recorrentes';
import Relatorios from './pages/Relatorios';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function AppContent() {
  useEffect(() => {
    // Initialize default user if not exists
    const savedSettings = localStorage.getItem('userSettings');
    if (!savedSettings) {
      localStorage.setItem('userSettings', JSON.stringify({
        displayName: '',
        username: 'admin',
        password: 'password'
      }));
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="categories" element={<Categories />} />
        <Route path="fluxo-caixa" element={<FluxoCaixa />} />
        <Route path="contas" element={<Contas />} />
        <Route path="patrimonio" element={<Patrimonio />} />
        <Route path="recorrentes" element={<Recorrentes />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
