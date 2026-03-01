import uuid
import csv
import io
import re
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from app.crud.transaction import transaction as crud_transaction
from app.models.transaction import TransactionNature, Transaction as TransactionModel
from app.models.category import Category, CategoryType
from app.schemas.transaction import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    UnifiedTransactionResponse,
    UnifiedTransactionCreate,
    TransferCreate
)
from app.schemas.import_csv import ImportPreviewRow, ImportPreviewResponse, ImportConfirmRequest
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.transaction_service import create_unified_transaction

router = APIRouter()

@router.post("/import-csv/preview", response_model=ImportPreviewResponse)
def preview_import_csv(
    file: UploadFile = File(...),
    account_id: UUID = Form(...),
    file_type: str = Form(...), # "conta" ou "cartao"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = file.file.read().decode("utf-8-sig")
    file.file.seek(0)

    to_import = []
    duplicates = []
    errors = []

    # Get user categories for fallback and matching
    user_categories = db.scalars(
        select(Category).filter(
            or_(Category.user_id == current_user.id, Category.is_system == True)
        )
    ).all()

    def find_category_name(csv_cat_name):
        if not csv_cat_name:
            return "Outros"
        for cat in user_categories:
            if cat.name.lower() == csv_cat_name.lower():
                return cat.name
        return "Outros"

    if file_type == "conta":
        # data,titulo,entrada,saida,categoria,descricao
        reader = csv.DictReader(io.StringIO(content))
        for row_idx, row in enumerate(reader, start=2):
            try:
                dt_str = row.get("data")
                titulo = row.get("titulo", "")
                entrada_str = row.get("entrada", "").replace(".", "").replace(",", ".")
                saida_str = row.get("saida", "").replace(".", "").replace(",", ".")
                categoria_csv = row.get("categoria", "")
                descricao_csv = row.get("descricao", "")

                if not dt_str:
                    errors.append({"row_index": row_idx, "message": "Data ausente"})
                    continue

                dt = datetime.strptime(dt_str, "%d/%m/%Y").date()
                entrada = float(entrada_str) if entrada_str else 0.0
                saida = float(saida_str) if saida_str else 0.0

                if entrada > 0 and saida > 0:
                    errors.append({"row_index": row_idx, "message": "Entrada e Saída preenchidas simultaneamente"})
                    continue

                if entrada == 0 and saida == 0:
                    continue

                nature = "INCOME" if entrada > 0 else "EXPENSE"
                amount = entrada if entrada > 0 else -saida

                # Installment detection
                is_installment = False
                installment_info = None
                match = re.search(r'(\d+/\d+)', titulo)
                if match:
                    is_installment = True
                    installment_info = match.group(1)

                parsed_row = ImportPreviewRow(
                    row_index=row_idx,
                    date=dt,
                    description=titulo,
                    amount=amount,
                    nature=nature,
                    categoria=find_category_name(categoria_csv),
                    is_installment=is_installment,
                    installment_info=installment_info
                )

                # Duplicate check - Including nature
                existing = db.execute(
                    select(TransactionModel.id)
                    .filter(
                        TransactionModel.account_id == account_id,
                        TransactionModel.date == parsed_row.date,
                        func.abs(TransactionModel.amount) == abs(parsed_row.amount),
                        TransactionModel.description == parsed_row.description,
                        TransactionModel.nature == parsed_row.nature,
                        TransactionModel.deleted_at == None
                    )
                ).scalar()

                if existing:
                    parsed_row.is_duplicate = True
                    parsed_row.existing_transaction_id = existing
                    duplicates.append(parsed_row)
                else:
                    to_import.append(parsed_row)

            except Exception as e:
                errors.append({"row_index": row_idx, "message": str(e)})

    elif file_type == "cartao":
        # C6 format uses semicolon
        reader = csv.DictReader(io.StringIO(content), delimiter=';')
        for row_idx, row in enumerate(reader, start=2):
            try:
                dt_str = row.get("Data de Compra")
                desc_csv = row.get("Descrição")
                categoria_csv = row.get("Categoria")
                parcela_csv = row.get("Parcela")
                valor_str = row.get("Valor (em R$)", "").replace(".", "").replace(",", ".")

                if not dt_str or not valor_str:
                    continue

                dt = datetime.strptime(dt_str, "%d/%m/%Y").date()
                amount_raw = float(valor_str)

                if amount_raw == 0:
                    continue

                nature = "EXPENSE"
                amount = -amount_raw
                is_transfer = False

                if amount_raw < 0:
                    desc_lower = desc_csv.lower() if desc_csv else ""
                    payment_keywords = ["inclusão de pagamento", "pagamento", "pagto", "payment"]
                    if any(kw in desc_lower for kw in payment_keywords):
                        nature = "TRANSFER"
                        amount = abs(amount_raw)
                        is_transfer = True
                    else:
                        nature = "INCOME"
                        amount = abs(amount_raw)

                description = desc_csv if desc_csv else categoria_csv

                is_installment = False
                installment_info = None
                if parcela_csv and '/' in parcela_csv:
                    is_installment = True
                    installment_info = parcela_csv

                parsed_row = ImportPreviewRow(
                    row_index=row_idx,
                    date=dt,
                    description=description,
                    amount=amount,
                    nature=nature,
                    categoria=find_category_name(categoria_csv),
                    is_installment=is_installment,
                    installment_info=installment_info,
                    is_transfer=is_transfer
                )

                # Duplicate check - Including nature
                existing = db.execute(
                    select(TransactionModel.id)
                    .filter(
                        TransactionModel.account_id == account_id,
                        TransactionModel.date == parsed_row.date,
                        func.abs(TransactionModel.amount) == abs(parsed_row.amount),
                        TransactionModel.description == parsed_row.description,
                        TransactionModel.nature == parsed_row.nature,
                        TransactionModel.deleted_at == None
                    )
                ).scalar()

                if existing:
                    parsed_row.is_duplicate = True
                    parsed_row.existing_transaction_id = existing
                    duplicates.append(parsed_row)
                else:
                    to_import.append(parsed_row)

            except Exception as e:
                errors.append({"row_index": row_idx, "message": str(e)})

    return {
        "to_import": to_import,
        "duplicates": duplicates,
        "errors": errors,
        "file_type": file_type
    }

@router.post("/import-csv/confirm")
def confirm_import_csv(
    request: ImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        categories = db.scalars(
            select(Category).filter(
                or_(Category.user_id == current_user.id, Category.is_system == True)
            )
        ).all()

        transactions_to_add = []

        for row in request.rows:
            target_nature_type = CategoryType.income if row.nature in ["INCOME", "TRANSFER"] else CategoryType.expense
            category_id = None

            # Match
            for cat in categories:
                if cat.name.lower() == row.category_name.lower() and cat.type == target_nature_type:
                    category_id = cat.id
                    break

            if not category_id:
                for cat in categories:
                    if cat.name.lower() == "outros" and cat.type == target_nature_type:
                        category_id = cat.id
                        break

            if not category_id:
                new_cat = Category(
                    name="Outros",
                    type=target_nature_type,
                    icon="❓",
                    color="#64748b",
                    is_system=False,
                    user_id=current_user.id
                )
                db.add(new_cat)
                db.flush()
                category_id = new_cat.id
                categories.append(new_cat)

            new_tx = TransactionModel(
                description=row.description,
                amount=row.amount,
                nature=row.nature,
                date=row.date,
                account_id=request.account_id,
                user_id=current_user.id,
                category_id=category_id
            )
            transactions_to_add.append(new_tx)

        db.add_all(transactions_to_add)
        db.commit()
        return {"imported": len(transactions_to_add)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao importar transações: {str(e)}")


@router.post("/", response_model=Transaction)
def create_transaction(
    obj_in: UnifiedTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_unified_transaction(db, obj_in=obj_in, user_id=current_user.id)

@router.post("/transfer")
def create_transfer_transaction(
    obj_in: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transfer_group_id = uuid.uuid4()

    # 1. SAÍDA (Outflow)
    outflow = crud_transaction.model(
        description=obj_in.description,
        amount=-abs(obj_in.amount),
        date=obj_in.date,
        account_id=obj_in.from_account_id,
        nature=TransactionNature.TRANSFER,
        transfer_group_id=transfer_group_id,
        user_id=current_user.id,
        category_id=None
    )

    # 2. ENTRADA (Inflow)
    inflow = crud_transaction.model(
        description=obj_in.description,
        amount=abs(obj_in.amount),
        date=obj_in.date,
        account_id=obj_in.to_account_id,
        nature=TransactionNature.TRANSFER,
        transfer_group_id=transfer_group_id,
        user_id=current_user.id,
        category_id=None
    )

    db.add(outflow)
    db.add(inflow)
    db.commit()

    return {
        "message": "Transferência registrada com sucesso",
        "transfer_group_id": str(transfer_group_id)
    }

@router.get("/", response_model=List[UnifiedTransactionResponse])
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    account_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_transaction.get_unified(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        account_id=account_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        search=search
    )

@router.get("/unique-descriptions", response_model=List[str])
def get_unique_descriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_transaction.get_unique_descriptions(db, user_id=current_user.id)

@router.get("/suggestion", response_model=Optional[Transaction])
def get_suggestion(
    description: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_transaction.get_suggestion(db, description=description, user_id=current_user.id)

@router.get("/{id}", response_model=Transaction)
def read_transaction(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_transaction.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_obj

@router.put("/{id}", response_model=Transaction)
def update_transaction(
    id: UUID,
    obj_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_transaction.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return crud_transaction.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Transaction)
def delete_transaction(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_transaction.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return crud_transaction.remove_by_user(db, id=id, user_id=current_user.id)
