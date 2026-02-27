import React, { createContext, useState, useEffect, useContext } from 'react';

const BudgetContext = createContext();

export const BudgetProvider = ({ children }) => {
  const [showBudget, setShowBudget] = useState(() => {
    const saved = localStorage.getItem('showBudget');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('showBudget', JSON.stringify(showBudget));
  }, [showBudget]);

  return (
    <BudgetContext.Provider value={{ showBudget, setShowBudget }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => useContext(BudgetContext);
