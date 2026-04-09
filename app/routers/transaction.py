from __future__ import annotations
import uuid
from decimal import Decimal
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from app.crud.transaction import transaction as crud_transaction
from app.crud.account import account as crud_account
from app.models.transaction import TransactionNature, Transaction as TransactionModel
from app.models.category import Category, CategoryType
from app.schemas.transaction import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    UnifiedTransactionResponse,
    UnifiedTransactionCreate,
    TransferCreate,
    TransactionListResponse
)
from app.schemas.import_csv import ImportPreviewRow, ImportPreviewResponse, ImportConfirmRequest
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.transaction_service import create_unified_transaction
from app.services.similarity_service import detect_recurring_matches, check_recurring_for_preview
from app.services.import_service import (
    parse_csv_ronromia, parse_csv_c6, parse_ofx, parse_pdf, detect_file_format
)

router = APIRouter()

@router.post("/import-csv/preview", response_model=ImportPreviewResponse)
def preview_import_csv(
    file: UploadFile = File(...),
    account_id: UUID = Form(...),
    file_type: str = Form(...),   # "conta" | "cartao" | "ofx" | "pdf"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_content = file.file.read()

    acc = crud_account.get_by_user(db, id=account_id, user_id=current_user.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    # Auto-detect OFX / PDF by file extension (overrides file_type from frontend)
    detected = detect_file_format(file.filename or '', file.content_type or '')
    if detected in ('ofx', 'pdf'):
        file_type = detected

    # ── Parse ──────────────────────────────────────────────────────────────────
    errors: list = []
    try:
        if file_type == 'ofx':
            text = raw_content.decode('utf-8-sig', errors='replace')
            parsed_rows, errors = parse_ofx(text)
        elif file_type == 'pdf':
            parsed_rows, parse_errors = parse_pdf(raw_content)
            errors.extend(parse_errors)
        elif file_type == 'cartao':
            text = raw_content.decode('utf-8-sig', errors='replace')
            parsed_rows, errors = parse_csv_c6(text)
        else:  # conta – Ronromia template
            text = raw_content.decode('utf-8-sig', errors='replace')
            parsed_rows, errors = parse_csv_ronromia(text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # ── Categories lookup ──────────────────────────────────────────────────────
    user_categories = db.scalars(
        select(Category).filter(
            or_(Category.user_id == current_user.id, Category.is_system == True)
        )
    ).all()

    def find_category_name(name: str) -> str:
        if not name:
            return "Outros"
        for cat in user_categories:
            if cat.name.lower() == name.lower():
                return cat.name
        return "Outros"

    # ── Recurring match check (before committing anything) ─────────────────────
    recurring_map = check_recurring_for_preview(db, current_user.id, parsed_rows)

    # ── Duplicate check + assemble preview rows ────────────────────────────────
    to_import: list = []
    duplicates: list = []

    for row in parsed_rows:
        preview_row = ImportPreviewRow(
            row_index=row.row_index,
            date=row.date,
            description=row.description,
            amount=row.amount,
            nature=row.nature,
            categoria=find_category_name(row.categoria),
            is_installment=row.is_installment,
            installment_info=row.installment_info,
            is_transfer=row.is_transfer,
        )

        # Recurring match info
        if row.row_index in recurring_map:
            rm = recurring_map[row.row_index]
            preview_row.is_recurring_match = True
            preview_row.recurring_description = rm['recurring_description']
            preview_row.recurring_similarity = rm['similarity']

        # Exact duplicate in DB?
        existing = db.execute(
            select(TransactionModel.id).filter(
                TransactionModel.account_id == account_id,
                TransactionModel.date == preview_row.date,
                func.abs(TransactionModel.amount) == abs(preview_row.amount),
                TransactionModel.description == preview_row.description,
                TransactionModel.nature == preview_row.nature,
                TransactionModel.deleted_at == None,
            )
        ).scalar()

        if existing:
            preview_row.is_duplicate = True
            preview_row.existing_transaction_id = existing
            duplicates.append(preview_row)
        else:
            to_import.append(preview_row)

    return {
        "to_import": to_import,
        "duplicates": duplicates,
        "errors": errors,
        "file_type": file_type,
    }

@router.post("/import-csv/confirm")
def confirm_import_csv(
    request: ImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ownership check
    acc = crud_account.get_by_user(db, id=request.account_id, user_id=current_user.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

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

        # Update balance history for affected account
        balance = crud_account.get_balance(db, request.account_id)
        crud_account._record_history(db, request.account_id, balance)

        # Detect matches with recurring expenses
        recurring_matches = detect_recurring_matches(db, current_user.id, transactions_to_add)

        return {
            "imported": len(transactions_to_add),
            "recurring_matches": recurring_matches
        }
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

    # Update balance history for affected accounts
    for acc_id in [obj_in.from_account_id, obj_in.to_account_id]:
        balance = crud_account.get_balance(db, acc_id)
        crud_account._record_history(db, acc_id, balance)

    return {
        "message": "Transferência registrada com sucesso",
        "transfer_group_id": str(transfer_group_id)
    }

@router.get("/", response_model=TransactionListResponse)
def read_transactions(
    skip: int = 0,
    limit: int = 50,
    account_id: list[UUID] | None = Query(None),
    category_id: list[UUID] | None = Query(None),
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    include_future: bool = False,
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
        search=search,
        include_future=include_future
    )

@router.get("/descriptions/", response_model=list[str])
def get_descriptions(
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
