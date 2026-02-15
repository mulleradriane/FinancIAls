# FinancIAls - Backend Financeiro Pessoal

Este é um backend de finanças pessoais desenvolvido com FastAPI, SQLAlchemy, PostgreSQL e Alembic.

## Tecnologias Utilizadas

- **Linguagem:** Python 3.10+
- **Framework:** FastAPI
- **ORM:** SQLAlchemy (com suporte a UUID e Decimal)
- **Banco de Dados:** PostgreSQL
- **Migrações:** Alembic
- **Validação de Dados:** Pydantic v2

## Estrutura do Projeto

```
app/
  core/         # Configurações e conexão com banco de dados
  models/       # Modelos SQLAlchemy
  schemas/      # Esquemas Pydantic
  crud/         # Operações CRUD genéricas e específicas
  routers/      # Endpoints da API
  services/     # Lógica de negócio (resumos mensais e anuais)
  main.py       # Ponto de entrada da aplicação
alembic/        # Configurações e versões das migrações
```

## Configuração Local

### 1. Pré-requisitos

- Python 3.10 ou superior
- PostgreSQL rodando localmente ou via Docker

### 2. Instalação

Clone o repositório e instale as dependências:

```bash
pip install -r requirements.txt
```

### 3. Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o `.env` com as credenciais do seu banco de dados PostgreSQL:

```env
DATABASE_URL=postgresql+psycopg2://usuario:senha@localhost:5432/nome_do_banco
```

### 4. Migrações

Execute as migrações do Alembic para criar as tabelas no banco de dados:

```bash
alembic upgrade head
```

### 5. Executando a Aplicação

Inicie o servidor uvicorn:

```bash
uvicorn app.main:app --reload
```

A API estará disponível em `http://127.0.0.1:8000`.
A documentação interativa (Swagger UI) pode ser acessada em `http://127.0.0.1:8000/docs`.

## Funcionalidades Principais

- **Categorias:** Gerenciamento de categorias de receitas e despesas.
- **Transações:** Registro de movimentações financeiras com suporte a Soft Delete.
- **Despesas Recorrentes:** Planejamento de gastos mensais ou anuais.
- **Receitas:** Registro de ganhos (salários, extras).
- **Investimentos:** Controle de aportes financeiros.
- **Resumos:**
  - `GET /summary/month`: Total consolidado por mês e ano, incluindo despesas por categoria.
  - `GET /summary/year`: Total consolidado anual.

## Boas Práticas Adotadas

- Uso de **UUID** como chave primária para todas as entidades.
- Uso de **Decimal** para valores monetários para evitar erros de precisão de ponto flutuante.
- Estrutura modular e organizada por responsabilidades.
- Tipagem estática com Python Type Hints.
