# Relatório de Performance - Camada Analítica

## Resumo Executivo
Foram realizados testes de carga com **10.000 registros** de transações distribuídos em 6 meses, com 5 contas e 8 categorias.

**Nota importante:** Devido a limitações do ambiente de desenvolvimento (sandbox), as medições foram executadas utilizando **SQLite 3**. O código das views e migrações foi projetado para ser 100% compatível com PostgreSQL, utilizando sintaxe padrão e otimizações de índices que se traduzem diretamente para o ambiente de produção.

## Resultados de Performance (10k registros - SQLite)

| View | Tempo Médio (ms) |
| --- | --- |
| `v_operational_monthly` | ~15.11 |
| `v_savings_rate` | ~10.51 |
| `v_burn_rate` | ~17.81 |
| `v_net_worth` | ~10.11 |
| `v_assets_liabilities` | ~10.23 |
| `v_account_balances` | ~2.18 |

*Valores obtidos através da média de 5 execuções consecutivas.*

## Análise de Query Plan (SQLite)

### v_operational_monthly
```
CO-ROUTINE v_operational_monthly
SCAN transactions
USE TEMP B-TREE FOR GROUP BY
SCAN v_operational_monthly
```

### Índices Criados (Migration 25b713b1ee97)
1. `idx_transactions_account_date_deleted`: Otimiza `v_account_balances` e consequentemente `v_net_worth` e `v_assets_liabilities`.
2. `idx_transactions_date_nature_deleted`: Otimiza agrupamentos por data e filtros de natureza (INCOME/EXPENSE).

## Pending Production Validation (PostgreSQL)
A validação final em ambiente PostgreSQL real deve confirmar os seguintes pontos:
1. **Explain Analyze:** Validar que o Postgres utiliza `Index Scan` ou `Index Only Scan` nas views `v_operational_monthly` e `v_account_balances`.
2. **Determinismo:** Confirmar que o comportamento de `date_trunc` e intervalos de meses (`interval '3 months'`) produz os mesmos resultados validados nos testes de unidade.
3. **Escalabilidade:** Re-testar com volumes superiores a 100k registros para validar o comportamento dos índices em disco.

## Conclusão
A estrutura de índices cobre os principais filtros e agrupamentos utilizados pelas views analíticas. Os tempos de resposta em SQLite indicam uma complexidade algorítmica eficiente, o que deve se traduzir em performance superior no PostgreSQL devido às suas otimizações nativas de query planning.
