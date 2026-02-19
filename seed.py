import logging
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.account import Account

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_data():
    db = SessionLocal()
    try:
        # --- 1. Criar Categorias Padrão ---
        logger.info("🌱 Semeando Categorias...")
        
        expenses = [
            "Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", 
            "Educação", "Assinaturas", "Compras", "Pets", "Mercado", "Telecom", "Outros"
        ]
        for name in expenses:
            exists = db.query(Category).filter_by(name=name, type="expense").first()
            if not exists:
                cat = Category(name=name, type="expense") 
                db.add(cat)
                logger.info(f"✅ Categoria Despesa criada: {name}")

        incomes = [
            "Salário", "Freelance", "Investimentos", "Presente", "Ajuste de Saldo"
        ]
        for name in incomes:
            exists = db.query(Category).filter_by(name=name, type="income").first()
            if not exists:
                cat = Category(name=name, type="income")
                db.add(cat)
                logger.info(f"✅ Categoria Receita criada: {name}")
        
        db.commit()

        # --- 2. Criar Conta Padrão (Carteira) ---
        logger.info("🌱 Verificando Conta Padrão...")
        wallet = db.query(Account).filter_by(name="Carteira").first()
        if not wallet:
            # CORREÇÃO FINAL: Passando APENAS nome e tipo.
            # O saldo será zero por padrão ou calculado via transações.
            wallet = Account(
                name="Carteira", 
                type="wallet"
            )
            db.add(wallet)
            db.commit()
            logger.info("✅ Conta 'Carteira' criada com sucesso.")
        else:
            logger.info("ℹ️ Conta 'Carteira' já existe.")
        
        logger.info("✨ Seed concluído com sucesso!")

    except Exception as e:
        logger.error(f"❌ Erro ao rodar seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()