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

-- Running upgrade 4229760ab57a -> 7367fa5d2061

CREATE OR REPLACE VIEW v_account_balances AS
    SELECT
        a.id,
        a.type,
        a.initial_balance +
        COALESCE(
            SUM(
                CASE
                    WHEN t.date >= a.initial_balance_date
                     AND t.deleted_at IS NULL
                    THEN t.amount
                    ELSE 0
                END
            ), 0
        ) AS current_balance
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
    GROUP BY
        a.id,
        a.type,
        a.initial_balance,
        a.initial_balance_date;;

CREATE OR REPLACE VIEW v_operational_monthly AS
    SELECT
        date_trunc('month', date) AS month,
        SUM(CASE WHEN nature = 'INCOME' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN nature = 'EXPENSE' THEN -amount ELSE 0 END) AS total_expense,
        SUM(
            CASE
                WHEN nature IN ('INCOME','EXPENSE')
                THEN amount
                ELSE 0
            END
        ) AS net_result
    FROM transactions
    WHERE deleted_at IS NULL
    GROUP BY 1
    ORDER BY 1;;

CREATE OR REPLACE VIEW v_savings_rate AS
    SELECT
        month,
        total_income,
        total_expense,
        net_result,
        CASE
            WHEN total_income > 0
            THEN ROUND(net_result / total_income, 4)
            ELSE 0
        END AS savings_rate
    FROM v_operational_monthly;;

CREATE OR REPLACE VIEW v_burn_rate AS
    SELECT
        COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
    FROM v_operational_monthly
    WHERE month >= date_trunc('month', now()) - interval '4 months'
      AND month < date_trunc('month', now());;

CREATE OR REPLACE VIEW v_net_worth AS
    SELECT
        COALESCE(SUM(current_balance), 0) AS net_worth
    FROM v_account_balances;;

CREATE OR REPLACE VIEW v_assets_liabilities AS
    SELECT
        CASE
            WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                THEN 'asset'
            WHEN type IN ('cartao_credito','outros_passivos')
                THEN 'liability'
        END AS classification,
        SUM(
            CASE
                WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                    THEN current_balance
                WHEN type IN ('cartao_credito','outros_passivos')
                    THEN -current_balance
            END
        ) AS total
    FROM v_account_balances
    GROUP BY 1;;

UPDATE alembic_version SET version_num='7367fa5d2061' WHERE alembic_version.version_num = '4229760ab57a';

-- Running upgrade 7367fa5d2061 -> 25b713b1ee97

CREATE INDEX idx_transactions_account_date_deleted ON transactions (account_id, date, deleted_at);

CREATE INDEX idx_transactions_date_nature_deleted ON transactions (date, nature, deleted_at);

CREATE OR REPLACE VIEW v_burn_rate AS
        SELECT
            COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
        FROM v_operational_monthly
        WHERE month >= date_trunc('month', now()) - interval '3 months'
          AND month < date_trunc('month', now());;

CREATE OR REPLACE VIEW v_assets_liabilities AS
        SELECT
            CASE
                WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                    THEN 'asset'
                WHEN type IN ('cartao_credito','outros_passivos')
                    THEN 'liability'
                ELSE 'other'
            END AS classification,
            SUM(
                CASE
                    WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                        THEN current_balance
                    WHEN type IN ('cartao_credito','outros_passivos')
                        THEN -current_balance
                    ELSE 0
                END
            ) AS total
        FROM v_account_balances
        GROUP BY 1;;

UPDATE alembic_version SET version_num='25b713b1ee97' WHERE alembic_version.version_num = '7367fa5d2061';

-- Running upgrade 25b713b1ee97 -> 14d68e1fb0e0

CREATE TYPE goaltype AS ENUM ('SAVINGS', 'NET_WORTH');

CREATE TABLE financial_goals (
    id UUID NOT NULL, 
    name VARCHAR NOT NULL, 
    target_amount NUMERIC(12, 2) NOT NULL, 
    start_date DATE NOT NULL, 
    target_date DATE NOT NULL, 
    goal_type goaltype NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id)
);

UPDATE alembic_version SET version_num='14d68e1fb0e0' WHERE alembic_version.version_num = '25b713b1ee97';

-- Running upgrade 14d68e1fb0e0 -> 18671a96c794

CREATE OR REPLACE VIEW v_goal_progress AS
        WITH current_nw AS (
            SELECT net_worth FROM v_net_worth
        )
        SELECT
            g.id,
            g.name,
            g.target_amount,
            g.goal_type,
            g.start_date,
            g.target_date,
            nw.net_worth AS current_amount,
            CASE
                WHEN CURRENT_DATE < g.start_date THEN 0
                WHEN g.target_amount > 0 THEN ROUND((nw.net_worth / g.target_amount) * 100, 2)
                ELSE 0
            END AS percentage_completed,
            GREATEST(g.target_amount - nw.net_worth, 0) AS remaining_amount,
            GREATEST(g.target_date - CURRENT_DATE, 0) AS days_remaining,
            CASE
                WHEN CURRENT_DATE < g.start_date THEN TRUE
                WHEN CURRENT_DATE > g.target_date THEN nw.net_worth >= g.target_amount
                ELSE
                    nw.net_worth >= (
                        g.target_amount * (
                            (CURRENT_DATE - g.start_date)::float /
                            NULLIF((g.target_date - g.start_date), 0)::float
                        )
                    )
            END AS on_track
        FROM financial_goals g, current_nw nw
        WHERE g.deleted_at IS NULL;;

UPDATE alembic_version SET version_num='18671a96c794' WHERE alembic_version.version_num = '14d68e1fb0e0';

-- Running upgrade 18671a96c794 -> b650459b6327

CREATE OR REPLACE VIEW v_financial_forecast AS
        WITH stats AS (
            SELECT
                (SELECT net_worth FROM v_net_worth) as current_net_worth,
                (SELECT COALESCE(AVG(net_result), 0) FROM v_operational_monthly
                 WHERE month >= date_trunc('month', now()) - interval '3 months'
                   AND month < date_trunc('month', now())) as avg_monthly_result
        )
        SELECT
            current_net_worth,
            avg_monthly_result as avg_monthly_result_last_3m,
            current_net_worth + (avg_monthly_result * 3) as projected_3m,
            current_net_worth + (avg_monthly_result * 6) as projected_6m,
            current_net_worth + (avg_monthly_result * 12) as projected_12m,
            CASE
                WHEN avg_monthly_result < 0 THEN
                    CASE
                        WHEN current_net_worth <= 0 THEN 0
                        ELSE ABS(current_net_worth / avg_monthly_result)
                    END
                ELSE NULL
            END as months_until_zero,
            CASE
                WHEN avg_monthly_result < 0 THEN
                    CASE
                        WHEN current_net_worth <= 0 THEN CURRENT_DATE
                        ELSE (date_trunc('day', now()) + (ABS(current_net_worth / avg_monthly_result) * interval '1 month'))::date
                    END
                ELSE NULL
            END as projected_date_of_zero
        FROM stats;;

UPDATE alembic_version SET version_num='b650459b6327' WHERE alembic_version.version_num = '18671a96c794';

-- Running upgrade b650459b6327 -> 19e4f4905296

DROP VIEW IF EXISTS v_financial_forecast;;

DROP VIEW IF EXISTS v_goal_progress;;

DROP VIEW IF EXISTS v_assets_liabilities;;

DROP VIEW IF EXISTS v_net_worth;;

DROP VIEW IF EXISTS v_burn_rate;;

DROP VIEW IF EXISTS v_savings_rate;;

DROP VIEW IF EXISTS v_operational_monthly;;

DROP VIEW IF EXISTS v_account_balances;;

CREATE TABLE users (
    id UUID NOT NULL, 
    username VARCHAR NOT NULL, 
    display_name VARCHAR, 
    hashed_password VARCHAR NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_username ON users (username);

ALTER TABLE accounts ADD COLUMN user_id UUID;

ALTER TABLE accounts ADD CONSTRAINT fk_accounts_user_id_users FOREIGN KEY(user_id) REFERENCES users (id);

ALTER TABLE categories ADD COLUMN user_id UUID;

ALTER TABLE categories ADD CONSTRAINT fk_categories_user_id_users FOREIGN KEY(user_id) REFERENCES users (id);

ALTER TABLE transactions ADD COLUMN user_id UUID;

ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id);

ALTER TABLE recurring_expenses ADD COLUMN user_id UUID;

ALTER TABLE recurring_expenses ADD CONSTRAINT fk_recurring_expenses_user_id_users FOREIGN KEY(user_id) REFERENCES users (id);

ALTER TABLE financial_goals ADD COLUMN user_id UUID;

ALTER TABLE financial_goals ADD CONSTRAINT fk_financial_goals_user_id_users FOREIGN KEY(user_id) REFERENCES users (id);

INSERT INTO users (id, username, display_name, hashed_password) VALUES ('8af73c1a-b242-490a-9d7a-a7d1ec423b8b', 'admin', 'Administrador', 'no-password-login-disabled');

UPDATE accounts SET user_id = '8af73c1a-b242-490a-9d7a-a7d1ec423b8b' WHERE user_id IS NULL;

ALTER TABLE accounts ALTER COLUMN user_id SET NOT NULL;

UPDATE categories SET user_id = '8af73c1a-b242-490a-9d7a-a7d1ec423b8b' WHERE user_id IS NULL;

ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;

UPDATE transactions SET user_id = '8af73c1a-b242-490a-9d7a-a7d1ec423b8b' WHERE user_id IS NULL;

ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;

UPDATE recurring_expenses SET user_id = '8af73c1a-b242-490a-9d7a-a7d1ec423b8b' WHERE user_id IS NULL;

ALTER TABLE recurring_expenses ALTER COLUMN user_id SET NOT NULL;

UPDATE financial_goals SET user_id = '8af73c1a-b242-490a-9d7a-a7d1ec423b8b' WHERE user_id IS NULL;

ALTER TABLE financial_goals ALTER COLUMN user_id SET NOT NULL;

CREATE VIEW v_account_balances AS
    SELECT
        a.id,
        a.user_id,
        a.type,
        a.initial_balance +
        COALESCE(
            SUM(
                CASE
                    WHEN t.date >= a.initial_balance_date
                     AND t.deleted_at IS NULL
                    THEN t.amount
                    ELSE 0
                END
            ), 0
        ) AS current_balance
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
    GROUP BY
        a.id,
        a.user_id,
        a.type,
        a.initial_balance,
        a.initial_balance_date;;

CREATE VIEW v_operational_monthly AS
    SELECT
        user_id,
        date_trunc('month', date) AS month,
        SUM(CASE WHEN nature = 'INCOME' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN nature = 'EXPENSE' THEN -amount ELSE 0 END) AS total_expense,
        SUM(
            CASE
                WHEN nature IN ('INCOME','EXPENSE')
                THEN amount
                ELSE 0
            END
        ) AS net_result
    FROM transactions
    WHERE deleted_at IS NULL
    GROUP BY user_id, 2
    ORDER BY user_id, 2;;

CREATE VIEW v_savings_rate AS
    SELECT
        user_id,
        month,
        total_income,
        total_expense,
        net_result,
        CASE
            WHEN total_income > 0
            THEN ROUND(net_result / total_income, 4)
            ELSE 0
        END AS savings_rate
    FROM v_operational_monthly;;

CREATE VIEW v_burn_rate AS
    SELECT
        user_id,
        COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
    FROM v_operational_monthly
    WHERE month >= date_trunc('month', now()) - interval '3 months'
      AND month < date_trunc('month', now())
    GROUP BY user_id;;

CREATE VIEW v_net_worth AS
    SELECT
        user_id,
        COALESCE(SUM(current_balance), 0) AS net_worth
    FROM v_account_balances
    GROUP BY user_id;;

CREATE VIEW v_assets_liabilities AS
    SELECT
        user_id,
        CASE
            WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                THEN 'asset'
            WHEN type IN ('cartao_credito','outros_passivos')
                THEN 'liability'
            ELSE 'other'
        END AS classification,
        SUM(
            CASE
                WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                    THEN current_balance
                WHEN type IN ('cartao_credito','outros_passivos')
                    THEN -current_balance
                ELSE 0
            END
        ) AS total
    FROM v_account_balances
    GROUP BY user_id, classification;;

CREATE VIEW v_goal_progress AS
    SELECT
        g.id,
        g.user_id,
        g.name,
        g.target_amount,
        g.goal_type,
        g.start_date,
        g.target_date,
        nw.net_worth AS current_amount,
        CASE
            WHEN CURRENT_DATE < g.start_date THEN 0
            WHEN g.target_amount > 0 THEN ROUND((nw.net_worth / g.target_amount) * 100, 2)
            ELSE 0
        END AS percentage_completed,
        GREATEST(g.target_amount - nw.net_worth, 0) AS remaining_amount,
        GREATEST(g.target_date - CURRENT_DATE, 0) AS days_remaining,
        CASE
            WHEN CURRENT_DATE < g.start_date THEN TRUE
            WHEN CURRENT_DATE > g.target_date THEN nw.net_worth >= g.target_amount
            ELSE
                nw.net_worth >= (
                    g.target_amount * (
                        (CURRENT_DATE - g.start_date)::float /
                        NULLIF((g.target_date - g.start_date), 0)::float
                    )
                )
        END AS on_track
    FROM financial_goals g
    LEFT JOIN v_net_worth nw ON g.user_id = nw.user_id
    WHERE g.deleted_at IS NULL;;

CREATE VIEW v_financial_forecast AS
    WITH stats AS (
        SELECT
            u.id as user_id,
            COALESCE(nw.net_worth, 0) as current_net_worth,
            COALESCE((
                SELECT AVG(net_result) FROM v_operational_monthly om
                WHERE om.user_id = u.id
                  AND om.month >= date_trunc('month', now()) - interval '3 months'
                  AND om.month < date_trunc('month', now())
            ), 0) as avg_monthly_result
        FROM users u
        LEFT JOIN v_net_worth nw ON u.id = nw.user_id
    )
    SELECT
        user_id,
        current_net_worth,
        avg_monthly_result as avg_monthly_result_last_3m,
        current_net_worth + (avg_monthly_result * 3) as projected_3m,
        current_net_worth + (avg_monthly_result * 6) as projected_6m,
        current_net_worth + (avg_monthly_result * 12) as projected_12m,
        CASE
            WHEN avg_monthly_result < 0 THEN
                CASE
                    WHEN current_net_worth <= 0 THEN 0
                    ELSE ABS(current_net_worth / avg_monthly_result)
                END
            ELSE NULL
        END as months_until_zero,
        CASE
            WHEN avg_monthly_result < 0 THEN
                CASE
                    WHEN current_net_worth <= 0 THEN CURRENT_DATE
                    ELSE (date_trunc('day', now()) + (ABS(current_net_worth / avg_monthly_result) * interval '1 month'))::date
                END
            ELSE NULL
        END as projected_date_of_zero
    FROM stats;;

UPDATE alembic_version SET version_num='19e4f4905296' WHERE alembic_version.version_num = 'b650459b6327';

-- Running upgrade 19e4f4905296 -> 9a1b45a8252c

DROP VIEW IF EXISTS v_financial_forecast;;

DROP VIEW IF EXISTS v_goal_progress;;

DROP VIEW IF EXISTS v_assets_liabilities;;

DROP VIEW IF EXISTS v_net_worth;;

DROP VIEW IF EXISTS v_burn_rate;;

DROP VIEW IF EXISTS v_savings_rate;;

DROP VIEW IF EXISTS v_operational_monthly;;

DROP VIEW IF EXISTS v_account_balances;;

ALTER TABLE accounts ALTER COLUMN id TYPE UUID;

ALTER TABLE accounts ALTER COLUMN user_id TYPE UUID;

ALTER TABLE balance_history ALTER COLUMN id TYPE UUID;

ALTER TABLE balance_history ALTER COLUMN account_id TYPE UUID;

ALTER TABLE categories ALTER COLUMN id TYPE UUID;

ALTER TABLE categories ALTER COLUMN user_id TYPE UUID;

ALTER TABLE categories ADD CONSTRAINT uq_categories_name_user_id UNIQUE (name, user_id);

ALTER TABLE financial_goals ALTER COLUMN id TYPE UUID;

ALTER TABLE financial_goals ALTER COLUMN user_id TYPE UUID;

ALTER TABLE recurring_expenses ALTER COLUMN id TYPE UUID;

ALTER TABLE recurring_expenses ALTER COLUMN category_id TYPE UUID;

ALTER TABLE recurring_expenses ALTER COLUMN account_id TYPE UUID;

ALTER TABLE recurring_expenses ALTER COLUMN user_id TYPE UUID;

ALTER TABLE transactions ALTER COLUMN id TYPE UUID;

ALTER TABLE transactions ALTER COLUMN category_id TYPE UUID;

ALTER TABLE transactions ALTER COLUMN transfer_group_id TYPE UUID;

ALTER TABLE transactions ALTER COLUMN recurring_expense_id TYPE UUID;

ALTER TABLE transactions ALTER COLUMN user_id TYPE UUID;

ALTER TABLE users ALTER COLUMN id TYPE UUID;

UPDATE alembic_version SET version_num='9a1b45a8252c' WHERE alembic_version.version_num = '19e4f4905296';

-- Running upgrade 9a1b45a8252c -> c62d3bd6a69d

ALTER TABLE categories ALTER COLUMN user_id DROP NOT NULL;

UPDATE categories SET user_id = NULL WHERE is_system = true;

UPDATE alembic_version SET version_num='c62d3bd6a69d' WHERE alembic_version.version_num = '9a1b45a8252c';

COMMIT;

