import json
import os
from datetime import datetime, timezone

LOG_FILE = os.path.join(os.path.dirname(__file__), "linkedin_performance.jsonl")


def log_post(entry: dict) -> None:
    """Append a post entry to the performance log."""
    entry["logged_at"] = datetime.now(timezone.utc).isoformat()
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


def read_log() -> list[dict]:
    """Read all entries from the performance log."""
    if not os.path.exists(LOG_FILE):
        return []
    entries = []
    with open(LOG_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


def get_last_snapshot() -> dict | None:
    """Get the stats snapshot from the most recent log entry."""
    entries = read_log()
    if not entries:
        return None
    return entries[-1].get("stats_snapshot")


def get_post_count() -> int:
    """Return total number of posts logged."""
    return len(read_log())


def get_recent_entries(n: int = 10) -> list[dict]:
    """Get the N most recent log entries."""
    entries = read_log()
    return entries[-n:]
