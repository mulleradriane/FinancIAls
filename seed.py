import random
import logging
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.user import User

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Listas para escolha randômica
EMOJIS = ['🐶', '🛒', '📱', '🍔', '💰', '💸', '🍕', '🛍️', '🐾', '🍎', '⚡', '🚗']
COLORS = [
    '#ef4444', # red-500
    '#f97316', # orange-500
    '#eab308', # yellow-500
    '#22c55e', # green-500
    '#3b82f6', # blue-500
    '#a855f7', # purple-500
    '#ec4899', # pink-500
    '#14b8a6', # teal-500
]

def seed_categories():
    db = SessionLocal()
    try:
        logger.info("🌱 Semeando Novas Categorias...")

        # Get admin user
        admin = db.query(User).filter_by(username="admin").first()
        if not admin:
            logger.error("❌ Usuário 'admin' não encontrado. Execute as migrações primeiro.")
            return

        categories_to_create = [
            {"name": "Salário", "type": "income"},
            {"name": "Pets", "type": "expense"},
            {"name": "Mercado", "type": "expense"},
            {"name": "Celular", "type": "expense"},
            {"name": "Comidas", "type": "expense"}
        ]

        for cat_data in categories_to_create:
            # Verifica se já existe para este usuário
            exists = db.query(Category).filter_by(name=cat_data["name"], user_id=admin.id).first()
            if not exists:
                new_category = Category(
                    name=cat_data["name"],
                    type=cat_data["type"],
                    icon=random.choice(EMOJIS),
                    color=random.choice(COLORS),
                    user_id=admin.id
                )
                db.add(new_category)
                logger.info(f"✅ Categoria '{cat_data['name']}' ({cat_data['type']}) criada com cor e ícone aleatórios!")
            else:
                logger.info(f"ℹ️ Categoria '{cat_data['name']}' já existe para o usuário admin.")

        db.commit()
        logger.info("✨ Processo de seed finalizado!")

    except Exception as e:
        logger.error(f"❌ Erro ao criar categorias: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_categories()
