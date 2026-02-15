from app.crud.base import CRUDBase
from app.models.income import Income
from app.schemas.income import IncomeCreate, IncomeUpdate

class CRUDIncome(CRUDBase[Income, IncomeCreate, IncomeUpdate]):
    pass

income = CRUDIncome(Income)
