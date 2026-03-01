"""
In-memory metrics collector for APM-style monitoring.
Tracks request counts, latencies, and error rates in a rolling window.
"""
import time
import threading
from collections import deque
from dataclasses import dataclass
from typing import Optional


@dataclass
class RequestRecord:
    timestamp: float
    latency_ms: float
    status_code: int
    path: str


class MetricsCollector:
    """Thread-safe in-memory metrics with a 1-hour rolling window."""

    def __init__(self, window_seconds: int = 3600):
        self._window = window_seconds
        self._records: deque[RequestRecord] = deque()
        self._lock = threading.Lock()

    def record(self, latency_ms: float, status_code: int, path: str):
        now = time.time()
        rec = RequestRecord(timestamp=now, latency_ms=latency_ms, status_code=status_code, path=path)
        with self._lock:
            self._records.append(rec)
            self._prune(now)

    def _prune(self, now: float):
        cutoff = now - self._window
        while self._records and self._records[0].timestamp < cutoff:
            self._records.popleft()

    def get_stats(self) -> dict:
        now = time.time()
        with self._lock:
            self._prune(now)
            records = list(self._records)

        if not records:
            return {
                "total_requests": 0,
                "error_count": 0,
                "error_rate": 0.0,
                "p50_latency_ms": 0.0,
                "p95_latency_ms": 0.0,
                "p99_latency_ms": 0.0,
                "avg_latency_ms": 0.0,
                "requests_per_minute": 0.0,
            }

        total = len(records)
        errors = sum(1 for r in records if r.status_code >= 500)
        latencies = sorted(r.latency_ms for r in records)

        # Time span in minutes
        span_mins = max((records[-1].timestamp - records[0].timestamp) / 60, 1 / 60)

        def percentile(sorted_list, pct):
            idx = int(len(sorted_list) * pct / 100)
            idx = min(idx, len(sorted_list) - 1)
            return round(sorted_list[idx], 2)

        return {
            "total_requests": total,
            "error_count": errors,
            "error_rate": round(errors / total * 100, 2) if total else 0.0,
            "p50_latency_ms": percentile(latencies, 50),
            "p95_latency_ms": percentile(latencies, 95),
            "p99_latency_ms": percentile(latencies, 99),
            "avg_latency_ms": round(sum(latencies) / total, 2),
            "requests_per_minute": round(total / span_mins, 1),
        }


# Global singleton
collector = MetricsCollector()
