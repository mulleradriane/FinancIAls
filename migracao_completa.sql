BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 4229760ab57a

CREATE TYPE accounttype AS ENUM ('banco', 'carteira', 'poupanca', 'investimento', 'cartao_credito', 'outros_ativos', 'outros_passivos');

CREATE TABLE accounts (
    id UUID NOT NULL, 
    name VARCHAR NOT NULL, 
    type accounttype NOT NULL, 
    initial_balance NUMERIC(12, 2) NOT NULL, 
    initial_balance_date DATE DEFAULT CURRENT_DATE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TYPE categorytype AS ENUM ('expense', 'income');

CREATE TABLE categories (
    id UUID NOT NULL, 
    name VARCHAR NOT NULL, 
    type categorytype NOT NULL, 
    icon VARCHAR, 
    color VARCHAR, 
    is_system BOOLEAN NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (name)
);

CREATE TABLE balance_history (
    id UUID NOT NULL, 
    account_id UUID NOT NULL, 
    balance NUMERIC(12, 2) NOT NULL, 
    date DATE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(account_id) REFERENCES accounts (id)
);

CREATE TYPE recurringtype AS ENUM ('subscription', 'installment');

CREATE TYPE frequencytype AS ENUM ('monthly', 'yearly');

CREATE TABLE recurring_expenses (
    id UUID NOT NULL, 
    description VARCHAR NOT NULL, 
    category_id UUID NOT NULL, 
    amount NUMERIC(12, 2) NOT NULL, 
    type recurringtype NOT NULL, 
    frequency frequencytype, 
    total_installments INTEGER, 
    start_date DATE NOT NULL, 
    active BOOLEAN, 
    account_id UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(account_id) REFERENCES accounts (id) ON DELETE CASCADE, 
    FOREIGN KEY(category_id) REFERENCES categories (id)
);

CREATE TYPE transactionnature AS ENUM ('INCOME', 'EXPENSE', 'INVESTMENT', 'TRANSFER', 'SYSTEM_ADJUSTMENT');

CREATE TABLE transactions (
    id UUID NOT NULL, 
    description VARCHAR NOT NULL, 
    category_id UUID, 
    amount NUMERIC(12, 2) NOT NULL, 
    nature transactionnature NOT NULL, 
    date DATE NOT NULL, 
    transfer_group_id UUID, 
    recurring_expense_id UUID, 
    installment_number INTEGER, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    account_id UUID, 
    PRIMARY KEY (id), 
    FOREIGN KEY(account_id) REFERENCES accounts (id), 
    FOREIGN KEY(category_id) REFERENCES categories (id), 
    FOREIGN KEY(recurring_expense_id) REFERENCES recurring_expenses (id)
);

INSERT INTO alembic_version (version_num) VALUES ('4229760ab57a') RETURNING alembic_version.version_num;

COMMIT;

