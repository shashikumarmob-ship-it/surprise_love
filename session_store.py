#!/usr/bin/env python3
"""
💾 session_store — crash-safe persistence for Telegram bot sessions
====================================================================
Both bots (`telegram_bot.py` owner bot, `public_user_bot.py` public bot)
keep per-chat wizard/login state in an in-memory `user_sessions` dict:

    user_sessions[chat_id] = {"logged_user": ..., "step": ..., "data": {...}}

A restart (deploy, crash, Render sleep/wake) used to wipe that dict, so:
  • users were silently logged out of the public bot, and
  • anyone mid-wizard (register / login / create-surprise) got stuck —
    the bot no longer recognised their next message.

This module snapshots that dict to a JSON file every few seconds
(atomic tmp-file + rename, so a crash mid-write never corrupts it)
and restores it on startup:

    from session_store import load_sessions, start_session_autosave

    user_sessions = {}
    user_sessions.update(load_sessions("public"))      # restore
    start_session_autosave("public", user_sessions)    # persist

File layout (`<name>_sessions.json` next to this file)::

    {"sessions": {"<chat_id>": {...}}, "updated": {"<chat_id>": <unix ts>}}

Expiry policy (applied on load AND on every snapshot):
  • Wizard-only state older than WIZARD_TTL (24h) is reset to a clean
    `{"logged_user": ..., "step": None, "data": {}}` — nobody resumes a
    day-old half-finished form.
  • Entries older than SESSION_TTL (7d) are dropped entirely, except
    logged-in public-bot sessions which are downgraded (login kept).
  • Hard cap MAX_SESSIONS entries (newest win) so chat-id spam from
    random Telegram users cannot grow the file unbounded.

Timestamps track *content changes* (per-chat serialised comparison),
not snapshot times — idle sessions still expire correctly.
"""

import os
import json
import time
import copy
import threading
import atexit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

#: Wizard-only state (no login) older than this is reset.
WIZARD_TTL = 24 * 3600
#: Any entry older than this is dropped (logins are downgraded, not dropped).
SESSION_TTL = 7 * 24 * 3600
#: Hard cap on stored sessions (newest win) — bounds disk/memory abuse.
MAX_SESSIONS = 2000
#: Seconds between automatic snapshots.
AUTOSAVE_INTERVAL = 15


_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()
_started: set[str] = set()
_started_guard = threading.Lock()


def sessions_path(name_or_path: str) -> str:
    """Resolves a short bot name ('owner'/'public') to its JSON file path."""
    if os.sep in name_or_path or name_or_path.endswith(".json"):
        return name_or_path if os.path.isabs(name_or_path) else os.path.join(BASE_DIR, name_or_path)
    return os.path.join(BASE_DIR, f"{name_or_path}_sessions.json")


def _lock_for(path: str) -> threading.Lock:
    with _locks_guard:
        lock = _locks.get(path)
        if lock is None:
            lock = threading.Lock()
            _locks[path] = lock
        return lock


def _norm_key(key):
    """Restores int chat_ids (JSON object keys are always strings)."""
    if isinstance(key, int):
        return key
    if isinstance(key, str) and key.lstrip("-").isdigit():
        try:
            return int(key)
        except ValueError:
            return key
    return key


def _read_file(path: str) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except (FileNotFoundError, ValueError, OSError):
        pass
    except Exception as e:
        print(f"[session_store] Error reading {path}: {e}")
    return {}


def _prune(sessions: dict, updated: dict, now: float) -> tuple[dict, dict]:
    """Applies WIZARD_TTL / SESSION_TTL / MAX_SESSIONS policy. Returns cleaned copies."""
    sessions = dict(sessions)
    updated = dict(updated)

    for key in list(sessions.keys()):
        last = updated.get(key, 0)
        try:
            age = now - float(last)
        except (TypeError, ValueError):
            age = SESSION_TTL + 1
        sess = sessions.get(key)
        if not isinstance(sess, dict):
            del sessions[key]
            updated.pop(key, None)
            continue
        logged = sess.get("logged_user") if isinstance(sess, dict) else None
        if age > SESSION_TTL:
            if logged:
                # Keep the login, drop the stale wizard.
                sessions[key] = {"logged_user": logged, "step": None, "data": {}}
                updated[key] = now
            else:
                del sessions[key]
                updated.pop(key, None)
        elif age > WIZARD_TTL and sess.get("step") not in (None, ""):
            # Stale mid-wizard: reset the wizard, keep the login.
            sess = dict(sess)
            sess["step"] = None
            sess["data"] = {}
            sessions[key] = sess

    # Hard cap: newest updates win.
    if len(sessions) > MAX_SESSIONS:
        ordered = sorted(updated.items(), key=lambda kv: kv[1] or 0)
        for key, _ in ordered[: len(sessions) - MAX_SESSIONS]:
            sessions.pop(key, None)
            updated.pop(key, None)

    return sessions, updated


def load_sessions(name_or_path: str) -> dict:
    """
    Loads persisted sessions for a bot. Returns {chat_id: session_dict}
    with int chat_ids restored and expired entries pruned.
    Never raises — returns {} when nothing usable is on disk.
    """
    path = sessions_path(name_or_path)
    try:
        raw = _read_file(path)
        sessions = raw.get("sessions", {}) if isinstance(raw, dict) else {}
        updated = raw.get("updated", {}) if isinstance(raw, dict) else {}
        if not isinstance(sessions, dict):
            return {}
        if not isinstance(updated, dict):
            updated = {}
        sessions, _ = _prune(sessions, updated, time.time())
        restored: dict = {}
        for key, sess in sessions.items():
            if isinstance(sess, dict):
                restored[_norm_key(key)] = sess
        if restored:
            print(f"[session_store] Restored {len(restored)} sessions from {os.path.basename(path)}")
        return restored
    except Exception as e:
        print(f"[session_store] Error loading {path}: {e}")
        return {}


def snapshot_sessions(name_or_path: str, sessions: dict) -> bool:
    """
    Writes the live sessions dict to disk atomically (tmp + rename).
    Change-tracked timestamps: only chats whose content changed since the
    last snapshot get a fresh timestamp, so idle sessions still expire.
    Returns True on success. Never raises.
    """
    path = sessions_path(name_or_path)
    lock = _lock_for(path)
    try:
        # Best-effort consistent copy (polling thread may mutate concurrently).
        live = None
        for _ in range(3):
            try:
                live = copy.deepcopy(dict(sessions))
                break
            except RuntimeError:
                time.sleep(0.05)
        if live is None:
            return False

        now = time.time()
        prev = _read_file(path)
        prev_sessions = prev.get("sessions", {}) if isinstance(prev, dict) else {}
        prev_updated = prev.get("updated", {}) if isinstance(prev, dict) else {}
        if not isinstance(prev_sessions, dict):
            prev_sessions = {}
        if not isinstance(prev_updated, dict):
            prev_updated = {}

        # Per-chat serialisation: one bad entry must not kill the snapshot.
        serialised: dict[str, str] = {}
        clean: dict[str, dict] = {}
        for key, sess in live.items():
            if not isinstance(sess, dict):
                continue
            skey = str(key)
            try:
                serialised[skey] = json.dumps(sess, sort_keys=True, ensure_ascii=False)
                clean[skey] = sess
            except (TypeError, ValueError) as e:
                print(f"[session_store] Skipping non-serialisable session {skey}: {e}")

        updated: dict[str, float] = {}
        for skey, sess in clean.items():
            # Change detection: serialise the previous snapshot entry the
            # same way and compare strings (dict != str would always differ).
            prev_ser = None
            if skey in prev_sessions:
                try:
                    prev_ser = json.dumps(prev_sessions[skey], sort_keys=True, ensure_ascii=False)
                except (TypeError, ValueError):
                    prev_ser = None
            if prev_ser is not None and serialised[skey] != prev_ser:
                updated[skey] = now  # content changed → fresh timestamp
            else:
                updated[skey] = prev_updated.get(skey, now)

        clean, updated = _prune(clean, updated, now)

        tmp = path + ".tmp"
        with lock:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump({"sessions": clean, "updated": updated}, f, ensure_ascii=False)
            os.replace(tmp, path)
        return True
    except Exception as e:
        print(f"[session_store] Error saving {path}: {e}")
        return False


def start_session_autosave(name_or_path: str, sessions: dict, interval: int = AUTOSAVE_INTERVAL):
    """
    Starts a daemon thread snapshotting `sessions` every `interval`
    seconds, plus an atexit flush. Idempotent per file (safe to call
    from both start.py threads and standalone runs).
    """
    path = sessions_path(name_or_path)
    with _started_guard:
        if path in _started:
            return
        _started.add(path)

    def _flush():
        try:
            snapshot_sessions(path, sessions)
        except Exception:
            pass

    def _loop():
        while True:
            time.sleep(interval)
            _flush()

    atexit.register(_flush)
    t = threading.Thread(target=_loop, name=f"sessions-autosave-{os.path.basename(path)}", daemon=True)
    t.start()
    print(f"[session_store] Autosave started for {os.path.basename(path)} (every {interval}s)")
