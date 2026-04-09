"""Parsers for bank import formats: CSV (Ronromia, C6), OFX, PDF."""
from __future__ import annotations
import re
import io
import csv
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from typing import List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ParsedRow:
    row_index: int
    date: date
    description: str
    amount: Decimal          # positive = income, negative = expense
    nature: str              # INCOME, EXPENSE, TRANSFER
    categoria: str = "Outros"
    is_installment: bool = False
    installment_info: Optional[str] = None
    is_transfer: bool = False


# ── CSV: Ronromia template ─────────────────────────────────────────────────────

def parse_csv_ronromia(content: str) -> Tuple[List[ParsedRow], List[dict]]:
    """data,titulo,entrada,saida,categoria,descricao"""
    rows: List[ParsedRow] = []
    errors: List[dict] = []
    reader = csv.DictReader(io.StringIO(content))

    for row_idx, row in enumerate(reader, start=2):
        try:
            dt_str = row.get("data", "").strip()
            titulo = row.get("titulo", "").strip()
            entrada_str = row.get("entrada", "").replace(".", "").replace(",", ".")
            saida_str = row.get("saida", "").replace(".", "").replace(",", ".")
            categoria_csv = row.get("categoria", "").strip()

            if not dt_str:
                errors.append({"row_index": row_idx, "message": "Data ausente"})
                continue

            dt = datetime.strptime(dt_str, "%d/%m/%Y").date()
            entrada = Decimal(entrada_str) if entrada_str else Decimal(0)
            saida = Decimal(saida_str) if saida_str else Decimal(0)

            if entrada > 0 and saida > 0:
                errors.append({"row_index": row_idx, "message": "Entrada e Saída preenchidas simultaneamente"})
                continue
            if entrada == 0 and saida == 0:
                continue

            nature = "INCOME" if entrada > 0 else "EXPENSE"
            amount = entrada if entrada > 0 else -saida

            is_installment = False
            installment_info = None
            m = re.search(r'(\d+/\d+)', titulo)
            if m:
                is_installment = True
                installment_info = m.group(1)

            rows.append(ParsedRow(
                row_index=row_idx, date=dt, description=titulo, amount=amount,
                nature=nature, categoria=categoria_csv or "Outros",
                is_installment=is_installment, installment_info=installment_info,
            ))
        except InvalidOperation:
            errors.append({"row_index": row_idx, "message": "Valor inválido em entrada/saída"})
        except Exception as e:
            errors.append({"row_index": row_idx, "message": str(e)})

    return rows, errors


# ── CSV: C6 Bank credit card ───────────────────────────────────────────────────

def parse_csv_c6(content: str) -> Tuple[List[ParsedRow], List[dict]]:
    """Semicolon-delimited C6 Bank credit card CSV."""
    rows: List[ParsedRow] = []
    errors: List[dict] = []
    reader = csv.DictReader(io.StringIO(content), delimiter=';')

    for row_idx, row in enumerate(reader, start=2):
        try:
            dt_str = row.get("Data de Compra", "").strip()
            desc_csv = row.get("Descrição", "").strip()
            categoria_csv = row.get("Categoria", "").strip()
            parcela_csv = row.get("Parcela", "").strip()
            valor_str = row.get("Valor (em R$)", "").replace(".", "").replace(",", ".").strip()

            if not dt_str or not valor_str:
                continue

            dt = datetime.strptime(dt_str, "%d/%m/%Y").date()
            amount_raw = Decimal(valor_str)
            if amount_raw == 0:
                continue

            nature = "EXPENSE"
            amount = -amount_raw
            is_transfer = False

            if amount_raw < 0:
                desc_lower = desc_csv.lower()
                if any(kw in desc_lower for kw in ["inclusão de pagamento", "pagamento", "pagto", "payment"]):
                    nature = "TRANSFER"
                    amount = abs(amount_raw)
                    is_transfer = True
                else:
                    nature = "INCOME"
                    amount = abs(amount_raw)

            is_installment = False
            installment_info = None
            if parcela_csv and '/' in parcela_csv:
                is_installment = True
                installment_info = parcela_csv

            rows.append(ParsedRow(
                row_index=row_idx, date=dt, description=desc_csv or categoria_csv,
                amount=amount, nature=nature, categoria=categoria_csv or "Outros",
                is_installment=is_installment, installment_info=installment_info,
                is_transfer=is_transfer,
            ))
        except InvalidOperation:
            errors.append({"row_index": row_idx, "message": "Valor inválido"})
        except Exception as e:
            errors.append({"row_index": row_idx, "message": str(e)})

    return rows, errors


# ── OFX / QFX ─────────────────────────────────────────────────────────────────

def parse_ofx(content: str) -> Tuple[List[ParsedRow], List[dict]]:
    """
    Handles both SGML (old format, no closing tags) and XML (new format).
    Supported by Itaú, Bradesco, Santander, BB, Caixa, Inter, Nubank conta.
    """
    rows: List[ParsedRow] = []
    errors: List[dict] = []

    content = content.replace('\r\n', '\n').replace('\r', '\n')

    # Split on <STMTTRN> to get individual transaction blocks
    parts = re.split(r'<STMTTRN>', content, flags=re.IGNORECASE)
    blocks = parts[1:]  # everything before first tag is the header

    INCOME_TYPES = {'CREDIT', 'DEP', 'DIRECTDEP', 'INT', 'DIV', 'REFUND'}

    for row_idx, block in enumerate(blocks, start=1):
        try:
            def get_tag(tag: str) -> Optional[str]:
                m = re.search(rf'<{tag}>\s*([^\n<]+)', block, re.IGNORECASE)
                return m.group(1).strip() if m else None

            trntype = (get_tag('TRNTYPE') or 'DEBIT').upper()
            dtposted = get_tag('DTPOSTED') or get_tag('DTUSER')
            trnamt_str = get_tag('TRNAMT')
            memo = get_tag('MEMO') or get_tag('NAME') or ''

            if not dtposted or not trnamt_str:
                continue

            # Handle "20240101120000[-3:BRT]" → "20240101"
            dt_clean = re.sub(r'[\[\-\+].*', '', dtposted)[:8]
            try:
                dt = datetime.strptime(dt_clean, '%Y%m%d').date()
            except ValueError:
                errors.append({"row_index": row_idx, "message": f"Data inválida: {dtposted}"})
                continue

            try:
                amount = Decimal(trnamt_str.replace(',', '.'))
            except InvalidOperation:
                errors.append({"row_index": row_idx, "message": f"Valor inválido: {trnamt_str}"})
                continue

            if trntype in INCOME_TYPES or amount > 0:
                nature = 'INCOME'
                amount = abs(amount)
            else:
                nature = 'EXPENSE'
                amount = -abs(amount)

            rows.append(ParsedRow(
                row_index=row_idx, date=dt,
                description=memo.strip()[:200],
                amount=amount, nature=nature,
            ))
        except Exception as e:
            errors.append({"row_index": row_idx, "message": str(e)})

    return rows, errors


# ── PDF generic ───────────────────────────────────────────────────────────────

_MONTH_PT = {
    'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12,
}


def _try_date(s: str) -> Optional[date]:
    s = s.strip()
    for fmt in ('%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d', '%d-%m-%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    m = re.match(r'^(\d{1,2})\s+([a-z]{3})(?:\s+(\d{4}))?$', s.lower())
    if m:
        d, mo_str = int(m.group(1)), m.group(2)
        y = int(m.group(3)) if m.group(3) else datetime.now().year
        mo = _MONTH_PT.get(mo_str)
        if mo:
            try:
                return date(y, mo, d)
            except ValueError:
                pass
    return None


def _try_amount(s: str) -> Optional[Decimal]:
    s = re.sub(r'[R$\s]', '', s).strip()
    negative = s.endswith('-') or s.startswith('-')
    s = s.strip('-').strip()
    if re.match(r'^[\d.,]+$', s):
        # Brazilian: 1.234,56 → 1234.56
        if ',' in s:
            s = s.replace('.', '').replace(',', '.')
        try:
            v = Decimal(s)
            return -v if negative else v
        except InvalidOperation:
            pass
    return None


def parse_pdf(content: bytes) -> Tuple[List[ParsedRow], List[dict]]:
    """
    Generic PDF parser using pdfplumber.
    Tries table extraction first, falls back to line-by-line text parsing.
    Works for Nubank, Inter, C6, and most Brazilian bank PDF statements.
    """
    try:
        import pdfplumber
    except ImportError:
        raise ValueError("Suporte a PDF indisponível. Contate o suporte.")

    rows: List[ParsedRow] = []
    errors: List[dict] = []
    row_idx = 1

    def is_date_cell(s: str) -> bool:
        return bool(_try_date(s))

    def is_amount_cell(s: str) -> bool:
        return bool(_try_amount(s))

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            used_table = False

            for table in tables:
                for row in table:
                    if not row:
                        continue
                    cells = [str(c or '').strip() for c in row]

                    # Skip header-like rows
                    joined_lower = ' '.join(cells).lower()
                    if any(h in joined_lower for h in ['data', 'descrição', 'valor', 'lançamento', 'date', 'amount']):
                        continue

                    dt: Optional[date] = None
                    desc: Optional[str] = None
                    amount: Optional[Decimal] = None

                    for cell in cells:
                        if not cell:
                            continue
                        if dt is None and is_date_cell(cell):
                            dt = _try_date(cell)
                        elif amount is None and is_amount_cell(cell):
                            amount = _try_amount(cell)

                    # Description = longest non-date, non-amount cell
                    text_cells = [c for c in cells if c and not is_date_cell(c) and not is_amount_cell(c)]
                    if text_cells:
                        desc = max(text_cells, key=len)

                    if dt and desc and amount is not None and abs(amount) > Decimal('0.01') and len(desc) > 2:
                        nature = 'INCOME' if amount > 0 else 'EXPENSE'
                        rows.append(ParsedRow(
                            row_index=row_idx, date=dt,
                            description=desc[:200],
                            amount=amount, nature=nature,
                        ))
                        row_idx += 1
                        used_table = True

            # Fallback: parse text lines when no useful tables found
            if not used_table:
                text = page.extract_text() or ''
                for line in text.split('\n'):
                    line = line.strip()
                    if len(line) < 8:
                        continue

                    # Pattern: DD/MM/YYYY ... amount at end
                    m = re.match(
                        r'^(\d{1,2}/\d{2}/\d{2,4})\s+(.+?)\s+([-R$\d.,]{3,})$',
                        line
                    )
                    if m:
                        dt = _try_date(m.group(1))
                        desc = m.group(2).strip()
                        amount = _try_amount(m.group(3))
                        if dt and desc and amount is not None and abs(amount) > Decimal('0.01'):
                            nature = 'INCOME' if amount > 0 else 'EXPENSE'
                            rows.append(ParsedRow(
                                row_index=row_idx, date=dt,
                                description=desc[:200],
                                amount=amount, nature=nature,
                            ))
                            row_idx += 1

    if not rows:
        errors.append({
            "row_index": 0,
            "message": "Nenhuma transação encontrada no PDF. Verifique se é um extrato bancário válido."
        })

    return rows, errors


# ── Format detection ──────────────────────────────────────────────────────────

def detect_file_format(filename: str, content_type: str = '') -> str:
    name = filename.lower()
    if name.endswith('.ofx') or name.endswith('.qfx'):
        return 'ofx'
    if name.endswith('.pdf') or 'pdf' in content_type:
        return 'pdf'
    return 'csv'
