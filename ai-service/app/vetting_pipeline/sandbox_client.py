# vetting_pipeline/sandbox_client.py
#
# Wave 4 / Session 1 (R-03): the question-vetting sandbox no longer talks to the standalone
# gRPC sandbox-service (a dead skeleton, now retired). It reuses the SINGLE canonical hardened
# runner — runner-python's HTTP service (`/run`), which executes every submission inside an
# isolated `docker run` (non-root, read-only rootfs, cap-drop ALL, no-new-privileges, pids-limit,
# --network none) and fails closed when Docker is unreachable. Auth: the shared X-Runner-Token.
import logging
from typing import Dict, Optional

import requests


class SandboxClient:
    """Validates an AI-generated question's canonical solution by executing it in the hardened runner."""

    def __init__(self, runner_url: str, runner_token: Optional[str] = None, timeout: int = 60):
        # runner_url is the runner-python HTTP base (e.g. http://localhost:8001). Trailing slash safe.
        self.runner_url = (runner_url or "").rstrip("/")
        self.runner_token = runner_token or ""
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)

    def validate_solution(self, question: Dict) -> Dict:
        """Run the canonical solution against the question's test cases in the hardened runner.

        Returns the shape the vetting pipeline expects:
            {all_passed: bool, test_results: [{passed, error_message}], execution_time: float}
        On any transport/auth failure it fails safe (all_passed=False + error) so a broken or
        unauthenticated runner can NEVER silently approve a question.
        """
        try:
            tests = [
                {"input": tc.get("input", ""), "expected_output": tc.get("expected_output", "")}
                for tc in question.get("test_cases", [])
            ]
            payload = {
                "code": question.get("canonical_solution", ""),
                "tests": tests,
                "language": question.get("language", "python"),
            }
            headers = {"X-Runner-Token": self.runner_token} if self.runner_token else {}

            resp = requests.post(
                f"{self.runner_url}/run", json=payload, headers=headers, timeout=self.timeout
            )
            if resp.status_code != 200:
                self.logger.error("Runner /run returned %s: %s", resp.status_code, resp.text[:300])
                return {"all_passed": False, "test_results": [], "error": f"runner HTTP {resp.status_code}"}

            # A 200 with a non-JSON body raises JSONDecodeError (a ValueError, NOT a
            # RequestException). It must still fail safe — never let a malformed response bubble
            # up and either crash vetting or be mistaken for an approval.
            data = resp.json()
            summary = data.get("testsSummary", []) or []
            return {
                "all_passed": bool(data.get("passed", False)),
                "test_results": [
                    {"passed": bool(t.get("pass", False)), "error_message": (t.get("stderr") or "")}
                    for t in summary
                ],
                "execution_time": (data.get("runtimeMs", 0) or 0) / 1000.0,
            }

        except requests.RequestException as e:
            self.logger.error(f"Runner call failed: {e}")
            return {"all_passed": False, "test_results": [], "error": str(e)}
        except Exception as e:  # noqa: BLE001 — fail safe on ANY error (bad JSON, unexpected shape)
            self.logger.error(f"Runner response handling failed: {e}")
            return {"all_passed": False, "test_results": [], "error": str(e)}

    def close(self):
        # HTTP client is stateless per-request; nothing to close. Kept for call-site compatibility.
        return None
