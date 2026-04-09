import uuid
from sqlalchemy import Column, String, Enum, Boolean, ForeignKey, UniqueConstraint, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from app.core.database import Base
import enum

class CategoryType(str, enum.Enum):
    expense = "expense"
    income = "income"

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(Enum(CategoryType), nullable=False)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    monthly_budget = Column(Numeric(12, 2), nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User")
    overrides = relationship("CategoryOverride", back_populates="category", cascade="all, delete-orphan")

    # parent → subcategories (self-referential)
    subcategories = relationship(
        "Category",
        foreign_keys="[Category.parent_id]",
        backref=backref("parent", remote_side="[Category.id]", foreign_keys="[Category.parent_id]"),
        lazy="select",
    )

    __table_args__ = (
        UniqueConstraint('name', 'user_id', name='uq_categories_name_user_id'),
        Index('ix_categories_parent_id', 'parent_id'),
    )
