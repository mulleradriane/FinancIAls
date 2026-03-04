import sys
import os
from sqlalchemy import select

# Adiciona o diretório raiz ao path para importar os módulos do app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.account import Account
from app.crud.account import account as crud_account

def recalculate_history():
    db = SessionLocal()
    try:
        # Busca todas as contas de todos os usuários
        accounts = db.scalars(select(Account)).all()
        print(f"Encontradas {len(accounts)} contas para recalcular.")

        for acc in accounts:
            try:
                # Calcula o saldo atual da conta
                balance = crud_account.get_balance(db, acc.id)
                # Registra no balance_history para a data de hoje
                crud_account._record_history(db, acc.id, balance)
                print(f"Conta '{acc.name}' (ID: {acc.id}) recalculada. Saldo: {balance}")
            except Exception as e:
                print(f"Erro ao recalcular conta {acc.id}: {e}")

        db.commit()
        print("Recalculo concluído com sucesso.")
    except Exception as e:
        print(f"Erro geral durante o recalculo: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    recalculate_history()
