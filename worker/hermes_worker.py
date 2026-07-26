#!/usr/bin/env python3
"""
Hermes Worker — OmniRoute Integration
=======================================
Standalone worker that polls the finance-ai server queue, sends raw text
entries to OmniRoute Gateway for AI parsing, and submits the structured
results back to the server.

Uses only Python stdlib — no third-party packages required.
"""

import json
import logging
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DOT_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def load_dotenv(path: str = DOT_ENV_PATH) -> None:
    """Minimal .env loader — no external dependencies."""
    if not os.path.isfile(path):
        return  # silently skip if no .env file
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip()
            # Strip optional quotes
            if len(val) >= 2 and val[0] == val[-1] and val[0] in ('"', "'"):
                val = val[1:-1]
            os.environ.setdefault(key, val)


load_dotenv()


@dataclass
class Settings:
    """Application configuration sourced from environment variables."""

    server_url: str = field(default_factory=lambda: os.getenv("SERVER_URL", "http://192.168.1.50:3000"))
    omni_url: str = field(default_factory=lambda: os.getenv("OMNIROUTE_URL", "http://localhost:8000/v1"))
    omni_api_key: str = field(default_factory=lambda: os.getenv("OMNIROUTE_API_KEY", ""))
    omni_model: str = field(default_factory=lambda: os.getenv("OMNIROUTE_MODEL", "deepseek-v4-flash"))
    poll_interval: int = field(default_factory=lambda: int(os.getenv("POLL_INTERVAL", "60")))
    batch_size: int = field(default_factory=lambda: int(os.getenv("BATCH_SIZE", "20")))

    @classmethod
    def from_env(cls) -> "Settings":
        return cls()


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger("hermes_worker")


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(levelname)s] %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt, datefmt=datefmt))
    logger.setLevel(level)
    logger.addHandler(handler)
    logger.debug("Logging configured (verbose=%s)", verbose)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

USER_AGENT = "HermesWorker/1.0"


def _build_headers(config: Settings) -> Dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    }
    if config.omni_api_key:
        headers["Authorization"] = f"Bearer {config.omni_api_key}"
    return headers


def _request(
    url: str,
    method: str = "GET",
    body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 30,
) -> Tuple[int, Any]:
    """Make an HTTP request and return (status_code, parsed_json_body)."""
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.getcode()
            return status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8", errors="replace"))
        except Exception:
            detail = {"_raw": str(exc)}
        return exc.code, detail
    except urllib.error.URLError as exc:
        logger.error("Network error: %s", exc.reason)
        return 0, {"error": str(exc.reason)}


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a financial transaction parser for Indonesian family finance. "
    "Parse each raw text entry and return a JSON array of objects. "
    "Each object must have: "
    "rawText (original text), "
    "amount (integer in IDR), "
    'direction ("expense", "income", or "transfer"), '
    "category (one of: Food & Drink, Transport, Fuel / Gas, Online Shopping, "
    "Household Needs, Utilities, Internet & Mobile, Subscriptions, Health, "
    "Insurance, Education, Entertainment, Donations / Charity, Taxes / Fees, "
    "Loan / Debt, Family / Gifts, Pets, Savings / Investment, Salary / Income, "
    "Transfer, Other), "
    "description (cleaned note), "
    "merchant (string or null), "
    'source ("cash", "bank", "ewallet", or "unknown"), '
    "tags (array of strings). "
    "Respond ONLY with the JSON array."
)

# ---------------------------------------------------------------------------
# Queue operations
# ---------------------------------------------------------------------------


def fetch_pending_queue(config: Settings) -> List[Dict[str, Any]]:
    """GET pending items from the server queue."""
    params = urllib.parse.urlencode({"status": "PENDING", "limit": config.batch_size})
    url = f"{config.server_url.rstrip('/')}/api/queue?{params}"
    logger.debug("Fetching queue from %s", url)

    status, body = _request(url, headers=_build_headers(config))
    if status != 200:
        logger.warning("Queue fetch returned HTTP %s: %s", status, body)
        return []

    if isinstance(body, list):
        return body
    # Some APIs wrap the list in a key
    if isinstance(body, dict):
        for key in ("data", "items", "results", "queue"):
            if key in body and isinstance(body[key], list):
                return body[key]
    logger.warning("Unexpected queue response shape: %s", type(body))
    return []


def submit_transactions(config: Settings, transactions: List[Dict[str, Any]]) -> int:
    """POST parsed transactions to the server. Returns HTTP status."""
    url = f"{config.server_url.rstrip('/')}/api/transactions/batch"
    logger.debug("Submitting %d transactions to %s", len(transactions), url)
    status, body = _request(url, method="POST", body={"transactions": transactions}, headers=_build_headers(config))
    if status not in (200, 201):
        logger.warning("Submit batch returned HTTP %s: %s", status, body)
    else:
        logger.info("Batch submitted successfully (HTTP %s)", status)
    return status


def mark_queue_items_error(config: Settings, ids: List[int], error_msg: str) -> None:
    """Mark individual queue items as ERROR on the server."""
    url = f"{config.server_url.rstrip('/')}/api/queue/batch"
    payload = {"ids": ids, "status": "ERROR", "error": error_msg}
    status, body = _request(url, method="PATCH", body=payload, headers=_build_headers(config))
    if status != 200:
        logger.warning("Failed to mark items as ERROR (HTTP %s): %s", status, body)


# ---------------------------------------------------------------------------
# OmniRoute API
# ---------------------------------------------------------------------------


def call_omni_parse(config: Settings, raw_texts: List[str]) -> Optional[List[Dict[str, Any]]]:
    """Send a batch of raw texts to OmniRoute for parsing.

    Returns a list of parsed transaction dicts, or None on failure.
    """
    # Build user prompt from the raw texts
    lines = [f"{i + 1}. {text}" for i, text in enumerate(raw_texts)]
    user_prompt = "Parse these entries:\n" + "\n".join(lines)

    payload: Dict[str, Any] = {
        "model": config.omni_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
    }

    url = f"{config.omni_url.rstrip('/')}/chat/completions"
    headers = _build_headers(config)

    logger.debug("Calling OmniRoute with %d entries (%s)", len(raw_texts), config.omni_model)

    status, body = _request(url, method="POST", body=payload, headers=headers, timeout=120)
    if status != 200:
        logger.warning("OmniRoute API returned HTTP %s: %s", status, body)
        if isinstance(body, dict) and "error" in body:
            logger.warning("OmniRoute error detail: %s", body["error"])
        return None

    # Navigate response — OpenAI-compatible format
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.warning("Unexpected OmniRoute response structure: %s", exc)
        logger.debug("Response body: %s", json.dumps(body, indent=2)[:1000])
        return None

    return _parse_omni_response(content, raw_texts)


def _parse_omni_response(content: str, raw_texts: List[str]) -> Optional[List[Dict[str, Any]]]:
    """Parse the JSON content from the OmniRoute response.

    Strips Markdown code fences if present and returns a validated list.
    """
    # Strip possible ```json ... ``` fences
    cleaned = content.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (possibly with language hint)
        first_newline = cleaned.find("\n")
        if first_newline != -1:
            cleaned = cleaned[first_newline + 1:]
        # Remove closing fence
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse OmniRoute JSON response: %s", exc)
        logger.debug("Raw content snippet: %s", content[:500])
        return None

    if not isinstance(parsed, list):
        # The model may wrap the array in an object with a key
        if isinstance(parsed, dict):
            for key in ("transactions", "entries", "data", "results", "items"):
                if key in parsed and isinstance(parsed[key], list):
                    parsed = parsed[key]
                    break
            else:
                logger.warning(
                    "OmniRoute response is an object but no array key found. "
                    "Keys: %s",
                    list(parsed.keys()),
                )
                return None

    if not isinstance(parsed, list):
        logger.warning("OmniRoute response is neither list nor expected dict: %s", type(parsed))
        return None

    # Validate each item has minimum required fields
    valid: List[Dict[str, Any]] = []
    for i, item in enumerate(parsed):
        if not isinstance(item, dict):
            logger.warning("Item %d is not a dict, skipping", i)
            continue
        if "rawText" not in item and i < len(raw_texts):
            # Infer rawText if missing
            item["rawText"] = raw_texts[i]
        if "amount" not in item:
            logger.warning("Item %d missing 'amount', skipping", i)
            continue
        if "direction" not in item:
            logger.warning("Item %d missing 'direction', skipping", i)
            continue
        valid.append(item)

    if not valid:
        logger.warning("No valid transactions extracted from OmniRoute response")
        return None

    logger.info("Parsed %d valid transactions from %d entries", len(valid), len(raw_texts))
    return valid


# ---------------------------------------------------------------------------
# Main worker logic
# ---------------------------------------------------------------------------


def process_batch(config: Settings) -> int:
    """Fetch one batch of pending queue items, parse via OmniRoute, submit.

    Returns the number of successfully processed items.
    """
    items = fetch_pending_queue(config)
    if not items:
        logger.debug("No pending items found")
        return 0

    logger.info("Processing batch of %d pending items", len(items))

    # Collect raw texts
    raw_texts = []
    item_ids = []
    for item in items:
        # Support both direct 'rawText' and nested 'data.rawText'
        raw = item.get("rawText") or (item.get("data") or {}).get("rawText") or item.get("text", "")
        if not raw:
            logger.warning("Queue item %s has no raw text, skipping", item.get("id", "?"))
            continue
        raw_texts.append(raw)
        item_ids.append(item.get("id"))

    if not raw_texts:
        logger.info("No parsable entries in this batch")
        return 0

    logger.info(
        "Calling OmniRoute with %d entries (model=%s, url=%s)",
        len(raw_texts),
        config.omni_model,
        config.omni_url,
    )

    transactions = call_omni_parse(config, raw_texts)
    if transactions is None:
        logger.error("OmniRoute parsing failed for this batch")
        # Mark items as errored so they don't get stuck
        if item_ids:
            mark_queue_items_error(config, item_ids, "OmniRoute parsing failed")
        return 0

    # Submit parsed results
    logger.info("Submitting %d parsed transactions", len(transactions))
    status = submit_transactions(config, transactions)

    if status in (200, 201):
        logger.info("Batch completed: %d transactions submitted", len(transactions))
    else:
        logger.warning("Batch submission returned HTTP %s", status)
        # Mark items as errored
        if item_ids:
            mark_queue_items_error(config, item_ids, f"Submit failed with HTTP {status}")

    return len(transactions)


def run_forever(config: Settings) -> None:
    """Main loop — poll, process, sleep, repeat."""
    logger.info(
        "Hermes Worker started — polling %s every %ds (batch=%d, model=%s)",
        config.server_url,
        config.poll_interval,
        config.batch_size,
        config.omni_model,
    )
    cycle = 0
    while True:
        cycle += 1
        logger.debug("=== Poll cycle %d ===", cycle)
        try:
            processed = process_batch(config)
            if processed > 0:
                logger.info("Cycle %d: processed %d transactions", cycle, processed)
            else:
                logger.debug("Cycle %d: nothing to process", cycle)
        except Exception:
            logger.exception("Unhandled error in poll cycle %d", cycle)

        logger.debug("Sleeping %ds...", config.poll_interval)
        time.sleep(config.poll_interval)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def parse_args(argv: List[str]) -> Tuple[bool, bool]:
    """Parse CLI flags. Returns (once, verbose)."""
    once = False
    verbose = False
    for arg in argv[1:]:
        if arg in ("--once", "-1"):
            once = True
        elif arg in ("--verbose", "-v"):
            verbose = True
        elif arg in ("--help", "-h"):
            print(f"Usage: {argv[0]} [--once] [--verbose]")
            print()
            print("  --once, -1     Process one batch and exit (for cron)")
            print("  --verbose, -v  Enable debug logging")
            print("  --help, -h     Show this help")
            sys.exit(0)
        else:
            print(f"Unknown argument: {arg}", file=sys.stderr)
            sys.exit(1)
    return once, verbose


def main() -> None:
    once, verbose = parse_args(sys.argv)
    setup_logging(verbose)

    config = Settings.from_env()
    logger.debug("Configuration: server_url=%s, omni_url=%s, omni_model=%s", config.server_url, config.omni_url, config.omni_model)

    if once:
        count = process_batch(config)
        logger.info("One-shot complete: %d items processed", count)
        sys.exit(0)
    else:
        run_forever(config)


if __name__ == "__main__":
    main()
