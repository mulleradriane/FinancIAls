import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>FinancIAls</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>
              Transactions
            </NavLink>
          </li>
          <li>
            <NavLink to="/categories" className={({ isActive }) => isActive ? 'active' : ''}>
              Categories
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
