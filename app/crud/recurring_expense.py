from app.crud.base import CRUDBase
from app.models.recurring_expense import RecurringExpense
from app.schemas.recurring_expense import RecurringExpenseCreate, RecurringExpenseUpdate

class CRUDRecurringExpense(CRUDBase[RecurringExpense, RecurringExpenseCreate, RecurringExpenseUpdate]):
    pass

recurring_expense = CRUDRecurringExpense(RecurringExpense)
