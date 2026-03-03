import sys
import os

# Add root directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import SessionLocal

def main():
    db = SessionLocal()
    try:
        print("🔍 Buscando transações de INCOME com amount negativo...")
        query_check = text("""
            SELECT id, description, amount, nature, recurring_expense_id
            FROM transactions
            WHERE nature = 'INCOME' AND amount < 0
            LIMIT 20;
        """)
        results = db.execute(query_check).all()

        if not results:
            print("✅ Nenhuma transação de INCOME negativa encontrada.")
        else:
            print(f"⚠️ Encontradas {len(results)} transações (limite de 20):")
            for row in results:
                print(f"ID: {row.id} | Desc: {row.description} | Amount: {row.amount} | Nature: {row.nature} | Recurring ID: {row.recurring_expense_id}")

            print("\n🚀 Corrigindo transações...")
            update_query = text("""
                UPDATE transactions
                SET amount = ABS(amount)
                WHERE nature = 'INCOME'
                AND amount < 0;
            """)
            result_update = db.execute(update_query)
            db.commit()
            print(f"✅ {result_update.rowcount} transações atualizadas com sucesso!")

        print("\n🧐 Verificação final (buscando transações restantes)...")
        results_final = db.execute(query_check).all()
        if not results_final:
            print("🎉 Verificação bem-sucedida: 0 transações negativas de INCOME restantes.")
        else:
            print(f"❌ Erro: Ainda existem {len(results_final)} transações de INCOME negativas!")

    except Exception as e:
        print(f"❌ Erro durante a execução: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
