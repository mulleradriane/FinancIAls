import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import FluxoCaixa from './pages/FluxoCaixa';
import Contas from './pages/Contas';
import Patrimonio from './pages/Patrimonio';
import Recorrentes from './pages/Recorrentes';
import Relatorios from './pages/Relatorios';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
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

export default App;
