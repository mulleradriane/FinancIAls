from pydantic import BaseModel, condecimal
from uuid import UUID
from datetime import date
from typing import List, Optional

# Aligned with Numeric(12,2)
AmountDecimal = condecimal(max_digits=12, decimal_places=2)

class ImportPreviewRow(BaseModel):
    row_index: int
    date: date
    description: str
    amount: AmountDecimal
    nature: str  # "INCOME", "EXPENSE", "TRANSFER"
    categoria: str
    is_duplicate: bool = False
    existing_transaction_id: Optional[UUID] = None
    is_installment: bool = False      # True se detectou padrão X/Y no título
    installment_info: Optional[str] = None  # ex: "2/12"
    is_transfer: bool = False         # True se detectado como pagamento de fatura

class ImportPreviewResponse(BaseModel):
    to_import: List[ImportPreviewRow]
    duplicates: List[ImportPreviewRow]
    errors: List[dict]
    file_type: str  # "conta" ou "cartao"

class ImportConfirmRow(BaseModel):
    date: date
    description: str
    amount: AmountDecimal
    nature: str
    category_name: str

class ImportConfirmRequest(BaseModel):
    account_id: UUID
    rows: List[ImportConfirmRow]
