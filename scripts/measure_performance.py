import time
from sqlalchemy import text
from app.core.database import SessionLocal

def measure_performance():
    db = SessionLocal()
    views = [
        "v_operational_monthly",
        "v_savings_rate",
        "v_burn_rate",
        "v_net_worth",
        "v_assets_liabilities",
        "v_account_balances"
    ]

    print("| View | Avg Time (ms) |")
    print("| --- | --- |")

    for view in views:
        times = []
        for _ in range(5):
            start = time.time()
            db.execute(text(f"SELECT * FROM {view}"))
            end = time.time()
            times.append((end - start) * 1000)

        avg_time = sum(times) / len(times)
        print(f"| {view} | {avg_time:.2f} |")

    print("\nEXPLAIN QUERY PLAN for v_operational_monthly:")
    result = db.execute(text("EXPLAIN QUERY PLAN SELECT * FROM v_operational_monthly"))
    for row in result:
        print(row)

    db.close()

if __name__ == "__main__":
    measure_performance()
