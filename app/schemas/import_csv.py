from pydantic import BaseModel, condecimal
from uuid import UUID
from datetime import date
from typing import List, Optional

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
    is_installment: bool = False
    installment_info: Optional[str] = None
    is_transfer: bool = False
    # Recurring match detected in preview
    is_recurring_match: bool = False
    recurring_description: Optional[str] = None
    recurring_similarity: Optional[float] = None

class ImportPreviewResponse(BaseModel):
    to_import: List[ImportPreviewRow]
    duplicates: List[ImportPreviewRow]
    errors: List[dict]
    file_type: str

class ImportConfirmRow(BaseModel):
    date: date
    description: str
    amount: AmountDecimal
    nature: str
    category_name: str

class ImportConfirmRequest(BaseModel):
    account_id: UUID
    rows: List[ImportConfirmRow]
