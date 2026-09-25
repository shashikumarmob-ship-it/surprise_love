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

# Directory where all user data files are stored
USERS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users")
os.makedirs(USERS_DIR, exist_ok=True)

_lock = threading.Lock()


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
        "password":        password,
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


class UserStore:
    """Thread-safe per-user JSON file store."""

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def user_exists(self, username: str) -> bool:
        return os.path.exists(_user_path(username))

    def load_user(self, username: str) -> dict | None:
        path = _user_path(username)
        if not os.path.exists(path):
            return None
        with _lock:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # Ensure all keys exist (forward-compat)
                default = _default_user(username, "")
                for k, v in default.items():
                    if k not in data:
                        data[k] = v
                return data
            except Exception as e:
                print(f"[UserStore] Error loading {username}: {e}")
                return None

    def save_user(self, user: dict) -> bool:
        username = user.get("username", "")
        if not username:
            return False
        path = _user_path(username)
        with _lock:
            try:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(user, f, indent=2, ensure_ascii=False)
                return True
            except Exception as e:
                print(f"[UserStore] Error saving {username}: {e}")
                return False

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
        """Permanently deletes the user's data file."""
        path = _user_path(username)
        with _lock:
            if os.path.exists(path):
                try:
                    os.remove(path)
                    print(f"[UserStore] Deleted user file: {username}")
                    return True
                except Exception as e:
                    print(f"[UserStore] Error deleting {username}: {e}")
                    return False
        return False

    def list_users(self) -> list[str]:
        """Returns sorted list of all registered usernames."""
        try:
            files = [
                f[:-5] for f in os.listdir(USERS_DIR)
                if f.endswith(".json") and not f.startswith("_")
            ]
            return sorted(files)
        except Exception:
            return []

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
        return user.get("password", "") == password

    def update_last_login(self, username: str):
        user = self.load_user(username)
        if not user:
            return
        user["last_login"]    = time.strftime("%d %b %Y, %I:%M %p")
        user["last_login_ts"] = time.time()
        self.save_user(user)

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

    def add_photo(self, username: str, file_id: str, url: str, caption: str = "", message_id=None) -> bool:
        user = self.load_user(username)
        if not user:
            return False
        photo = {
            "file_id":     file_id,
            "url":         url,
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


# Global singleton instance
user_store = UserStore()
