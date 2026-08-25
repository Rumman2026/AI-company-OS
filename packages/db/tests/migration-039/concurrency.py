"""Concurrency proofs for migration 039. Scratch DB only.

WHY THIS CANNOT BE DONE IN SQL ALONE. A single psql session executes serially,
so it can prove replay but never a race -- the losing branch (`SELECT .. FOR
UPDATE` blocking on an uncommitted claim) is unreachable without a second
connection holding an open transaction. That branch is the whole reason the
design is not check-then-insert, so leaving it untested would leave the actual
claim untested.

TWO RACES ARE PROVEN, and the second matters as much as the first:

  same key, SAME payload      -> one row, both callers the same id
  same key, DIFFERENT payload -> one row, exactly one caller succeeds and the
                                 other is rejected as a payload mismatch

Without the second, a fingerprint that was only checked on the non-concurrent
path would pass every test and still let two racing callers write two records.
"""

from __future__ import annotations

import sys
import threading

import psycopg

DSN = sys.argv[1]
UID_A = "11111111-1111-1111-1111-111111111111"
BUSINESS = "aaaaaaaa-0000-0000-0000-000000000001"

failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    print(f"  [{'PASS' if condition else 'FAIL'}] {label}" + (f"  -- {detail}" if detail else ""))
    if not condition:
        failures.append(label)


def race(key: str, names: tuple[str, str]) -> tuple[list, list]:
    """Two connections call jervis_create_contact simultaneously."""
    results: list[tuple[str, str]] = []
    errors: list[str] = []
    barrier = threading.Barrier(2)

    def racer(label: str, display_name: str) -> None:
        try:
            with psycopg.connect(DSN, autocommit=False) as conn:
                with conn.cursor() as cur:
                    cur.execute("select set_config('test.uid', %s, false)", (UID_A,))
                    # Both threads arrive before either calls the RPC, so the
                    # claim is genuinely contended rather than accidentally
                    # ordered by thread start-up.
                    barrier.wait(timeout=20)
                    cur.execute(
                        "select public.jervis_create_contact(%s,%s,null,null,%s,%s)",
                        (BUSINESS, display_name, "corr-conc", key),
                    )
                    value = cur.fetchone()[0]
                conn.commit()
            results.append((label, str(value)))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{label}: {type(exc).__name__}: {exc}")

    threads = [
        threading.Thread(target=racer, args=("A", names[0])),
        threading.Thread(target=racer, args=("B", names[1])),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=40)
    return results, errors


def count(sql: str, *params) -> int:
    with psycopg.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()[0]


# --- race 1: identical payload ---------------------------------------------
print("SAME KEY, SAME PAYLOAD")
results, errors = race("idem-conc-same", ("Concurrent Same", "Concurrent Same"))
print("   results:", results, " errors:", errors or "none")
check("no racer raised", not errors, str(errors))
check("both callers returned the same id",
      len(results) == 2 and results[0][1] == results[1][1], str(results))
check("exactly one CRM row",
      count("select count(*) from public.contacts where display_name = %s",
            "Concurrent Same") == 1)

# --- race 2: divergent payload ---------------------------------------------
print("\nSAME KEY, DIFFERENT PAYLOAD")
results, errors = race("idem-conc-diff", ("Concurrent Alice", "Concurrent Bob"))
print("   results:", results, " errors:", errors or "none")
check("exactly one caller succeeded", len(results) == 1, str(results))
check("the other was rejected as a payload mismatch",
      len(errors) == 1 and "different payload" in errors[0],
      errors[0] if errors else "no error raised")
check("exactly one CRM row across both names",
      count("select count(*) from public.contacts where display_name like %s",
            "Concurrent %%lice") + count(
          "select count(*) from public.contacts where display_name like %s",
          "Concurrent Bob") == 1)

print("\nCONCURRENCY:", "PASS" if not failures else f"FAIL {failures}")
sys.exit(0 if not failures else 1)
