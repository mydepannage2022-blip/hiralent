import json, sys, os, time, traceback
from pathlib import Path
from typing import List, Dict, Any
from sandbox_exec import run_case
from scoring import compare_output

WORK_DIR = Path("/work")

def load_tests() -> List[Dict[str, str]]:
    tests_path = WORK_DIR / "tests.json"
    if not tests_path.exists():
        raise FileNotFoundError("tests.json not found in /work")
    return json.loads(tests_path.read_text(encoding="utf-8"))

def main():
    code_path_py = WORK_DIR / "main.py"
    if not code_path_py.exists():
        print(json.dumps({
            "passed": False, "score": 0,
            "runtimeMs": None, "memoryKb": None,
            "testsSummary": [], "traces": [], "antiCheat": {},
            "error": "main.py not found"
        }))
        return

    try:
        tests = load_tests()
    except Exception as e:
        print(json.dumps({
            "passed": False, "score": 0,
            "runtimeMs": None, "memoryKb": None,
            "testsSummary": [], "traces": [], "antiCheat": {},
            "error": f"Failed to load tests.json: {e}"
        }))
        return

    per_test = []
    total_ok = 0
    start_all = time.perf_counter()
    peak_mem_kb_all = 0
    timeout_seconds = float(os.environ.get("TEST_TIMEOUT_S", "2.0"))

    for i, t in enumerate(tests, start=1):
        test_input = t.get("input", "")
        expected = t.get("expected", "")

        rc, out, err, time_ms, mem_kb = run_case(
            code_path=str(code_path_py),
            input_data=test_input,
            timeout_s=timeout_seconds
        )
        if mem_kb:
            peak_mem_kb_all = max(peak_mem_kb_all, mem_kb)

        passed, note = compare_output(out, expected)
        if rc != 0 and passed:
            passed = False
            note = note + " (non-zero exit)"

        per_test.append({
            "id": i,
            "pass": bool(passed),
            "timeMs": time_ms,
            "memKb": mem_kb,
            "stderr": (err or "")[:2000],
            "note": note
        })

        if passed:
            total_ok += 1

    elapsed_all_ms = int((time.perf_counter() - start_all) * 1000)
    score = round(100.0 * total_ok / max(1, len(tests)), 2)
    overall_pass = total_ok == len(tests)

    result = {
        "passed": overall_pass,
        "score": score,
        "runtimeMs": elapsed_all_ms,
        "memoryKb": peak_mem_kb_all,
        "testsSummary": per_test,
        "traces": [],
        "antiCheat": {},
    }

    print(json.dumps(result))

if __name__ == "__main__":
    try:
        main()
    except Exception:
        print(json.dumps({
            "passed": False, "score": 0,
            "runtimeMs": None, "memoryKb": None,
            "testsSummary": [], "traces": [], "antiCheat": {},
            "error": traceback.format_exc()[:4000]
        }))
        sys.exit(0)
