import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import FluxoCaixa from './pages/FluxoCaixa';
import Contas from './pages/Contas';
import Patrimonio from './pages/Patrimonio';
import Recorrentes from './pages/Recorrentes';
import Relatorios from './pages/Relatorios';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="fluxo-caixa" element={<FluxoCaixa />} />
          <Route path="contas" element={<Contas />} />
          <Route path="patrimonio" element={<Patrimonio />} />
          <Route path="recorrentes" element={<Recorrentes />} />
          <Route path="relatorios" element={<Relatorios />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
