from sqlalchemy import text
from app.core.database import SessionLocal

def main():
    db = SessionLocal()
    try:
        result = db.execute(
            text("""
            UPDATE transactions
            SET amount = ABS(amount)
            WHERE nature = 'INCOME'
            AND amount < 0
            AND recurring_expense_id IS NOT NULL;
            """)
        )
        db.commit()
        print(f"✅ {result.rowcount} transações corrigidas!")
    except Exception as e:
        print(f"❌ Erro ao corrigir transações: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
