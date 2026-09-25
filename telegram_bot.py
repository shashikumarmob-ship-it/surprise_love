#!/usr/bin/env python3
"""
✨ 3D Birthday Celebration - Telegram Bot & Live Sync Server 🤖💖
================================================================
This bot handles:
1. Interactive step-by-step creation of personalized 3D birthday surprise links.
2. Real-time notifications sent to the Boyfriend's Telegram whenever the Girlfriend answers a chat question!
3. Photo handling for celebrant portrait.
4. Integrated API server for web app sync.
"""

import os
import sys
import json
import time
import urllib.parse
import threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import requests

# Fix Windows console UTF-8 encoding
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# CONFIGURATION (Loaded from environment variables or bot_config.json)
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_config.json")
DEFAULT_CONFIG = {
    "bot_token": "",
    "public_bot_token": "",
    "owner_chat_id": "",
    "web_app_url": "",
    "api_port": 5000,
    "user_credentials": {},
    "saved_answers": []
}

def load_config():
    cfg = DEFAULT_CONFIG.copy()
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    cfg.update(saved)
        except Exception:
            pass
    # Support Environment Variables (ideal for Render / Cloud deployment)
    if os.environ.get("BOT_TOKEN"):
        cfg["bot_token"] = os.environ.get("BOT_TOKEN").strip()
    if os.environ.get("PUBLIC_BOT_TOKEN"):
        cfg["public_bot_token"] = os.environ.get("PUBLIC_BOT_TOKEN").strip()
    if os.environ.get("OWNER_CHAT_ID"):
        cfg["owner_chat_id"] = os.environ.get("OWNER_CHAT_ID").strip()
    if os.environ.get("WEB_APP_URL"):
        cfg["web_app_url"] = os.environ.get("WEB_APP_URL").strip()
    if os.environ.get("PORT"):
        try:
            cfg["api_port"] = int(os.environ.get("PORT"))
        except ValueError:
            pass
    return cfg

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Error saving config]: {e}")

config = load_config()
BOT_TOKEN = config.get("bot_token", "").strip()
BASE_TG_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

# ── Organized Per-User Storage ──────────────────────────────────────────────
from user_store import user_store

# One-time migration: move old flat bot_config.json data into per-user files
try:
    migrated = user_store.migrate_from_config(config)
    if migrated:
        print(f"[UserStore] ✅ Migrated {migrated} users from old bot_config.json")
except Exception as _me:
    print(f"[UserStore] Migration skipped: {_me}")
# ────────────────────────────────────────────────────────────────────────────

# User conversation session states for /create wizard.
# Persisted to owner_sessions.json so a restart no longer wipes
# mid-wizard state (see session_store.py).
user_sessions = {}
try:
    from session_store import load_sessions as _load_owner_sessions
    user_sessions.update(_load_owner_sessions("owner"))
except Exception as _se:
    print(f"[session_store] Owner session restore skipped: {_se}")

# Active API session tokens: {token_str: {username, expires_at}}
# Tokens are issued by POST /api/auth and expire after 24h of inactivity.
api_tokens = {}
API_TOKEN_TTL = 24 * 3600  # 24 hours

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

import base64
import re
import uuid
import secrets
import hashlib
import hmac

TELEGRAM_FILE_URL_RE = re.compile(r"^https?://api\.telegram\.org/file/bot[^/]+/(.+)$")


def proxy_url_for_file_id(file_id: str) -> str:
    """Public proxy URL for a Telegram file_id. Never contains the bot token."""
    return f"/api/photo?file_id={urllib.parse.quote(str(file_id), safe='')}"


def proxy_url_for_file_path(file_path: str) -> str:
    """Public proxy URL for a Telegram file_path. Never contains the bot token."""
    return f"/api/photo?p={urllib.parse.quote(str(file_path), safe='')}"


def sanitize_telegram_url(url):
    """
    Converts a legacy direct Telegram CDN URL (which embeds BOT_TOKEN)
    into a token-free proxy URL. Non-Telegram URLs pass through unchanged.
    """
    if not url or not isinstance(url, str):
        return url
    m = TELEGRAM_FILE_URL_RE.match(url.strip())
    if m:
        return proxy_url_for_file_path(m.group(1))
    return url


def sanitize_photo_item(item):
    """Sanitizes a photo entry that may be a str or {cdnUrl,localUrl,url} dict."""
    if isinstance(item, str):
        return sanitize_telegram_url(item)
    if isinstance(item, dict):
        out = dict(item)
        for k in ("cdnUrl", "localUrl", "url", "photo"):
            if isinstance(out.get(k), str):
                # Only rewrite CDN-ish keys; keep data: URLs and external URLs as-is.
                v = out[k].strip()
                if TELEGRAM_FILE_URL_RE.match(v):
                    out[k] = sanitize_telegram_url(v)
        return out
    return item


def sanitize_surprise_payload(payload: dict) -> dict:
    """Returns a copy of a surprise payload with all Telegram CDN URLs proxied."""
    if not isinstance(payload, dict):
        return payload
    out = dict(payload)
    if isinstance(out.get("photo"), str):
        out["photo"] = sanitize_telegram_url(out["photo"])
    if isinstance(out.get("memories"), list):
        out["memories"] = [sanitize_photo_item(x) for x in out["memories"]]
    return out


def get_telegram_file_path(file_id: str):
    """Resolves a Telegram file_id to its file_path via getFile (server-side only)."""
    try:
        gr = requests.get(
            f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={urllib.parse.quote(str(file_id), safe='')}",
            timeout=8,
        ).json()
        if gr.get("ok"):
            return gr["result"].get("file_path", "")
    except Exception as e:
        print(f"[TG getFile Error]: {e}")
    return ""


def fetch_telegram_file_bytes(file_path: str):
    """Downloads Telegram file bytes server-side. Token never leaves the server."""
    url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    return r.content


def upload_photo_to_telegram(img_bytes, filename="photo.jpg", caption=""):
    """
    Uploads an image to Telegram Bot (owner chat).
    Returns (file_path, file_id, message_id).
    The raw Telegram CDN URL (which embeds BOT_TOKEN) is NEVER constructed
    or returned — callers must use proxy_url_for_file_id() instead.
    message_id is stored so the photo can be deleted later when user deletes account.
    """
    if not BOT_TOKEN or "YOUR_TELEGRAM" in BOT_TOKEN:
        return None, None, None
    owner_id = str(config.get("owner_chat_id", "")).strip()
    if not owner_id:
        return None, None, None

    try:
        ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        mime_map = {"png": "image/png", "webp": "image/webp",
                    "gif": "image/gif", "jpg": "image/jpeg", "jpeg": "image/jpeg"}
        mime = mime_map.get(ext, "image/jpeg")

        res = requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto",
            data={"chat_id": owner_id, "caption": caption, "parse_mode": "HTML"},
            files={"photo": (filename, img_bytes, mime)},
            timeout=20
        )
        res_json = res.json()
        if res_json.get("ok"):
            result   = res_json.get("result", {})
            msg_id   = result.get("message_id")            # for deleteMessage later
            photos   = result.get("photo", [])
            if photos:
                file_id = photos[-1].get("file_id")      # largest resolution
                # Resolve file_path server-side (never expose token-bearing URL)
                fp = get_telegram_file_path(file_id)
                if fp:
                    return fp, file_id, msg_id
        return None, None, None
    except Exception as e:
        print(f"[TG Photo Upload Error]: {e}")
        return None, None, None


def delete_user_photos_from_telegram(username: str):
    """
    Deletes all photo messages belonging to a user from the owner's Telegram chat.
    Called when a user deletes their account or their data expires.
    """
    owner_id = str(config.get("owner_chat_id", "")).strip()
    if not BOT_TOKEN or "YOUR_TELEGRAM" in BOT_TOKEN or not owner_id:
        return
    photos = user_store.get_photos(username)
    deleted = 0
    for photo in photos:
        msg_id = photo.get("message_id")
        if msg_id:
            try:
                requests.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/deleteMessage",
                    json={"chat_id": owner_id, "message_id": msg_id},
                    timeout=6
                )
                deleted += 1
            except Exception:
                pass
    if deleted:
        print(f"[Photos] Deleted {deleted} TG photo messages for user: {username}")


def save_base64_image(b64_str, prefix="img", username="user", photo_type="Photo"):
    """
    Uploads a base64 image ONLY to Telegram CDN (no local disk storage).
    Saves file_id + file_path + message_id in UserStore under the user's photos list.
    Returns a token-free proxy URL (/api/photo?file_id=...), or None on failure.
    The direct Telegram CDN URL (embeds BOT_TOKEN) is never returned or stored.
    """
    try:
        if not b64_str or not isinstance(b64_str, str):
            return None
        match = re.match(r"^data:image/(\w+);base64,(.+)$", b64_str, re.DOTALL)
        if match:
            ext    = match.group(1).lower()
            if ext == "jpeg": ext = "jpg"
            raw_b64 = match.group(2)
        else:
            ext    = "jpg"
            raw_b64 = b64_str

        img_bytes = base64.b64decode(raw_b64)
        filename  = f"{prefix}_{int(time.time())}_{uuid.uuid4().hex[:6]}.{ext}"

        caption = (
            f"📸 <b>{photo_type.upper()} UPLOADED</b>\n"
            f"• <b>User:</b> <code>{username}</code>\n"
            f"• <b>Type:</b> {photo_type}\n"
            f"• <b>Time:</b> {time.strftime('%d %b %Y, %I:%M %p')}"
        )

        file_path, file_id, msg_id = upload_photo_to_telegram(
            img_bytes, filename=filename, caption=caption
        )

        if file_path and file_id:
            # Store in UserStore so we can delete later.
            # `url` is the token-free proxy URL — the raw TG CDN URL is never stored.
            proxy_url = proxy_url_for_file_id(file_id)
            try:
                user_store.add_photo(
                    username,
                    file_id  = file_id,
                    url      = proxy_url,
                    caption  = photo_type,
                    message_id = msg_id,        # for deleteMessage
                    file_path = file_path,
                )
            except TypeError:
                # Backward-compat with older UserStore.add_photo() signature
                user_store.add_photo(
                    username,
                    file_id  = file_id,
                    url      = proxy_url,
                    caption  = photo_type,
                    message_id = msg_id,
                )
            print(f"[Photo] Saved to TG CDN for {username}: {file_id[:20]}...")
            return proxy_url

        print(f"[Photo] TG upload failed for {username}")
        return None
    except Exception as e:
        print(f"[Photo Error] save_base64_image: {e}")
        return None


def send_tg_message(chat_id, text, reply_markup=None, parse_mode="HTML"):
    """Sends a message to a Telegram chat"""
    if not BOT_TOKEN or "YOUR_TELEGRAM_BOT_TOKEN" in BOT_TOKEN:
        print(f"[TG Sim Message to {chat_id}]: {text}")
        return None
    url = f"{BASE_TG_URL}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        res = requests.post(url, json=payload, timeout=4)
        return res.json()
    except Exception as e:
        print(f"[Telegram API Error]: {e}")
        return None

def send_tg_async(chat_id, text, reply_markup=None, parse_mode="HTML"):
    """Dispatches Telegram message in background thread so HTTP responses are instant"""
    threading.Thread(target=send_tg_message, args=(chat_id, text, reply_markup, parse_mode), daemon=True).start()

def send_tg_photo(chat_id, photo_url, caption=""):
    """Sends a photo to a Telegram chat"""
    if not BOT_TOKEN or "YOUR_TELEGRAM_BOT_TOKEN" in BOT_TOKEN:
        return None
    url = f"{BASE_TG_URL}/sendPhoto"
    payload = {
        "chat_id": chat_id,
        "photo": photo_url,
        "caption": caption,
        "parse_mode": "HTML"
    }
    try:
        res = requests.post(url, json=payload, timeout=5)
        return res.json()
    except Exception as e:
        print(f"[Telegram Photo Error]: {e}")
        return None

# =========================================================
# TELEGRAM CLOUD DATABASE SYNC (Zero Data Loss on Restart)
# =========================================================
_last_backup_time = 0
_backup_lock = threading.Lock()

def backup_database_to_telegram_cloud(force=False):
    """
    Exports full database snapshot and uploads as a backup file to Owner TG Chat,
    pinning the message so it acts as an indestructible cloud database.
    """
    global _last_backup_time
    now = time.time()
    # Debounce backups: max once every 10 seconds unless forced
    if not force and (now - _last_backup_time < 10):
        return

    owner_id = str(config.get("owner_chat_id", "")).strip()
    if not owner_id or not BOT_TOKEN or "YOUR_TELEGRAM" in BOT_TOKEN:
        return

    def _run_backup():
        global _last_backup_time
        with _backup_lock:
            try:
                snapshot = user_store.export_cloud_snapshot()
                snap_bytes = json.dumps(snapshot, indent=2, ensure_ascii=False).encode("utf-8")
                url = f"{BASE_TG_URL}/sendDocument"
                files = {
                    "document": ("birthday_cloud_database.json", snap_bytes, "application/json")
                }
                data = {
                    "chat_id": owner_id,
                    "caption": (
                        f"☁️ <b>#CENTRAL_DATABASE_SNAPSHOT</b>\n\n"
                        f"• 👤 <b>Users:</b> {len(snapshot.get('users', {}))}\n"
                        f"• 🎁 <b>Surprises:</b> {len(snapshot.get('short_surprise_links', {}))}\n"
                        f"• 💌 <b>Answers:</b> {len(snapshot.get('saved_answers', []))}\n"
                        f"• ⏱ {snapshot.get('exported_at')}\n\n"
                        f"<i>Auto-synced to Telegram Cloud! Survives all Render restarts.</i>"
                    ),
                    "parse_mode": "HTML",
                    "disable_notification": "true"
                }
                res = requests.post(url, data=data, files=files, timeout=12)
                res_json = res.json()
                if res_json.get("ok"):
                    msg_id = res_json.get("result", {}).get("message_id")
                    _last_backup_time = time.time()
                    try:
                        requests.post(f"{BASE_TG_URL}/pinChatMessage", json={
                            "chat_id": owner_id,
                            "message_id": msg_id,
                            "disable_notification": True
                        }, timeout=5)
                    except Exception:
                        pass
                    print("[TelegramCloud] ☁️ Database snapshot successfully backed up to Telegram Cloud!")
            except Exception as e:
                print(f"[TelegramCloud] Backup error: {e}")

    threading.Thread(target=_run_backup, daemon=True).start()


def restore_database_from_telegram_cloud():
    """
    Restores the database state from the pinned cloud backup message in the Owner Chat.
    Guarantees zero data loss even if Render completely wipes the filesystem.
    """
    owner_id = str(config.get("owner_chat_id", "")).strip()
    if not owner_id or not BOT_TOKEN or "YOUR_TELEGRAM" in BOT_TOKEN:
        return 0

    try:
        url = f"{BASE_TG_URL}/getChat?chat_id={owner_id}"
        res = requests.get(url, timeout=8)
        chat_data = res.json().get("result", {})
        pinned = chat_data.get("pinned_message")
        if not pinned:
            return 0

        doc = pinned.get("document")
        if not doc or not doc.get("file_id"):
            return 0

        caption = pinned.get("caption", "")
        file_name = doc.get("file_name", "")
        if "DATABASE_SNAPSHOT" not in caption and not file_name.endswith(".json"):
            return 0

        file_id = doc["file_id"]
        f_url = f"{BASE_TG_URL}/getFile?file_id={file_id}"
        f_res = requests.get(f_url, timeout=8)
        f_path = f_res.json().get("result", {}).get("file_path")
        if not f_path:
            return 0

        dl_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{f_path}"
        dl_res = requests.get(dl_url, timeout=15)
        snapshot = dl_res.json()
        restored = user_store.import_cloud_snapshot(snapshot)
        if restored:
            print(f"[TelegramCloud] 🚀 Restored {restored} users & surprises from Telegram Cloud Database!")
        return restored
    except Exception as e:
        print(f"[TelegramCloud] Cloud restore check: {e}")
        return 0

# =========================================================
# TELEGRAM BOT POLLING & COMMAND HANDLERS
# =========================================================
def handle_updates():
    offset = 0
    print("🤖 Telegram Bot Polling service started...")
    try:
        from session_store import start_session_autosave as _start_owner_autosave
        _start_owner_autosave("owner", user_sessions)
    except Exception as _ae:
        print(f"[session_store] Owner autosave not started: {_ae}")
    while True:
        try:
            if not BOT_TOKEN or "YOUR_TELEGRAM_BOT_TOKEN" in BOT_TOKEN:
                time.sleep(4)
                continue

            res = requests.get(f"{BASE_TG_URL}/getUpdates", params={"offset": offset, "timeout": 20}, timeout=25)
            data = res.json()
            if not data.get("ok"):
                time.sleep(3)
                continue

            for update in data.get("result", []):
                offset = update["update_id"] + 1

                # Handle Message
                if "message" in update:
                    msg = update["message"]
                    chat_id = msg["chat"]["id"]
                    text = msg.get("text", "").strip()
                    user_name = msg.get("from", {}).get("first_name", "Friend")

                    # Auto set owner chat id if not configured
                    if not config.get("owner_chat_id"):
                        config["owner_chat_id"] = str(chat_id)
                        save_config(config)

                    process_user_message(chat_id, user_name, text, msg)

                # Handle Inline Button Callback
                elif "callback_query" in update:
                    cb = update["callback_query"]
                    chat_id = cb["message"]["chat"]["id"]
                    cb_data = cb.get("data", "")
                    process_callback_query(chat_id, cb_data, cb)

        except Exception as e:
            # Polling retry
            time.sleep(3)

def setup_telegram_menu():
    """Sets up the Telegram 3-line burger menu button (setMyCommands)"""
    if not BOT_TOKEN or "YOUR_TELEGRAM" in BOT_TOKEN:
        return
    commands = [
        {"command": "user", "description": "👤 All Users & Passwords (1, 2, 3...)"},
        {"command": "active_user", "description": "🟢 Active Users (Today / Active Link)"},
        {"command": "webapp", "description": "🌐 Open Birthday Web App"}
    ]
    try:
        res = requests.post(f"{BASE_TG_URL}/setMyCommands", json={"commands": commands}, timeout=10)
        print(f"📋 Telegram 3-line Menu configured: {res.status_code}")
    except Exception as e:
        print(f"Error configuring Telegram menu: {e}")

def get_main_reply_keyboard():
    return {
        "keyboard": [
            [{"text": "👤 User"}, {"text": "🟢 Active User"}],
            [{"text": "🌐 Open Web App"}]
        ],
        "resize_keyboard": True,
        "is_persistent": True
    }

def is_owner(chat_id):
    """Verify if the sender is the authorized bot Owner"""
    owner_id = str(config.get("owner_chat_id", "")).strip()
    return not owner_id or str(chat_id) == owner_id

def process_user_message(chat_id, user_name, text, raw_msg):
    pub_tok = config.get("public_bot_token", "").strip()
    has_separate_public_bot = bool(pub_tok and pub_tok != BOT_TOKEN)

    # If sender is NOT owner:
    if not is_owner(chat_id):
        if has_separate_public_bot:
            denied_msg = (
                f"👑 <b>3D Birthday Studio — Owner Panel</b>\n\n"
                f"Hello <b>{user_name}</b>, this bot is private and accessible strictly to the <b>Owner</b>.\n"
                f"To create your own 3D Birthday Surprise or view chat answers, please use our Public User Bot!"
            )
            send_tg_message(chat_id, denied_msg)
            return
        else:
            # Single Bot Mode: Seamlessly route public users to Public User Bot engine!
            try:
                import public_user_bot
                public_user_bot.process_user_text(chat_id, user_name, text)
            except Exception as _pe:
                print(f"[Public Dispatch Error]: {_pe}")
            return

    cmd = text.strip().lower()

    # 1. /start command
    if cmd in ["/start", "start"]:
        welcome_text = (
            f"👑 <b>Owner Control Panel - 3D Birthday Studio</b> 🤖💖\n\n"
            f"Welcome, Owner <b>{user_name}</b>!\n\n"
            f"📋 <b>Bot Menu:</b>\n"
            f"• 👤 <b>User:</b> View all users with passwords (1. 2. 3...)\n"
            f"• 🟢 <b>Active User:</b> Users logged in today or with valid surprise link\n"
            f"• 🌐 <b>Open Web App:</b> Launch 3D Birthday Web App\n\n"
            f"<i>🔒 Access is locked exclusively to your Chat ID (<code>{chat_id}</code>).</i>"
        )
        inline_keyboard = {
            "inline_keyboard": [
                [{"text": "👤 All Users & Passwords", "callback_data": "menu_users"}],
                [{"text": "🟢 Active Users (Today / Valid Link)", "callback_data": "menu_active"}],
                [{"text": "🌐 Open Birthday Web App", "url": config.get("web_app_url", "http://localhost:8000/")}]
            ]
        }
        send_tg_message(chat_id, welcome_text, reply_markup=get_main_reply_keyboard())
        send_tg_message(chat_id, "👇 Quick Actions:", reply_markup=inline_keyboard)
        return

    # 2. 👤 User command
    elif cmd in ["👤 user", "user", "/user", "/users"]:
        show_all_users(chat_id)
        return

    # 3. 🟢 Active User command
    elif cmd in ["🟢 active user", "active user", "/active", "/activeuser", "/active_user", "/activeusers"]:
        show_active_users(chat_id)
        return

    # 4. 🌐 Open Web App command
    elif cmd in ["🌐 open web app", "open web app", "/webapp", "webapp", "web app"]:
        show_webapp_link(chat_id)
        return

    # 5. /myid command
    elif cmd == "/myid":
        send_tg_message(chat_id, f"🆔 <b>Your Telegram Chat ID:</b> <code>{chat_id}</code> (Owner: {'✅ YES' if is_owner(chat_id) else '❌ NO'})")
        return

    # Fallback response
    send_tg_message(chat_id, "Choose an option from the menu below: 👤 User | 🟢 Active User | 🌐 Open Web App", reply_markup=get_main_reply_keyboard())
    return

def get_portal_users():
    """Retrieve all portal registered users with their details (passwords masked)."""
    users = {}
    # 1. Load from UserStore
    try:
        store_users = user_store.get_all_users()
        for u in store_users:
            uname = u.get("username", "")
            if not uname:
                continue
            users[uname] = {
                "username": uname,
                "password": "🔒 Protected",
                "registered_at": u.get("registered_at", "Recorded"),
                "last_login": u.get("last_login", "Recorded"),
                "last_login_date": time.strftime("%Y-%m-%d", time.localtime(u.get("last_login_ts", time.time()))),
                "last_login_ts": u.get("last_login_ts", time.time())
            }
    except Exception as e:
        print(f"[Portal Users Error]: {e}")

    # 2. Backward compatibility with legacy config keys
    raw = config.get("birthday_portal_users", {})
    if isinstance(raw, dict):
        for u, val in raw.items():
            if u not in users:
                users[u] = {
                    "username": u,
                    "password": "🔒 Protected",
                    "registered_at": "Recorded",
                    "last_login": "Recorded",
                    "last_login_date": time.strftime("%Y-%m-%d"),
                    "last_login_ts": time.time()
                }
    return users

def show_all_users(chat_id):
    users = get_portal_users()
    if not users:
        send_tg_message(
            chat_id,
            "👤 <b>NO USERS REGISTERED YET!</b>\n\nAbhi tak kisi user ne website par register ya login nahi kiya hai.",
            reply_markup=get_main_reply_keyboard()
        )
        return

    now_ms = time.time() * 1000.0
    msg = f"👥 <b>TOTAL USERS LIST ({len(users)})</b>\n"
    msg += f"<i>All users registered in 3D Birthday Studio:</i>\n"
    msg += f"{'━' * 28}\n\n"

    for idx, (uname, udata) in enumerate(sorted(users.items()), start=1):
        reg_time = udata.get("registered_at", "N/A")
        last_login = udata.get("last_login", reg_time)

        link_info = config.get("link_expiries", {}).get(uname, {})
        exp_ts = link_info.get("expires_at", 0) if link_info else 0
        link_active = bool(exp_ts and (exp_ts > now_ms))

        st_tag = "🟢 Link Active" if link_active else "⚪ Registered"

        msg += (
            f"<b>{idx}. Username:</b> <code>{uname}</code>\n"
            f"   🔑 <b>Password:</b> <code>•••••••• (Encrypted)</code>\n"
            f"   📅 <b>Registered:</b> {reg_time}\n"
            f"   ⏱ <b>Last Login:</b> {last_login}\n"
            f"   🏷 <b>Status:</b> {st_tag}\n\n"
        )

    send_tg_message(chat_id, msg, reply_markup=get_main_reply_keyboard())

def show_active_users(chat_id):
    users = get_portal_users()
    today_str = time.strftime("%Y-%m-%d")
    now_ts = time.time()
    now_ms = now_ts * 1000.0

    active_list = []

    for uname, udata in sorted(users.items()):
        last_date = udata.get("last_login_date", "")
        last_ts = udata.get("last_login_ts", 0)
        last_login_str = udata.get("last_login", "Today")

        # Criteria 1: Logged in today (same calendar date or within last 24h)
        logged_in_today = (last_date == today_str) or (last_ts and (now_ts - last_ts) < 86400)

        # Criteria 2: Has shared link that hasn't expired yet
        link_info = config.get("link_expiries", {}).get(uname, {})
        exp_ts = link_info.get("expires_at", 0) if link_info else 0
        link_active = bool(exp_ts and (exp_ts > now_ms))
        time_left_str = ""
        if link_active:
            diff_sec = int((exp_ts - now_ms) / 1000)
            hours_left = diff_sec // 3600
            mins_left = (diff_sec % 3600) // 60
            time_left_str = f"{hours_left}h {mins_left}m left"

        if logged_in_today or link_active:
            reasons = []
            if logged_in_today:
                reasons.append("🟢 Logged in today")
            if link_active:
                reasons.append(f"🔗 Surprise link active ({time_left_str})")

            active_list.append({
                "username": uname,
                "last_login": last_login_str,
                "reasons": reasons
            })

    if not active_list:
        send_tg_message(
            chat_id,
            "🟢 <b>NO ACTIVE USERS FOUND!</b>\n\nAaj kisi ne login nahi kiya hai aur na hi kisi user ka active surprise link bacha hai.",
            reply_markup=get_main_reply_keyboard()
        )
        return

    msg = f"🟢 <b>ACTIVE USERS ({len(active_list)})</b>\n"
    msg += f"<i>Users who logged in today OR whose surprise link is still active:</i>\n"
    msg += f"{'━' * 28}\n\n"

    for idx, u in enumerate(active_list, start=1):
        reason_txt = " | ".join(u["reasons"])
        msg += (
            f"<b>{idx}. Username:</b> <code>{u['username']}</code>\n"
            f"   🔑 <b>Password:</b> <code>•••••••• (Encrypted)</code>\n"
            f"   ⏱ <b>Last Login:</b> {u['last_login']}\n"
            f"   ⚡ <b>Active Why:</b> {reason_txt}\n\n"
        )

    send_tg_message(chat_id, msg, reply_markup=get_main_reply_keyboard())

def show_webapp_link(chat_id):
    url = config.get("web_app_url", "http://localhost:8000/")
    msg = (
        f"🌐 <b>3D Birthday Studio - Web App</b>\n\n"
        f"• <b>URL:</b> <code>{url}</code>\n"
        f"• <b>Status:</b> Online & Synced with Bot 🤖💖\n\n"
        f"Tap the button below to open the Web App:"
    )
    inline_keyboard = {
        "inline_keyboard": [
            [{"text": "🚀 Open Web App Now", "url": url}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=inline_keyboard)

def show_deactive_users(chat_id):
    users = config.get("registered_users", {})
    deactive_users = {k: v for k, v in users.items() if v.get("status") == "deactive"}

    if not deactive_users:
        send_tg_message(chat_id, "🔴 <b>No deactivated users!</b> All registered users are currently active. 🟢", reply_markup=get_main_reply_keyboard())
        return

    msg = f"🔴 <b>DEACTIVATED USERS ({len(deactive_users)})</b>\n\n"
    keyboard_buttons = []

    for uid, u in deactive_users.items():
        msg += (
            f"⛔ <b>{u.get('name', 'Unknown')}</b> ({u.get('username', 'N/A')})\n"
            f"  <b>ID:</b> <code>{uid}</code>\n"
            f"  <b>Status:</b> Deactivated\n\n"
        )
        keyboard_buttons.append([{"text": f"🟢 Reactivate {u.get('name')}", "callback_data": f"toggle_user_{uid}"}])

    keyboard = {"inline_keyboard": keyboard_buttons} if keyboard_buttons else None
    send_tg_message(chat_id, msg, reply_markup=keyboard)

def toggle_user_status(chat_id, target_uid):
    users = config.get("registered_users", {})
    if target_uid in users:
        current_status = users[target_uid].get("status", "active")
        new_status = "deactive" if current_status == "active" else "active"
        users[target_uid]["status"] = new_status
        config["registered_users"] = users
        save_config(config)

        status_text = "🟢 Activated" if new_status == "active" else "🔴 Deactivated"
        send_tg_message(chat_id, f"✅ User <b>{users[target_uid].get('name')}</b> is now <b>{status_text}</b>!")
    else:
        send_tg_message(chat_id, "⚠️ User not found!")

def start_create_wizard(chat_id):
    user_sessions[chat_id] = {"step": "mode"}
    keyboard = {
        "inline_keyboard": [
            [{"text": "👸 For My Girlfriend (Romantic)", "callback_data": "mode_gf"}],
            [{"text": "👦 For My Boyfriend (Special)", "callback_data": "mode_bf"}]
        ]
    }
    send_tg_message(chat_id, "🎁 <b>Step 1 of 6:</b> Who is this surprise for?", reply_markup=keyboard)

def process_callback_query(chat_id, cb_data, cb_raw):
    # Answer callback query to stop loading spinner
    try:
        requests.post(f"{BASE_TG_URL}/answerCallbackQuery", json={"callback_query_id": cb_raw["id"]})
    except Exception:
        pass

    # Owner vs Public routing for callback buttons
    pub_tok = config.get("public_bot_token", "").strip()
    has_separate_public_bot = bool(pub_tok and pub_tok != BOT_TOKEN)

    if not is_owner(chat_id):
        if not has_separate_public_bot:
            try:
                import public_user_bot
                public_user_bot.process_callback(chat_id, cb_data, cb_raw)
            except Exception as _pe:
                print(f"[Public CB Dispatch Error]: {_pe}")
        else:
            send_tg_message(chat_id, "⛔ <b>Access Denied!</b> Owner only.")
        return

    if cb_data == "start_create":
        start_create_wizard(chat_id)

    elif cb_data == "view_answers":
        show_saved_answers(chat_id)

    elif cb_data == "menu_users":
        show_all_users(chat_id)

    elif cb_data == "menu_active":
        show_active_users(chat_id)

    elif cb_data == "menu_webapp":
        show_webapp_link(chat_id)

    elif cb_data == "menu_deactive":
        show_deactive_users(chat_id)

    elif cb_data.startswith("toggle_user_"):
        target_uid = cb_data.replace("toggle_user_", "")
        toggle_user_status(chat_id, target_uid)

    elif cb_data == "bot_help":
        send_tg_message(chat_id, "💡 <b>Need Help?</b>\n\nRun the web app on <code>http://localhost:8000</code> or deploy it. When your girlfriend types her answers, this bot will instantly deliver them here in real-time!")

    elif cb_data.startswith("mode_"):
        mode = cb_data.replace("mode_", "")
        session = user_sessions.setdefault(chat_id, {})
        session["mode"] = mode
        session["step"] = "name"
        target_str = "Girlfriend" if mode == "gf" else "Boyfriend"
        send_tg_message(chat_id, f"✨ Creating surprise for <b>{target_str}</b>!\n\nWhat is their <b>Real Name</b>? (e.g. <i>Ananya / Rahul</i>):")

    elif cb_data.startswith("theme_"):
        theme = cb_data.replace("theme_", "")
        session = user_sessions.setdefault(chat_id, {})
        session["theme"] = theme
        session["step"] = "wish"
        send_tg_message(
            chat_id,
            f"🎨 Theme selected: <code>{theme}</code>\n\n"
            "💌 Enter your <b>Heartfelt Birthday Message / Love Letter</b>:\n"
            "(Or send a short paragraph expressing your love 💕)"
        )

def finish_create_wizard(chat_id, session):
    base_url = config.get("web_app_url", "http://localhost:8000").rstrip("/")
    params = {
        "surprise": "1",
        "mode": session.get("mode", "gf"),
        "name": session.get("name", "My Love"),
        "nickname": session.get("nickname", ""),
        "age": session.get("age", ""),
        "theme": session.get("theme", "rose-glamour"),
        "wish": session.get("wish", "Happy Birthday! Wishing you endless love, joy, and smiles today and always! 💖"),
        "photo": session.get("photo", "")
    }

    # Filter empty values
    query_str = urllib.parse.urlencode({k: v for k, v in params.items() if v})
    final_link = f"{base_url}/?{query_str}"

    celebrant_name = session.get("name", "My Love")
    target_role = "Girlfriend 👸" if session.get("mode") == "gf" else "Boyfriend 👦"

    msg_text = (
        f"🎉 <b>MAGICAL SURPRISE LINK GENERATED!</b> 🎁✨\n\n"
        f"• <b>Recipient:</b> {celebrant_name} ({target_role})\n"
        f"• <b>Nickname:</b> {session.get('nickname') or 'N/A'}\n"
        f"• <b>Theme:</b> {session.get('theme')}\n\n"
        f"🔗 <b>Shareable Link:</b>\n<code>{final_link}</code>\n\n"
        f"💌 <i>Send this link to {celebrant_name}. When they open it, their grand 3D birthday celebration with curtains, love albums, live chat, and treats store will begin!</i>"
    )

    keyboard = {
        "inline_keyboard": [
            [{"text": "🚀 Open & Preview Surprise", "url": final_link}],
            [{"text": "🎁 Create Another Link", "callback_data": "start_create"}]
        ]
    }
    send_tg_message(chat_id, msg_text, reply_markup=keyboard)

def show_saved_answers(chat_id):
    """Show owner all recent answers across all users from UserStore."""
    all_users = user_store.get_all_users()
    all_answers = []
    for u in all_users:
        uname = u.get("username", "")
        for ans in u.get("answers", []):
            ans["_user"] = uname
            all_answers.append(ans)

    if not all_answers:
        send_tg_message(chat_id, "💌 <b>No chat answers recorded yet!</b>\n\nOnce your girlfriend answers questions in the live chat during the surprise, her replies will appear right here in real time! 💕")
        return

    # Show last 8 across all users
    recent = all_answers[-8:]
    text = f"💖 <b>SAVED GIRLFRIEND CHAT ANSWERS ({len(all_answers)} total)</b> 💖\n\n"
    for idx, item in enumerate(recent, 1):
        text += (
            f"<b>Q{idx}:</b> {item.get('question', '')}\n"
            f"👸 <b>Her Reply:</b> <i>\"{item.get('reply', '')}\"</i>\n"
            f"👤 <i>User: {item.get('_user', '?')}</i> ⏱ <i>{item.get('time', '')}</i>\n"
            f"{'—'*24}\n"
        )
    send_tg_message(chat_id, text)

# =========================================================
# INTEGRATED HTTP API SERVER (PORT 5000)
# =========================================================
class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[API {self.command}] {self.path} - {format % args}", flush=True)

    def _set_cors(self):
        origin = self.headers.get("Origin", "") if hasattr(self, "headers") and self.headers else ""
        app_url = config.get("web_app_url", "").rstrip("/")
        if origin:
            if (
                (app_url and origin == app_url)
                or origin.endswith(".onrender.com")
                or origin.endswith(".github.io")
                or "localhost" in origin
                or "127.0.0.1" in origin
            ):
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Allow-Credentials", "true")
            else:
                self.send_header("Access-Control-Allow-Origin", "*")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def _send_json(self, status_code, data_dict):
        body = json.dumps(data_dict).encode("utf-8")
        self.send_response(status_code)
        self._set_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()

    def _send_bytes(self, status_code, content_type, b):
        self.send_response(status_code)
        self._set_cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(b)
        self.wfile.flush()

    def _verify_api_auth(self):
        """
        Returns the authenticated username if the request carries a
        valid Bearer token, otherwise returns None.
        Tokens are issued by POST /api/auth and stored in api_tokens.
        """
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header[7:].strip()
        if not token or token not in api_tokens:
            return None
        entry = api_tokens[token]
        if not entry or entry.get("expires_at", 0) < time.time():
            api_tokens.pop(token, None)
            return None
        # Extend TTL on use
        entry["expires_at"] = time.time() + API_TOKEN_TTL
        return entry.get("username")

    def _is_loopback_request(self):
        """True when the TCP peer is this machine (local development)."""
        try:
            host = self.client_address[0] if self.client_address else ""
        except Exception:
            return False
        return host in ("127.0.0.1", "::1", "::ffff:127.0.0.1")

    def _require_admin(self):
        """
        Gate for destructive admin endpoints (/api/save_env, /api/test_bot).

        Those endpoints can overwrite bot tokens / owner chat id and can
        send Telegram messages, so a logged-in *regular* user token must
        NOT suffice. Two tiers:

          1. If ADMIN_SECRET env var is set (Render/production): the
             request must carry a matching `X-Admin-Secret` header
             (constant-time compare). Loopback alone is NOT enough,
             because behind a reverse proxy client_address is the proxy.
          2. If ADMIN_SECRET is unset (local dev): only loopback
             requests are allowed; every remote request is denied.

        Returns True when the request is authorised as admin.
        """
        secret = os.environ.get("ADMIN_SECRET", "").strip()
        if secret:
            given = ""
            try:
                given = (self.headers.get("X-Admin-Secret", "") or "").strip()
            except Exception:
                given = ""
            try:
                if given and hmac.compare_digest(given, secret):
                    return True
            except Exception:
                pass
            return False
        return self._is_loopback_request()

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        global BOT_TOKEN, BASE_TG_URL
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")

        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        if self.path == "/api/auth":
            # Public login endpoint — verifies credentials and returns a session token.
            username = data.get("username", "").strip().lower()
            password = data.get("password", "")
            if not username or not password:
                self._send_json(400, {"status": "error", "message": "username and password required"})
                return
            if not user_store.user_exists(username):
                self._send_json(401, {"status": "error", "message": "Invalid credentials"})
                return
            if not user_store.verify_password(username, password):
                self._send_json(401, {"status": "error", "message": "Invalid credentials"})
                return
            token = secrets.token_hex(32)
            api_tokens[token] = {
                "username": username,
                "issued_at": time.time(),
                "expires_at": time.time() + API_TOKEN_TTL,
            }
            self._send_json(200, {"status": "success", "token": token})
            return

        # --- Authenticated endpoints ---
        _auth_user = self._verify_api_auth()
        if self.path in (
            "/api/get_user_data",
            "/api/live_progress",
            "/api/save_user_data",
            "/api/upload_image",
            "/api/save_surprise",
            "/api/live_chat_mark_read",
            "/api/expire_user",
            "/api/save_link_expiry",
            "/api/delete_user",
        ) and not _auth_user:
            self._send_json(401, {"status": "error", "message": "Authentication required"})
            return

        if self.path == "/api/notify_answer":
            # Live Chat Answer notification from girlfriend
            q_num  = data.get("questionNumber", 1)
            q_text = data.get("question", "")
            r_text = data.get("reply", "")
            c_name = data.get("celebrant", "Girlfriend").strip()
            t_str  = data.get("time", time.strftime("%I:%M %p"))
            raw_uname = data.get("username", "").strip().lower()

            # Robust Creator Resolution (even if client sent "user" or empty)
            creator_uname = raw_uname if (raw_uname and raw_uname != "user") else ""
            if not creator_uname:
                # 1. Look up by token if provided
                if data.get("token") and data["token"] in config.get("short_surprise_links", {}):
                    creator_uname = config["short_surprise_links"][data["token"]].get("username", "").strip().lower()
                # 2. Look up by celebrant name across all surprises
                if not creator_uname:
                    for token_k, sdata in config.get("short_surprise_links", {}).items():
                        if isinstance(sdata, dict) and sdata.get("name", "").strip().lower() == c_name.lower():
                            if sdata.get("username"):
                                creator_uname = sdata.get("username").strip().lower()
                                break
                # 3. Look up in UserStore
                if not creator_uname:
                    for u in user_store.get_all_users():
                        s = u.get("surprise", {})
                        if s.get("name", "").strip().lower() == c_name.lower():
                            creator_uname = u.get("username")
                            break

            username_key = creator_uname if creator_uname else c_name.lower().replace(" ", "_")
            c_key = c_name.lower().replace(" ", "_")

            answer_item = {
                "question":  q_text,
                "reply":     r_text,
                "celebrant": c_name,
                "creator":   creator_uname,
                "time":      t_str,
                "q_num":     q_num,
            }

            # Save in UserStore for creator and celebrant
            user_store.add_answer(username_key, answer_item)
            if c_key and c_key != username_key:
                user_store.add_answer(c_key, answer_item)

            # Central backup in config["saved_answers"]
            if "saved_answers" not in config:
                config["saved_answers"] = []
            config["saved_answers"].append(answer_item)
            save_config(config)

            # 1. Send Telegram Alert to Owner Bot
            owner_id = str(config.get("owner_chat_id", "")).strip()
            if owner_id and BOT_TOKEN and "YOUR_TELEGRAM" not in BOT_TOKEN:
                creator_tag = f"<code>{creator_uname}</code>" if creator_uname else "<code>Web App Guest</code>"
                notif_text = (
                    f"💌 <b>NEW GIRLFRIEND CHAT REPLY RECEIVED!</b> 👸💖\n\n"
                    f"• 👸 <b>From:</b> {c_name} (for Creator: {creator_tag})\n"
                    f"• ❓ <b>Q{q_num}:</b> {q_text}\n"
                    f"• 💬 <b>Her Answer:</b> <code>\"{r_text}\"</code>\n\n"
                    f"⏱ <i>Received at {t_str}</i>"
                )
                send_tg_message(owner_id, notif_text)

            # 2. If creator registered via Public Bot (has their own tg_chat_id), notify them directly in Telegram!
            user_rec = user_store.load_user(username_key)
            user_tg_id = user_rec.get("tg_chat_id") if user_rec else None
            if user_tg_id and str(user_tg_id) != owner_id:
                user_notif = (
                    f"💌 <b>NEW CHAT REPLY FROM {c_name.upper()}!</b> 👸💖\n\n"
                    f"• ❓ <b>Q{q_num}:</b> {q_text}\n"
                    f"• 💬 <b>Answer:</b> <code>\"{r_text}\"</code>\n\n"
                    f"⏱ <i>Received at {t_str}</i>\n\n"
                    f"👉 Tap /answers in bot anytime to see the complete Q&A collection!"
                )
                send_tg_message(user_tg_id, user_notif)

            # 3. Trigger debounced Cloud Backup to Telegram
            backup_database_to_telegram_cloud()

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Answer recorded & notified!"}).encode("utf-8"))
            return

        elif self.path == "/api/save_env":
            # 🔒 Admin-only gate (see WebhookHandler._require_admin).
            if not self._require_admin():
                self._send_json(403, {"status": "error", "message": "Admin access required"})
                return
            new_token = data.get("bot_token", "").strip()
            new_public_token = data.get("public_bot_token", "").strip()
            new_chat_id = str(data.get("owner_chat_id", "")).strip()
            new_url = data.get("web_app_url", "").strip()

            if new_token:
                config["bot_token"] = new_token
                BOT_TOKEN = new_token
                BASE_TG_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
            if "public_bot_token" in data:
                config["public_bot_token"] = new_public_token
            if new_chat_id:
                config["owner_chat_id"] = new_chat_id
            if new_url:
                config["web_app_url"] = new_url

            save_config(config)

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Environment Variables & Bot Tokens saved successfully!"}).encode("utf-8"))
            return

        elif self.path == "/api/test_bot":
            # 🔒 Admin-only gate (see WebhookHandler._require_admin).
            # Without this, anyone could use this server to validate
            # arbitrary bot tokens and send messages to arbitrary chats.
            if not self._require_admin():
                self._send_json(403, {"status": "error", "message": "Admin access required"})
                return
            token_to_test = data.get("bot_token", "").strip() or BOT_TOKEN
            chat_id_test = str(data.get("owner_chat_id", "")).strip() or config.get("owner_chat_id", "")

            if not token_to_test or "YOUR_TELEGRAM" in token_to_test:
                self.send_response(200)
                self._set_cors()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": "Please enter a valid Bot Token from @BotFather"}).encode("utf-8"))
                return

            try:
                test_res = requests.get(f"https://api.telegram.org/bot{token_to_test}/getMe", timeout=8).json()
                if test_res.get("ok"):
                    bot_info = test_res.get("result", {})
                    bot_name = bot_info.get("first_name", "Birthday Bot")
                    bot_username = bot_info.get("username", "bot")

                    # Send test ping message to chat_id if provided
                    if chat_id_test:
                        try:
                            ping_msg = (
                                f"🚀 <b>TELEGRAM BOT CONNECTED SUCCESSFULLY!</b> 💖✨\n\n"
                                f"• <b>Bot Name:</b> {bot_name} (@{bot_username})\n"
                                f"• <b>Status:</b> Online & Synced with Web App!\n"
                                f"• <b>Web App:</b> {config.get('web_app_url', 'http://localhost:8000')}\n\n"
                                f"<i>Whenever your girlfriend answers questions in the surprise chat, alerts will arrive here in real time!</i> 💕"
                            )
                            requests.post(f"https://api.telegram.org/bot{token_to_test}/sendMessage", json={
                                "chat_id": chat_id_test,
                                "text": ping_msg,
                                "parse_mode": "HTML"
                            }, timeout=8)
                        except Exception:
                            pass

                    self.send_response(200)
                    self._set_cors()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "ok": True,
                        "bot_name": bot_name,
                        "username": bot_username,
                        "message": f"Connected to @{bot_username}!"
                    }).encode("utf-8"))
                    return
                else:
                    self.send_response(200)
                    self._set_cors()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "ok": False,
                        "error": test_res.get("description", "Invalid Telegram Bot Token")
                    }).encode("utf-8"))
                    return
            except Exception as ex:
                self.send_response(200)
                self._set_cors()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(ex)}).encode("utf-8"))
                return

        elif self.path == "/api/status":
            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "running", "bot_configured": bool(BOT_TOKEN and "YOUR" not in BOT_TOKEN)}).encode("utf-8"))
            return

        elif self.path == "/api/save_user_data":
            # Save user's form data (name, photo, wish, theme etc.) keyed by username.
            # Sanitize legacy token-bearing URLs so they are never stored/returned.
            username_key = data.get("username", "").lower().strip()
            user_data = data.get("user_data", {})
            if username_key and user_data:
                if "portal_user_data" not in config:
                    config["portal_user_data"] = {}
                if isinstance(user_data, dict):
                    user_data = sanitize_surprise_payload(user_data)
                config["portal_user_data"][username_key] = user_data
                save_config(config)
                self.send_response(200)
                self._set_cors()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "User data saved!"}).encode("utf-8"))
            else:
                self.send_response(400)
                self._set_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error"}).encode("utf-8"))
            return

        elif self.path == "/api/delete_user":
            # Permanently delete a user account
            username_key = data.get("username", "").lower().strip()
            password = data.get("password", "").strip()

            if not username_key:
                self._send_json(400, {"status": "error", "message": "Username required"})
                return

            # Strict Password Verification via UserStore
            if user_store.user_exists(username_key):
                if not user_store.verify_password(username_key, password):
                    self._send_json(403, {"status": "error", "message": "Invalid password"})
                    return
            else:
                # Check legacy config fallback
                saved = config.get("birthday_portal_users", {})
                legacy_entry = saved.get(username_key) if isinstance(saved, dict) else None
                if legacy_entry:
                    legacy_pwd = legacy_entry.get("password", "") if isinstance(legacy_entry, dict) else str(legacy_entry)
                    if legacy_pwd and legacy_pwd != password:
                        self._send_json(403, {"status": "error", "message": "Invalid password"})
                        return
                else:
                    self._send_json(404, {"status": "error", "message": "User not found"})
                    return


            deleted_items = []

            # 1. Delete photos from Telegram CDN first (before user file is gone)
            try:
                delete_user_photos_from_telegram(username_key)
                deleted_items.append("Telegram CDN photos")
            except Exception as _pe:
                print(f"[Delete] Photo cleanup error: {_pe}")

            # 2. Delete user from UserStore (removes users/{username}.json)
            if user_store.delete_user(username_key):
                deleted_items.append("User data file (credentials, answers, surprise, chat)")

            # 3. Also clean any legacy config keys (backward compat)
            changed = False
            for key in ("birthday_portal_users", "portal_user_data", "link_expiries", "live_chats"):
                section = config.get(key, {})
                if isinstance(section, dict) and username_key in section:
                    del section[username_key]
                    config[key] = section
                    changed = True
            if changed:
                save_config(config)

            delete_time = time.strftime("%d %b %Y, %I:%M %p")

            # 4. Notify owner on Telegram
            owner_id = config.get("owner_chat_id", "")
            if BOT_TOKEN and "YOUR_TELEGRAM" not in BOT_TOKEN and owner_id:
                try:
                    notif = (
                        f"\ud83d\uddd1\ufe0f <b>USER ACCOUNT DELETED</b>\n\n"
                        f"\u2022 <b>Username:</b> <code>{username_key}</code>\n"
                        f"\u2022 <b>Deleted:</b> {', '.join(deleted_items)}\n"
                        f"\u2022 <b>Time:</b> {delete_time}\n\n"
                        f"All data permanently purged. \u2705"
                    )
                    requests.post(f"{BASE_TG_URL}/sendMessage", json={
                        "chat_id": owner_id,
                        "text": notif,
                        "parse_mode": "HTML"
                    }, timeout=8)
                except Exception as e:
                    print(f"[TG Delete Notify Error]: {e}")

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "deleted_items": deleted_items,
                "message": "Account and all data permanently deleted."
            }).encode("utf-8"))
            return

        elif self.path == "/api/save_link_expiry":
            # Saves 48-hour link expiry timestamp for user
            username_key = data.get("username", "").lower().strip()
            gen_at = data.get("link_generated_at", int(time.time() * 1000))
            exp_at = data.get("link_expires_at", gen_at + (48 * 3600 * 1000))
            link = data.get("link", "")

            if "link_expiries" not in config:
                config["link_expiries"] = {}

            config["link_expiries"][username_key] = {
                "generated_at": gen_at,
                "expires_at": exp_at,
                "expires_at_sec": exp_at / 1000.0,
                "link": link,
                "created_str": time.strftime("%d %b %Y, %I:%M %p")
            }

            if "portal_user_data" in config and username_key in config["portal_user_data"]:
                config["portal_user_data"][username_key]["link_expires_at"] = exp_at

            save_config(config)

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Link expiry recorded (48h)"}).encode("utf-8"))
            return

        elif self.path == "/api/sync_portal_user":
            # Syncs user registration or login with UserStore
            username_key = data.get("username", "").lower().strip()
            password = data.get("password", "").strip()
            action = data.get("action", "login")

            if not username_key:
                self._send_json(400, {"status": "error", "message": "Username required"})
                return

            if action == "register":
                if user_store.user_exists(username_key):
                    self._send_json(400, {
                        "status": "error",
                        "message": f"Username '{username_key}' is already registered! Please choose a different username or switch to Returning User tab to log in."
                    })
                    return
                user_store.create_user(username_key, password)
            else:
                if not user_store.user_exists(username_key):
                    user_store.create_user(username_key, password)
                else:
                    if password:
                        user_store.set_password(username_key, password)
                    user_store.update_last_login(username_key)

            backup_database_to_telegram_cloud()
            self._send_json(200, {"status": "success", "message": "User credentials securely synced with UserStore!"})
            return

        elif self.path == "/api/expire_user":
            # Immediately wipe user data due to 48hr / 72hr expiration
            username_key = data.get("username", "").lower().strip()
            reason = data.get("reason", "48hr_link_expired")

            # 1. Delete photos from Telegram first
            try:
                delete_user_photos_from_telegram(username_key)
            except Exception:
                pass

            # 2. Delete from UserStore
            user_store.delete_user(username_key)

            # 3. Clean legacy config keys
            changed = False
            for key in ("birthday_portal_users", "portal_user_data", "link_expiries", "live_chats"):
                section = config.get(key, {})
                if isinstance(section, dict) and username_key in section:
                    del section[username_key]
                    config[key] = section
                    changed = True
            if changed:
                save_config(config)

            # 4. Notify owner
            owner_id = config.get("owner_chat_id", "")
            if BOT_TOKEN and "YOUR_TELEGRAM" not in BOT_TOKEN and owner_id:
                try:
                    notif = (
                        f"\u23f0 <b>AUTO-EXPIRED USER DELETED ({reason.upper()})</b>\n\n"
                        f"\u2022 <b>User:</b> <code>{username_key}</code>\n"
                        f"\u2022 <b>Reason:</b> 48h link expiry / 72h idle timeout.\n"
                        f"\u2022 <b>Status:</b> Photos (TG CDN), answers, credentials permanently purged. \u2705\n\n"
                        f"<i>As per privacy policy, user data has been permanently purged.</i>"
                    )
                    requests.post(f"{BASE_TG_URL}/sendMessage", json={
                        "chat_id": owner_id,
                        "text": notif,
                        "parse_mode": "HTML"
                    }, timeout=8)
                except Exception:
                    pass

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "User expired & purged"}).encode("utf-8"))
            return

        elif self.path == "/api/track_activity":
            # Track real-time recipient activity
            username_key = data.get("username", "user").lower().strip()
            action = data.get("action", "activity")
            details = data.get("details", "")
            icon = data.get("icon", "✨")
            time_str = data.get("time", time.strftime("%I:%M %p"))

            if "live_activities" not in config:
                config["live_activities"] = {}
            if username_key not in config["live_activities"]:
                config["live_activities"][username_key] = []

            activity_item = {
                "action": action,
                "details": details,
                "icon": icon,
                "time": time_str,
                "timestamp": time.time()
            }
            # Keep latest 40 activities
            config["live_activities"][username_key].append(activity_item)
            if len(config["live_activities"][username_key]) > 40:
                config["live_activities"][username_key] = config["live_activities"][username_key][-40:]

            save_config(config)

            # Send Telegram alert for critical milestones
            owner_id = config.get("owner_chat_id", "")
            if BOT_TOKEN and "YOUR_TELEGRAM" not in BOT_TOKEN and owner_id:
                if action in ["link_opened", "safarnama_opened", "follow_chat_clicked", "gift_opened"]:
                    notif = (
                        f"📡 <b>LIVE RECIPIENT ACTIVITY DETECTED!</b> {icon}\n\n"
                        f"• <b>User:</b> <code>{username_key}</code>\n"
                        f"• <b>Action:</b> {details}\n"
                        f"• <b>Time:</b> {time_str}\n\n"
                        f"<i>Check your Creator Dashboard live tracking panel!</i> 💖"
                    )
                    send_tg_async(owner_id, notif)

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Activity tracked!"}).encode("utf-8"))
            return

        elif self.path == "/api/live_chat_send":
            # 2-Way Live Chat message between Creator & Celebrant
            username_key = data.get("username", "user").lower().strip()
            sender = data.get("sender", "celebrant") # 'celebrant' or 'creator'
            text = data.get("text", "").strip()
            quote = data.get("quote", None) # { chapter_num, heading, snippet }
            time_str = data.get("time", time.strftime("%I:%M %p"))

            if not text:
                self.send_response(400)
                self._set_cors()
                self.end_headers()
                return

            if "live_chats" not in config:
                config["live_chats"] = {}
            if username_key not in config["live_chats"]:
                config["live_chats"][username_key] = { "messages": [], "has_unread": False }

            msg_item = {
                "id": str(int(time.time() * 1000)),
                "sender": sender,
                "text": text,
                "quote": quote,
                "time": time_str,
                "timestamp": time.time()
            }
            config["live_chats"][username_key]["messages"].append(msg_item)
            if sender == "celebrant":
                config["live_chats"][username_key]["has_unread"] = True

            # Also log as an activity
            if "live_activities" not in config:
                config["live_activities"] = {}
            if username_key not in config["live_activities"]:
                config["live_activities"][username_key] = []
            config["live_activities"][username_key].append({
                "action": "live_chat_msg",
                "details": f"{'Girlfriend' if sender == 'celebrant' else 'Creator'} sent message: \"{text[:35]}...\"",
                "icon": "💬",
                "time": time_str,
                "timestamp": time.time()
            })

            save_config(config)

            # Send Telegram alert if Celebrant sent message
            owner_id = config.get("owner_chat_id", "")
            if sender == "celebrant" and BOT_TOKEN and "YOUR_TELEGRAM" not in BOT_TOKEN and owner_id:
                quote_info = f"\n📌 <b>Quoted:</b> <i>{quote.get('heading', '')}</i>" if quote else ""
                tg_msg = (
                    f"💬 <b>NEW LIVE FOLLOW-UP MESSAGE!</b> 👸💖\n\n"
                    f"• <b>From:</b> Celebrant ({username_key})\n"
                    f"{quote_info}\n"
                    f"• <b>Message:</b> <code>\"{text}\"</code>\n"
                    f"• <b>Time:</b> {time_str}\n\n"
                    f"👉 <i>Open Creator Dashboard Live Chat to reply in real time!</i>"
                )
                send_tg_async(owner_id, tg_msg)

            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Message dispatched!", "data": msg_item}).encode("utf-8"))
            return

        elif self.path == "/api/live_chat_mark_read":
            username_key = data.get("username", "user").lower().strip()
            if "live_chats" in config and username_key in config["live_chats"]:
                config["live_chats"][username_key]["has_unread"] = False
                save_config(config)
            self.send_response(200)
            self._set_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
            return

        elif self.path == "/api/upload_image":
            # Direct base64 image upload to Telegram cloud.
            # Returns a token-free proxy URL (/api/photo?file_id=...) — never a raw TG CDN URL.
            b64_img = data.get("image", "")
            fname = data.get("filename", "photo.jpg")
            uname = data.get("username", "user").lower().strip()
            ptype = data.get("type", "Memory")
            prefix = "portrait" if "portrait" in ptype.lower() else "memory"
            if b64_img:
                saved_url = save_base64_image(b64_img, prefix=prefix, username=uname, photo_type=ptype)
                if saved_url:
                    self._send_json(200, {
                        "status": "success",
                        "url": saved_url,
                        "tg_url": saved_url,
                        "message": "Photo uploaded to Telegram and saved!"
                    })
                    return
            self._send_json(400, {"status": "error", "message": "No valid image data provided"})
            return

        elif self.path == "/api/save_surprise":
            # Save full surprise data, return a 6-char short token
            import random
            import string

            username_key = data.get("username", "user").lower().strip()

            # Convert base64 profile photo to TG CDN (stored as token-free proxy URL)
            if isinstance(data.get("photo"), str) and data.get("photo", "").startswith("data:image/"):
                saved_photo = save_base64_image(data["photo"], prefix="profile", username=username_key, photo_type="Main Portrait")
                if saved_photo:
                    data["photo"] = saved_photo
            elif isinstance(data.get("photo"), str):
                data["photo"] = sanitize_telegram_url(data.get("photo"))

            # Convert any base64 memories photos to TG CDN (stored as proxy URLs)
            if "memories" in data and isinstance(data["memories"], list):
                saved_memories = []
                for item in data["memories"]:
                    if isinstance(item, str):
                        if item.startswith("data:image/"):
                            s = save_base64_image(item, prefix="memory", username=username_key, photo_type="Memories Album")
                            if s:
                                saved_memories.append(s)
                        elif item.startswith("http") or item.startswith("/api/photo"):
                            saved_memories.append(sanitize_telegram_url(item))
                    elif isinstance(item, dict):
                        u = item.get("cdnUrl") or item.get("localUrl") or item.get("url") or ""
                        if u.startswith("data:image/"):
                            s = save_base64_image(u, prefix="memory", username=username_key, photo_type="Memories Album")
                            if s:
                                saved_memories.append(s)
                        elif u.startswith("http") or u.startswith("/api/photo"):
                            saved_memories.append(sanitize_telegram_url(u))
                data["memories"] = saved_memories
            token = data.get("token", "")  # reuse existing token for regeneration
            if not token:
                chars = string.ascii_lowercase + string.digits
                token = "".join(random.choices(chars, k=6))

            if "short_surprise_links" not in config:
                config["short_surprise_links"] = {}

            # Store entire surprise payload under the token
            config["short_surprise_links"][token] = data
            config["short_surprise_links"][token]["token"] = token

            # Also update link_expiries for countdown
            exp_at = data.get("exp", 0)
            gen_at = data.get("gen_at", int(time.time() * 1000))
            if "link_expiries" not in config:
                config["link_expiries"] = {}
            config["link_expiries"][username_key] = {
                "generated_at": gen_at,
                "expires_at": exp_at,
                "expires_at_sec": exp_at / 1000.0,
                "token": token,
                "created_str": time.strftime("%d %b %Y, %I:%M %p")
            }

            save_config(config)

            web_url = config.get("web_app_url", "http://localhost:8000")
            short_link = f"{web_url}?s={token}"

            # Sync surprise to user_store if user exists
            if user_store.user_exists(username_key):
                try:
                    user_store.save_surprise(username_key, {
                        "mode": data.get("mode", "gf"),
                        "name": data.get("name", ""),
                        "nickname": data.get("nickname", ""),
                        "theme": data.get("theme", "rose-glamour"),
                        "wish": data.get("wish", ""),
                        "created_at": gen_at,
                        "expires_at": exp_at,
                        "link": short_link,
                    })
                except Exception as _se:
                    print(f"[UserStore Sync Surprise Error]: {_se}")

            # Send Telegram Alert to Owner
            owner_id = str(config.get("owner_chat_id", "")).strip()
            if owner_id and BOT_TOKEN and "YOUR_TELEGRAM" not in BOT_TOKEN:
                try:
                    tg_msg = (
                        f"🎁 <b>3D BIRTHDAY SURPRISE LINK GENERATED!</b> ✨💖\n\n"
                        f"• 👤 <b>Creator:</b> <code>{username_key}</code>\n"
                        f"• 👸 <b>Celebrant:</b> {data.get('name', 'My Love')}\n"
                        f"• 🎨 <b>Theme:</b> {data.get('theme', 'rose-glamour')}\n"
                        f"• 🔗 <b>Live Link:</b> {short_link}\n"
                        f"• ⏳ <b>Retention:</b> 48 Hours\n\n"
                        f"<i>Whenever the celebrant opens this link or answers chat questions, alerts will arrive here in real time!</i>"
                    )
                    send_tg_message(owner_id, tg_msg)
                except Exception:
                    pass

            # Backup database snapshot to Telegram Cloud
            backup_database_to_telegram_cloud()

            self._send_json(200, {
                "status": "success",
                "token": token,
                "short_link": short_link
            })
            return

        self._send_json(404, {"status": "not_found"})

    def do_GET(self):
        if self.path == "/api/get_env":
            # Safe public configuration (never expose raw bot tokens or chat IDs)
            self._send_json(200, {
                "web_app_url": config.get("web_app_url", "http://localhost:8000"),
                "bot_configured": bool(BOT_TOKEN and "YOUR" not in BOT_TOKEN)
            })
            return

        elif self.path == "/api/status":
            self._send_json(200, {
                "status": "running",
                "bot_configured": bool(BOT_TOKEN and "YOUR" not in BOT_TOKEN),
                "total_answers_saved": len(config.get("saved_answers", [])),
                "web_app_url": config.get("web_app_url")
            })
            return

        elif self.path.startswith("/api/check_link_status"):
            import urllib.parse as up
            qs = up.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
            username_key = qs.get("username", [""])[0].lower().strip()
            exp_param = qs.get("exp", [""])[0].strip()

            now_ms = time.time() * 1000.0
            is_expired = False
            exp_ts = 0

            if exp_param:
                try:
                    exp_ts = float(exp_param)
                    is_expired = now_ms >= exp_ts
                except Exception:
                    pass

            if not is_expired and username_key:
                user_exp = config.get("link_expiries", {}).get(username_key, {})
                if user_exp:
                    exp_ts = user_exp.get("expires_at", 0)
                    is_expired = now_ms >= exp_ts

            time_left_sec = max(0, int((exp_ts - now_ms) / 1000)) if exp_ts else 0

            self._send_json(200, {
                "status": "success",
                "is_expired": is_expired,
                "expires_at": exp_ts,
                "time_left_seconds": time_left_sec
            })
            return

        elif self.path.startswith("/api/get_user_data"):
            # Auth required: only the authenticated creator can view data.
            _auth_user = self._verify_api_auth()
            if not _auth_user:
                self._send_json(401, {"status": "error", "message": "Authentication required"})
                return
            import urllib.parse as up
            qs = up.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
            username_key = qs.get("username", [""])[0].lower().strip()
            # Creator can only access their own data
            if username_key != _auth_user:
                self._send_json(403, {"status": "error", "message": "Forbidden"})
                return
            user_data = config.get("portal_user_data", {}).get(username_key, {})
            portal_users = config.get("birthday_portal_users", {})
            is_existing = (username_key in portal_users) or user_store.user_exists(username_key)

            # If user configured surprise via Public Bot, restore it directly into the web app!
            if (not user_data or not user_data.get("name")) and user_store.user_exists(username_key):
                s = user_store.get_surprise(username_key)
                photos = user_store.get_photos(username_key)
                main_photo = photos[0].get("url", "") if photos else ""
                memories_photos = [p.get("url") for p in photos if p.get("url")]
                if s and s.get("name"):
                    user_data = {
                        "name": s.get("name", ""),
                        "nickname": s.get("nickname", ""),
                        "age": s.get("age", ""),
                        "theme": s.get("theme", "rose-glamour"),
                        "wish": s.get("wish", ""),
                        "mode": s.get("mode", "gf"),
                        "photoUrl": s.get("photo", "") or main_photo,
                        "memoriesPhotos": memories_photos
                    }

            # Check if user is banned (in scheduled_deletions with future delete_at)
            is_banned = any(
                d.get("username") == username_key and d.get("delete_at", 0) > time.time()
                for d in config.get("scheduled_deletions", [])
            )

            # Check if user link is 48-hr expired
            link_exp = config.get("link_expiries", {}).get(username_key, {})
            link_expired = False
            if link_exp and (time.time() * 1000.0 >= link_exp.get("expires_at", 0)):
                link_expired = True

            # Sanitize any legacy Telegram CDN URLs before sending to the client
            if isinstance(user_data, dict):
                user_data = sanitize_surprise_payload(user_data)
            self._send_json(200, {
                "status": "success",
                "is_existing_user": is_existing,
                "is_banned": is_banned,
                "link_expired": link_expired,
                "user_data": user_data
            })
            return

        elif self.path.startswith("/api/live_progress"):
            # Auth required: only the authenticated creator can view progress.
            _auth_user = self._verify_api_auth()
            if not _auth_user:
                self._send_json(401, {"status": "error", "message": "Authentication required"})
                return
            import urllib.parse as up
            qs = up.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
            username_key = qs.get("username", ["user"])[0].lower().strip()
            if username_key != _auth_user:
                self._send_json(403, {"status": "error", "message": "Forbidden"})
                return

            acts = config.get("live_activities", {}).get(username_key, [])
            chat_data = config.get("live_chats", {}).get(username_key, { "messages": [], "has_unread": False })

            self._send_json(200, {
                "status": "success",
                "username": username_key,
                "activities": acts,
                "chat": chat_data
            })
            return

        elif self.path.startswith("/api/photo"):
            # Token-free image proxy. Token never leaves the server.
            # Usage: /api/photo?file_id=XXX  (preferred)  or  /api/photo?p=photos/file_X.jpg (legacy)
            import urllib.parse as up
            qs = up.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
            file_id = qs.get("file_id", [""])[0].strip()
            file_path = qs.get("p", [""])[0].strip()
            if not BOT_TOKEN or "YOUR_TELEGRAM" in BOT_TOKEN:
                self._send_json(503, {"status": "error", "message": "Bot not configured"})
                return
            try:
                if file_id:
                    # Basic validation: Telegram file_ids are opaque base64-ish strings
                    if len(file_id) > 256 or not re.match(r"^[A-Za-z0-9_\-=+/:]+$", file_id):
                        self._send_json(400, {"status": "error", "message": "Invalid file_id"})
                        return
                    file_path = get_telegram_file_path(file_id)
                    if not file_path:
                        self._send_json(404, {"status": "not_found", "message": "File not found"})
                        return
                if not file_path:
                    self._send_json(400, {"status": "error", "message": "Missing photo reference"})
                    return
                # Strict allowlist: prevent path traversal / SSRF
                file_path = urllib.parse.unquote(file_path)
                if ".." in file_path or file_path.startswith("/") or "://" in file_path:
                    self._send_json(400, {"status": "error", "message": "Invalid file path"})
                    return
                if not re.match(r"^[A-Za-z0-9_\-/\.]+$", file_path):
                    self._send_json(400, {"status": "error", "message": "Invalid file path"})
                    return
                img_bytes = fetch_telegram_file_bytes(file_path)
                ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else "jpg"
                mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                            "webp": "image/webp", "gif": "image/gif", "mp4": "video/mp4"}
                content_type = mime_map.get(ext, "image/jpeg")
                self.send_response(200)
                self._set_cors()
                # Allow <img> + canvas use across origins; cache aggressively (files are immutable)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(img_bytes)))
                self.send_header("Cache-Control", "public, max-age=86400, immutable")
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(img_bytes)
                self.wfile.flush()
                return
            except Exception as e:
                print(f"[Photo Proxy Error]: {e}")
                self._send_json(502, {"status": "error", "message": "Failed to fetch photo"})
                return

        elif self.path.startswith("/api/get_surprise"):
            # Returns full surprise data for a short token.
            # All Telegram CDN URLs are sanitized to token-free proxy URLs before sending.
            import urllib.parse as up
            qs = up.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
            token = qs.get("s", [""])[0].strip()
            surprises_db = config.get("short_surprise_links", {})
            entry = surprises_db.get(token)
            if entry:
                # Check if link expired
                exp_at = entry.get("exp", 0)
                now_ms = time.time() * 1000.0
                if exp_at and now_ms >= exp_at:
                    self._send_json(410, {"status": "expired", "message": "Link expired"})
                    return
                self._send_json(200, {"status": "success", "data": sanitize_surprise_payload(entry)})
            else:
                self._send_json(404, {"status": "not_found"})
            return

        elif self.path.startswith("/uploads/"):
            # Serve uploaded images directly from uploads directory
            filename = os.path.basename(urllib.parse.unquote(self.path.split("?")[0]))
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(filepath) and os.path.isfile(filepath):
                ext = filename.split(".")[-1].lower()
                mime_types = {
                    "jpg": "image/jpeg",
                    "jpeg": "image/jpeg",
                    "png": "image/png",
                    "webp": "image/webp",
                    "gif": "image/gif"
                }
                content_type = mime_types.get(ext, "application/octet-stream")
                with open(filepath, "rb") as f:
                    file_bytes = f.read()
                self._send_bytes(200, content_type, file_bytes)
                return
            else:
                self._send_json(404, {"status": "not_found", "message": "Image not found"})
                return

        # Fallback: Serve static web app files (index.html, style.css, js/app.js, media, etc.)
        req_path = self.path.split("?")[0]
        if req_path == "/" or req_path == "":
            req_path = "/index.html"

        workspace_dir = os.path.dirname(os.path.abspath(__file__))
        rel_path = req_path.lstrip("/").replace("/", os.sep)
        full_filepath = os.path.abspath(os.path.join(workspace_dir, rel_path))

        if full_filepath.startswith(workspace_dir) and os.path.isfile(full_filepath):
            mime_types = {
                ".html": "text/html; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
                ".gif": "image/gif",
                ".mp4": "video/mp4",
                ".mp3": "audio/mpeg",
                ".svg": "image/svg+xml",
                ".ico": "image/x-icon"
            }
            ext = os.path.splitext(full_filepath)[1].lower()
            content_type = mime_types.get(ext, "application/octet-stream")
            try:
                with open(full_filepath, "rb") as f:
                    file_bytes = f.read()
                self._send_bytes(200, content_type, file_bytes)
                return
            except Exception as e:
                self._send_json(500, {"status": "error", "message": str(e)})
                return

        self._send_json(200, {
            "status": "ok",
            "message": "Birthday Telegram Sync Server is running",
            "port": config.get("api_port", 5000),
            "bot_configured": bool(BOT_TOKEN and "YOUR" not in BOT_TOKEN)
        })
        return

def cleanup_scheduled_deletions():
    """
    Runs every 60 seconds.
    1. Deletes users whose surprise link has expired (48h)
    2. Deletes users who were manually scheduled for deletion
    3. Deletes idle users who never generated a link (72h)
    Uses the new per-user UserStore - no more flat bot_config.json juggling.
    """
    while True:
        time.sleep(60)
        try:
            now    = time.time()
            now_ms = now * 1000.0
            owner_id = str(config.get("owner_chat_id", "")).strip()

            def notify_owner(text: str):
                if BOT_TOKEN and "YOUR_TELEGRAM" not in BOT_TOKEN and owner_id:
                    try:
                        requests.post(f"{BASE_TG_URL}/sendMessage", json={
                            "chat_id": owner_id,
                            "text": text,
                            "parse_mode": "HTML"
                        }, timeout=8)
                    except Exception:
                        pass

            # Run UserStore scheduled deletions (manual delete requests)
            auto_deleted = user_store.run_scheduled_deletions()
            for uname in auto_deleted:
                delete_user_photos_from_telegram(uname)
                notify_owner(
                    f"\U0001f5d1\ufe0f <b>AUTO-DELETED USER</b>\n\n"
                    f"\u2022 <b>Username:</b> <code>{uname}</code>\n"
                    f"\u2022 <b>Time:</b> {time.strftime('%d %b %Y, %I:%M %p')}\n"
                    f"\u2022 All data (photos, answers, surprise, credentials) permanently erased \u2705"
                )

            # 48h link expiry check + 72h idle check via UserStore
            for user in user_store.get_all_users():
                uname   = user.get("username", "")
                exp_ms  = user.get("surprise", {}).get("expires_at")
                sched   = user.get("scheduled_delete_at")

                if sched:
                    continue

                if exp_ms and now_ms >= float(exp_ms):
                    delete_user_photos_from_telegram(uname)   # delete TG photos first
                    user_store.delete_user(uname)
                    notify_owner(
                        f"\u23f0 <b>48-HOUR LINK EXPIRED - USER DELETED</b>\n\n"
                        f"\u2022 <b>Username:</b> <code>{uname}</code>\n"
                        f"\u2022 <b>Reason:</b> 48-hour surprise link window closed.\n"
                        f"\u2022 Photos (TG CDN), answers, credentials permanently purged \u2705"
                    )
                    continue

                reg_ts   = user.get("registered_ts", 0)
                has_link = bool(user.get("surprise", {}).get("link"))
                if not has_link and reg_ts and (now - reg_ts) >= (72 * 3600):
                    delete_user_photos_from_telegram(uname)   # delete TG photos first
                    user_store.delete_user(uname)
                    notify_owner(
                        f"\u23f0 <b>IDLE USER DELETED (72h, no link)</b>\n\n"
                        f"\u2022 <b>Username:</b> <code>{uname}</code>\n"
                        f"\u2022 <b>Reason:</b> Registered but never created a surprise link in 72 hours.\n"
                        f"\u2022 Account + TG photos permanently removed \u2705"
                    )

        except Exception as e:
            print(f"[Cleanup Error]: {e}")


def setup_telegram_menu():
    """Configures the Telegram 3-line burger menu commands"""
    if not BOT_TOKEN or "YOUR_TELEGRAM_BOT_TOKEN" in BOT_TOKEN:
        return
    commands = [
        {"command": "start", "description": "Start Birthday Bot & Main Menu"},
        {"command": "create", "description": "Create a New 3D Birthday Surprise Link"},
        {"command": "answers", "description": "View Girlfriend's Chat Answers"},
        {"command": "help", "description": "Show Help & Instructions"}
    ]
    try:
        requests.post(f"{BASE_TG_URL}/setMyCommands", json={"commands": commands}, timeout=6)
    except Exception as e:
        print(f"[Telegram Menu Setup]: {e}")

def start_api_server(port=5000):
    server = ThreadingHTTPServer(("0.0.0.0", port), WebhookHandler)
    print(f"🚀 Birthday Webhook API Server running on port {port} (0.0.0.0:{port})")
    server.serve_forever()

# =========================================================
# MAIN ENTRYPOINT
# =========================================================
if __name__ == "__main__":
    effective_port = int(os.environ.get("PORT", config.get("api_port", 5000)))
    print("=" * 60)
    print("✨ 3D Birthday Celebration - Telegram Bot & Sync Server")
    print("=" * 60)
    print(f"• Config file: {CONFIG_FILE}")
    print(f"• Web App URL: {config.get('web_app_url', 'Not configured (using origin)')}")
    print(f"• API Port: {effective_port}")

    if not BOT_TOKEN or "YOUR_TELEGRAM_BOT_TOKEN" in BOT_TOKEN:
        print("\n⚠️ NOTE: Bot Token is not set yet.")
        print("👉 Set `BOT_TOKEN` in Render Environment variables or in `bot_config.json`.\n")

    # Start HTTP API server in background thread
    api_thread = threading.Thread(target=start_api_server, args=(effective_port,), daemon=True)
    api_thread.start()

    # Start scheduled deletion cleanup thread (runs every 60s)
    cleanup_thread = threading.Thread(target=cleanup_scheduled_deletions, daemon=True)
    cleanup_thread.start()

    # Restore database state from Telegram Cloud if available
    try:
        restore_database_from_telegram_cloud()
    except Exception as _re:
        print(f"[TelegramCloud] Initial restore skipped: {_re}")

    # Configure Telegram 3-line burger menu commands
    setup_telegram_menu()

    # Run Telegram Bot Polling in main thread
    handle_updates()
