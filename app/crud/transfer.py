from app.crud.base import CRUDBase
from app.models.transfer import Transfer
from app.schemas.transfer import TransferCreate, TransferUpdate

class CRUDTransfer(CRUDBase[Transfer, TransferCreate, TransferUpdate]):
    pass

transfer = CRUDTransfer(Transfer)
