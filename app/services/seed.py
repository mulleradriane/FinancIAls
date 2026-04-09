"""Seeds default system categories if they don't exist yet."""
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.category import Category, CategoryType

SYSTEM_CATEGORIES = [
    # ── Despesas ───────────────────────────────────────────────���─────────────
    {"name": "Alimentação",          "type": CategoryType.expense, "icon": "🍔", "color": "#f97316"},
    {"name": "Moradia",              "type": CategoryType.expense, "icon": "🏠", "color": "#8b5cf6"},
    {"name": "Transporte",           "type": CategoryType.expense, "icon": "🚗", "color": "#3b82f6"},
    {"name": "Saúde",                "type": CategoryType.expense, "icon": "💊", "color": "#ef4444"},
    {"name": "Educação",             "type": CategoryType.expense, "icon": "🎓", "color": "#06b6d4"},
    {"name": "Lazer",                "type": CategoryType.expense, "icon": "🎭", "color": "#ec4899"},
    {"name": "Vestuário",            "type": CategoryType.expense, "icon": "👗", "color": "#a855f7"},
    {"name": "Contas & Utilidades",  "type": CategoryType.expense, "icon": "💡", "color": "#eab308"},
    {"name": "Assinaturas",          "type": CategoryType.expense, "icon": "📱", "color": "#64748b"},
    {"name": "Outros",               "type": CategoryType.expense, "icon": "❓", "color": "#94a3b8"},
    # ── Receitas ────────���──────────────────��─────────────────────────────────
    {"name": "Salário",              "type": CategoryType.income,  "icon": "💼", "color": "#22c55e"},
    {"name": "Freelance",            "type": CategoryType.income,  "icon": "💻", "color": "#10b981"},
    {"name": "Investimentos",        "type": CategoryType.income,  "icon": "📈", "color": "#06b6d4"},
    {"name": "Outros",               "type": CategoryType.income,  "icon": "💰", "color": "#94a3b8"},
]


def seed_system_categories(db: Session) -> None:
    """Insert system categories that don't exist yet. Safe to call on every startup."""
    existing_names = set(
        db.scalars(
            select(Category.name).filter(Category.is_system == True)
        ).all()
    )

    to_add = [
        Category(
            name=cat["name"],
            type=cat["type"],
            icon=cat["icon"],
            color=cat["color"],
            is_system=True,
            user_id=None,
        )
        for cat in SYSTEM_CATEGORIES
        if cat["name"] not in existing_names
    ]

    if to_add:
        db.add_all(to_add)
        db.commit()
