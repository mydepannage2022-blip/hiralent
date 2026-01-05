import structlog
from redis import Redis
import httpx

from app.pipeline.job_store import JobStore, RunItemRecord
from app.sources.registry import get_source
from app.dedupe.fingerprint import compute_fingerprint
from app.dedupe.matcher import decide_in_run_dedupe
from app.pipeline.steps import normalize_and_enrich
from app.persistence.backend_client import BackendClient
from app.persistence.mapper import map_to_backend_payload
from app.persistence.idempotency import make_idempotency_key
from app.enrichment.quality_score import compute_quality_score
from app.enrichment.summarizer import summarize_candidate
from app.utils.time import now_iso

log = structlog.get_logger()


class Orchestrator:
    def __init__(self, store: JobStore, redis: Redis, http: httpx.Client):
        self.store = store
        self.redis = redis
        self.backend = BackendClient(http)

    def _safe_db_create_run(self, run_id: str, run) -> None:
        try:
            self.backend.create_sourcing_run(
                {
                    "run_id": run_id,
                    "triggered_by_user_id": None,  # later: if you pass user_id from API
                    "sources": run.sources,
                    "query": run.query,
                    "filters": run.filters,
                }
            )
        except Exception as e:
            log.warning("db_run_start_failed", run_id=run_id, err=str(e))

    def _safe_db_add_item(
        self,
        run_id: str,
        *,
        sourced_candidate_id: str | None,
        source: str,
        source_uid: str | None,
        action: str,
        reason: str | None,
        raw: dict | None = None,
    ) -> None:
        try:
            self.backend.add_sourcing_run_item(
                run_id,
                {
                    "sourced_candidate_id": sourced_candidate_id,
                    "source": source,
                    "source_uid": source_uid,
                    "action": action,
                    "reason": reason,
                    "raw": raw,
                },
            )
        except Exception as e:
            log.warning("db_run_item_failed", run_id=run_id, err=str(e))

    def _safe_db_complete_run(self, run_id: str, status: str, error: str | None = None) -> None:
        try:
            final_run = self.store.get_run(run_id)
            self.backend.complete_sourcing_run(
                run_id,
                {
                    "status": status,
                    "total_found": final_run.total_found if final_run else 0,
                    "total_saved": final_run.total_saved if final_run else 0,
                    "total_skipped": final_run.total_skipped if final_run else 0,
                    "error": error,
                },
            )
        except Exception as e:
            log.warning("db_run_complete_failed", run_id=run_id, err=str(e))

    def process_run(self, run_id: str) -> None:
        run = self.store.get_run(run_id)
        if not run:
            log.error("run_not_found", run_id=run_id)
            return

        self.store.set_status(run_id, "RUNNING")
        log.info("run_started", run_id=run_id, sources=run.sources)

        # NEW: persist run start in backend DB
        self._safe_db_create_run(run_id, run)

        try:
            for source_name in run.sources:
                source = get_source(source_name)

                raw_list = list(source.fetch(run.query, limit=run.limit_per_source))
                self.store.incr_metric(run_id, "total_found", len(raw_list))

                for raw in raw_list:
                    try:
                        c = source.parse(raw)
                        c.source = source_name
                        c = normalize_and_enrich(c)

                        fp = compute_fingerprint(
                            email=c.email,
                            linkedin_url=c.linkedin_url,
                            source=c.source,
                            source_uid=c.source_uid,
                            full_name=c.full_name,
                            city=c.city,
                            headline=c.headline,
                        )

                        already_seen = self.store.seen_in_run(run_id, fp)
                        decision = decide_in_run_dedupe(already_seen)
                        if decision.action == "skip":
                            self.store.incr_metric(run_id, "total_skipped", 1)

                            item = RunItemRecord(
                                action="skipped",
                                reason=decision.reason,
                                source=c.source,
                                source_uid=c.source_uid,
                                sourced_candidate_id=None,
                                fingerprint=fp,
                                created_at=now_iso(),
                            )
                            self.store.append_item(run_id, item)

                            # NEW: persist item into DB
                            self._safe_db_add_item(
                                run_id,
                                sourced_candidate_id=None,
                                source=c.source,
                                source_uid=c.source_uid,
                                action="skipped",
                                reason=decision.reason,
                                raw=None,
                            )
                            continue

                        self.store.mark_seen(run_id, fp)

                        quality = compute_quality_score(c)
                        summary = summarize_candidate(c)
                        payload = map_to_backend_payload(c, fp, quality_score=quality, summary=summary)
                        idem_key = make_idempotency_key(fp)

                        result = self.backend.upsert_sourced_candidate(payload, idempotency_key=idem_key)

                        action = result.get("action", "updated")
                        sourced_candidate_id = result.get("sourced_candidate_id")

                        if action in ("created", "updated"):
                            self.store.incr_metric(run_id, "total_saved", 1)
                        else:
                            self.store.incr_metric(run_id, "total_skipped", 1)

                        item = RunItemRecord(
                            action=action,
                            reason=result.get("reason"),
                            source=c.source,
                            source_uid=c.source_uid,
                            sourced_candidate_id=sourced_candidate_id,
                            fingerprint=fp,
                            created_at=now_iso(),
                        )
                        self.store.append_item(run_id, item)

                        # NEW: persist item into DB
                        self._safe_db_add_item(
                            run_id,
                            sourced_candidate_id=sourced_candidate_id,
                            source=c.source,
                            source_uid=c.source_uid,
                            action=action,
                            reason=result.get("reason"),
                            raw=None,
                        )

                    except Exception as e:
                        self.store.incr_metric(run_id, "total_skipped", 1)

                        item = RunItemRecord(
                            action="failed",
                            reason=str(e),
                            source=source_name,
                            source_uid=None,
                            sourced_candidate_id=None,
                            fingerprint=None,
                            created_at=now_iso(),
                        )
                        self.store.append_item(run_id, item)

                        # NEW: persist failure item into DB
                        self._safe_db_add_item(
                            run_id,
                            sourced_candidate_id=None,
                            source=source_name,
                            source_uid=None,
                            action="failed",
                            reason=str(e),
                            raw=None,
                        )

            self.store.set_status(run_id, "COMPLETED")
            log.info("run_completed", run_id=run_id)

            # NEW: mark completed in DB
            self._safe_db_complete_run(run_id, "COMPLETED", error=None)

        except Exception as e:
            self.store.set_status(run_id, "FAILED", error=str(e))
            log.exception("run_failed", run_id=run_id, err=str(e))

            # NEW: mark failed in DB
            self._safe_db_complete_run(run_id, "FAILED", error=str(e))
