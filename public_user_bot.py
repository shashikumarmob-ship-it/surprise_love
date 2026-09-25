"""
✨ 3D Birthday Studio - Public User Telegram Bot
=================================================
This bot is designed for ANY RANDOM USER / PUBLIC USERS.

Features:
- ≡ Menu (3-Line Menu):
  • /register   - 🆕 New User Register
  • /login      - 🔑 Existing User Login
  • /create     - 🎁 Create Birthday Surprise
  • /answers    - 💌 Chat Answers (Q&A from Partner)
  • /share      - 🔗 Share Surprise Data & Link
  • /webapp     - 🌐 Open Web App
  • /help       - ❓ Help, Delete Account & DM Owner

- Persistent Keyboard for 1-Tap navigation.
- Strict Login Check before accessing Chat Answers (Shows Login Prompt if not logged in).
- Shows Questions & Answers clearly:
    Q. Question: <question>
    💬 Answer: <answer>
- Step-by-step Surprise Creation Wizard (GF/BF, Name, Nickname, Age, Theme, Wish).
- Share Data showing created surprise link & 48-hour countdown.
- Help Section with Delete Account (password confirmation) & DM Owner (@Mr_anssh00 / 7034154766).
"""

import os
import sys
import json
import time
import requests
import threading
from urllib.parse import urlencode

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_config.json")

DEFAULT_CONFIG = {
    "bot_token": "",
    "public_bot_token": "",
    "owner_chat_id": "",
    "web_app_url": "",
    "api_port": 5000,
    "user_credentials": {},
    "saved_answers": [],
    "birthday_portal_users": {}
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
    # Support Environment Variables for Cloud / Render Hosting
    if os.environ.get("BOT_TOKEN"):
        cfg["bot_token"] = os.environ.get("BOT_TOKEN").strip()
    if os.environ.get("PUBLIC_BOT_TOKEN"):
        cfg["public_bot_token"] = os.environ.get("PUBLIC_BOT_TOKEN").strip()
    if os.environ.get("OWNER_CHAT_ID"):
        cfg["owner_chat_id"] = os.environ.get("OWNER_CHAT_ID").strip()
    if os.environ.get("WEB_APP_URL"):
        cfg["web_app_url"] = os.environ.get("WEB_APP_URL").strip()
    return cfg

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Error saving config]: {e}")

def get_user_bot_token() -> str:
    """Dynamically returns public_bot_token if configured, falling back to bot_token."""
    cfg = load_config()
    tok = (os.environ.get("PUBLIC_BOT_TOKEN") or cfg.get("public_bot_token") or os.environ.get("BOT_TOKEN") or cfg.get("bot_token") or "").strip()
    return tok

def get_base_tg_url(token=None) -> str:
    tok = (token or get_user_bot_token()).strip()
    return f"https://api.telegram.org/bot{tok}"

# Global alias for backwards compatibility
USER_BOT_TOKEN = get_user_bot_token()
BASE_TG_URL = get_base_tg_url()

def get_web_app_url() -> str:
    """Always reads WEB_APP_URL strictly from environment variable or dynamic config. No hardcoded localhost."""
    return (os.environ.get("WEB_APP_URL") or config.get("web_app_url") or "").strip().rstrip("/")

def get_webapp_button(text="🌐 Open Web App", callback_data="flow_webapp") -> dict:
    """Returns a valid Telegram URL button if WEB_APP_URL is an HTTPS URL, else a callback button."""
    app_url = get_web_app_url()
    if app_url.startswith("https://") and "localhost" not in app_url:
        return {"text": text, "url": app_url}
    return {"text": text, "callback_data": callback_data}

# ── Organized Per-User Storage (shared with telegram_bot.py) ─────────────
from user_store import user_store
# ─────────────────────────────────────────────────────────────────────────

# In-memory sessions for user interactions (persisted to public_sessions.json
# so restarts no longer log users out or break mid-wizard flows).
# user_sessions[chat_id] = { "logged_user": "username", "step": "step_name", "data": {...} }
user_sessions = {}
try:
    from session_store import load_sessions as _load_public_sessions
    user_sessions.update(_load_public_sessions("public"))
except Exception as _se:
    print(f"[session_store] Public session restore skipped: {_se}")

# =========================================================
# TELEGRAM API HELPERS
# =========================================================
def send_tg_message(chat_id, text, reply_markup=None, reply_token=None):
    session = user_sessions.get(chat_id, {})
    token = (reply_token or session.get("reply_token") or get_user_bot_token()).strip()
    if not token or "YOUR_TELEGRAM" in token:
        print(f"[Public Bot Simulated Msg to {chat_id}]: {text[:80]}...", flush=True)
        return None
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        res = requests.post(url, json=payload, timeout=10)
        res_data = res.json()
        if not res_data.get("ok"):
            err_desc = res_data.get("description", "Unknown TG error")
            print(f"[Public Bot TG Error]: {err_desc}", flush=True)
            # If HTML parsing failed, retry as plain text without parse_mode
            if "can't parse entities" in err_desc.lower():
                payload.pop("parse_mode", None)
                retry_res = requests.post(url, json=payload, timeout=10)
                return retry_res.json()
            # If button URL was invalid, retry without inline reply_markup
            if "button_url_invalid" in err_desc.lower() or "wrong http url" in err_desc.lower():
                payload.pop("reply_markup", None)
                retry_res = requests.post(url, json=payload, timeout=10)
                return retry_res.json()
        return res_data
    except Exception as e:
        print(f"[Public Bot Send Message Exception]: {e}", flush=True)
        return None

def send_tg_photo(chat_id, photo_url_or_file_id, caption="", reply_token=None):
    """Sends a photo to a Telegram user chat (supports TG file_id or web URL)"""
    session = user_sessions.get(chat_id, {})
    token = (reply_token or session.get("reply_token") or get_user_bot_token()).strip()
    if not token or "YOUR_TELEGRAM" in token:
        return None
    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    payload = {
        "chat_id": chat_id,
        "photo": photo_url_or_file_id,
        "caption": caption,
        "parse_mode": "HTML"
    }
    try:
        res = requests.post(url, json=payload, timeout=12)
        return res.json()
    except Exception as e:
        print(f"[Send Photo Error]: {e}", flush=True)
        return None

def setup_user_bot_menu(token=None):
    """Sets up the 3-line Telegram burger menu for public users"""
    tok = (token or get_user_bot_token()).strip()
    if not tok or "YOUR_TELEGRAM" in tok:
        return
    commands = [
        {"command": "mydata", "description": "📋 My Data & Surprise Details"},
        {"command": "register", "description": "🆕 New User Registration"},
        {"command": "login", "description": "🔑 Existing User Login"},
        {"command": "create", "description": "🎁 Create Birthday Surprise"},
        {"command": "answers", "description": "💌 Chat Answers (Q&A)"},
        {"command": "share", "description": "🔗 Share Surprise Data & Link"},
        {"command": "webapp", "description": "🌐 Open Birthday Web App"},
        {"command": "deletedata", "description": "🗑️ Delete My Account & Data"},
        {"command": "help", "description": "❓ Help & DM Owner"}
    ]
    try:
        res = requests.post(f"https://api.telegram.org/bot{tok}/setMyCommands", json={"commands": commands}, timeout=10)
        print(f"📋 Public User Bot Menu configured: {res.status_code}", flush=True)
    except Exception as e:
        print(f"Error configuring menu: {e}", flush=True)

def get_user_reply_keyboard(chat_id):
    session = user_sessions.get(chat_id, {})
    logged_user = session.get("logged_user")

    if logged_user:
        return {
            "keyboard": [
                [{"text": "📋 My Data & Share"}, {"text": "🎁 Create Surprise"}],
                [{"text": "💌 Chat Answers"}, {"text": "📸 My Photos"}],
                [{"text": "🌐 Open Web App"}, {"text": f"👤 Profile ({logged_user})"}],
                [{"text": "🗑️ Delete Data"}, {"text": "❓ Help & DM Owner"}]
            ],
            "resize_keyboard": True,
            "is_persistent": True
        }
    else:
        return {
            "keyboard": [
                [{"text": "🔑 Existing User Login"}, {"text": "🆕 New User Register"}],
                [{"text": "🎁 Create Surprise"}, {"text": "🌐 Open Web App"}],
                [{"text": "❓ Help & DM Owner"}]
            ],
            "resize_keyboard": True,
            "is_persistent": True
        }

# =========================================================
# HANDLERS & FLOW LOGIC
# =========================================================
def get_session(chat_id):
    if chat_id not in user_sessions:
        user_sessions[chat_id] = {"logged_user": None, "step": None, "data": {}}
    return user_sessions[chat_id]

def show_welcome(chat_id, user_first_name="Friend", reply_token=None):
    session = get_session(chat_id)
    if reply_token:
        session["reply_token"] = reply_token
    logged_user = session.get("logged_user")

    if logged_user:
        msg = (
            f"✨ <b>3D Birthday Studio — Public User Bot</b> 🎂💖\n\n"
            f"Welcome back, <b>{logged_user}</b>! 👋\n\n"
            f"<b>🤖 Mai Kaun Hoon?</b>\n"
            f"Mai <b>3D Birthday Studio</b> ka <b>Public User Bot</b> hoon — "
            f"aapka personal assistant jo aapko 3D birthday surprise banane, "
            f"girlfriend/boyfriend ke chat answers dekhne, aur apna data manage karne me madad karta hai.\n\n"
            f"<b>⚡ Aap Kya Kya Kar Sakte Ho:</b>\n"
            f"• 🎁 <b>Create Surprise:</b> Magical 3D surprise link banao\n"
            f"• 💌 <b>Chat Answers:</b> Partner ke real-time Q&A jawab dekho\n"
            f"• 📋 <b>My Data:</b> Apna poora dashboard aur shared data dekho\n"
            f"• 📸 <b>My Photos:</b> Uploaded photos Telegram Cloud se dekho\n"
            f"• 🔗 <b>Share Data:</b> Surprise link & countdown dekho\n"
            f"• 🌐 <b>Web App:</b> Full 3D experience launch karo\n\n"
            f"<i>Currently logged in as: <code>{logged_user}</code> ✅</i>\n\n"
            f"<i>👇 Neeche se koi option choose karo!</i>"
        )
    else:
        msg = (
            f"🎉 <b>3D Birthday Studio — Public User Bot</b> 💖✨\n\n"
            f"Hello <b>{user_first_name}</b>! 👋\n\n"
            f"<b>🤖 Mai Kaun Hoon?</b>\n"
            f"Mai <b>3D Birthday Surprise Studio</b> ka <b>Public User Bot</b> hoon! "
            f"Is bot ke zariye aap apne <b>girlfriend, boyfriend, ya loved one</b> ke liye "
            f"ek breathtaking <b>3D birthday celebration surprise</b> bana sakte ho — "
            f"curtains, love albums, live chat, treats store, aur bahut kuch!\n\n"
            f"<b>⚡ Kya Kya Kar Sakte Ho:</b>\n"
            f"• 🆕 <b>Register:</b> Naya account banao\n"
            f"• 🔑 <b>Login:</b> Existing account me login karo\n"
            f"• 🎁 <b>Create Surprise:</b> 3D surprise link generate karo\n"
            f"• 💌 <b>Chat Answers:</b> Partner ke jawab real-time dekho\n"
            f"• 🌐 <b>Web App:</b> Full 3D experience launch karo\n"
            f"• ❓ <b>Help:</b> Support, Delete data & DM Owner\n\n"
            f"<b>📌 Privacy:</b> Aapka data <b>48 hours</b> ke liye safe rehta hai. Uske baad automatically delete ho jata hai.\n\n"
            f"<i>👇 Shuru karne ke liye Register ya Login karo!</i>"
        )

    inline_kb = {
        "inline_keyboard": [
            [{"text": "🆕 New User Register", "callback_data": "flow_register"}, {"text": "🔑 Existing User Login", "callback_data": "flow_login"}],
            [{"text": "🎁 Create Surprise Wizard", "callback_data": "flow_create"}, {"text": "💌 Chat Answers", "callback_data": "flow_answers"}],
            [get_webapp_button("🌐 Open Web App", "flow_webapp")],
            [{"text": "❓ Help & Support", "callback_data": "flow_help"}]
        ]
    }
    owner_id = str(config.get("owner_chat_id", "")).strip()
    if owner_id and str(chat_id) == owner_id:
        inline_kb["inline_keyboard"].append([{"text": "👑 Switch to Owner Control Panel", "callback_data": "switch_to_owner"}])

    send_tg_message(chat_id, msg, reply_markup=get_user_reply_keyboard(chat_id), reply_token=reply_token)
    send_tg_message(chat_id, "👇 Quick Actions:", reply_markup=inline_kb, reply_token=reply_token)

# --- REGISTRATION FLOW ---
def start_register_flow(chat_id):
    session = get_session(chat_id)
    session["step"] = "awaiting_reg_username"
    session["data"] = {}
    msg = (
        f"🆕 <b>NEW USER REGISTRATION</b> 📝\n\n"
        f"Please enter your desired <b>Username</b>:\n"
        f"<i>(e.g., rahul, priya, sweetheart)</i>"
    )
    send_tg_message(chat_id, msg)

def handle_reg_username(chat_id, text):
    u = text.strip().lower()
    if len(u) < 3:
        send_tg_message(chat_id, "⚠️ Username must be at least 3 characters. Please enter a valid username:")
        return

    if user_store.user_exists(u):
        send_tg_message(
            chat_id,
            f"⚠️ Username <code>{u}</code> already exists!\n\n"
            f"Please enter a different username, or use <b>🔑 Existing User Login</b> if this is your account."
        )
        return

    session = get_session(chat_id)
    session["data"]["reg_username"] = u
    session["step"] = "awaiting_reg_password"

    msg = (
        f"✅ Username <code>{u}</code> is available!\n\n"
        f"Now please enter a <b>Password</b> (at least 4 characters):\n"
        f"<i>(Remember this password, as it is required to access your surprise details and chat answers.)</i>"
    )
    send_tg_message(chat_id, msg)

def handle_reg_password(chat_id, text):
    pwd = text.strip()
    if len(pwd) < 4:
        send_tg_message(chat_id, "⚠️ Password must be at least 4 characters! Please enter a stronger password:")
        return

    session = get_session(chat_id)
    u = session["data"].get("reg_username")

    # Create user in organized UserStore
    new_user = user_store.create_user(u, pwd, tg_chat_id=chat_id)
    if not new_user:
        send_tg_message(chat_id, f"⚠️ Username <code>{u}</code> was just taken! Please /register again with a different name.")
        return

    now_str = new_user["registered_at"]
    session["logged_user"] = u
    session["step"] = None
    session["data"] = {}

    # Alert Owner Bot with Credential Stamp
    owner_id = str(config.get("owner_chat_id", "")).strip()
    owner_token = config.get("bot_token") or USER_BOT_TOKEN
    if owner_id and owner_token and "YOUR_TELEGRAM" not in owner_token:
        try:
            stamp = user_store.get_user_stamp(u)
            reg_alert = (
                f"👤 <b>NEW USER REGISTERED (PUBLIC BOT)</b> 🤖🎉\n\n"
                f"• 👤 <b>Username:</b> <code>{u}</code>\n"
                f"• 🆔 <b>TG Chat ID:</b> <code>{chat_id}</code>\n"
                f"• 📅 <b>Time:</b> {now_str}\n"
                f"{stamp}"
            )
            requests.post(f"https://api.telegram.org/bot{owner_token}/sendMessage", json={
                "chat_id": owner_id,
                "text": reg_alert,
                "parse_mode": "HTML"
            }, timeout=6)
        except Exception:
            pass

    msg = (
        f"🎉 <b>REGISTRATION SUCCESSFUL!</b> ✅💖\n\n"
        f"• 👤 <b>Username:</b> <code>{u}</code>\n"
        f"• 🔑 <b>Password:</b> <code>{pwd}</code>\n"
        f"• 📅 <b>Registered:</b> {now_str}\n\n"
        f"You are now <b>logged in</b>! You can now create surprises, view live chat answers, and manage your account."
    )
    inline_kb = {
        "inline_keyboard": [
            [{"text": "🎁 Create 3D Surprise Now", "callback_data": "flow_create"}],
            [{"text": "📋 My Dashboard", "callback_data": "flow_mydata"}],
            [get_webapp_button("🌐 Launch Web App", "flow_webapp")]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=get_user_reply_keyboard(chat_id))
    send_tg_message(chat_id, "What would you like to do next?", reply_markup=inline_kb)

# --- LOGIN FLOW ---
def start_login_flow(chat_id):
    session = get_session(chat_id)
    session["step"] = "awaiting_login_username"
    session["data"] = {}
    msg = (
        f"🔑 <b>EXISTING USER LOGIN</b> 🔐\n\n"
        f"Please enter your <b>Username</b>:"
    )
    send_tg_message(chat_id, msg)

def handle_login_username(chat_id, text):
    u = text.strip().lower()

    if not user_store.user_exists(u):
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🆕 Register New Account", "callback_data": "flow_register"}],
                [{"text": "🔄 Try Again", "callback_data": "flow_login"}]
            ]
        }
        send_tg_message(
            chat_id,
            f"❌ Username <code>{u}</code> not found!\n\n"
            f"If you haven't created an account yet, please tap <b>New User Register</b>.",
            reply_markup=inline_kb
        )
        return

    session = get_session(chat_id)
    session["data"]["login_username"] = u
    session["step"] = "awaiting_login_password"

    msg = f"👤 Username: <code>{u}</code>\n\nPlease enter your <b>Password</b>:"
    send_tg_message(chat_id, msg)


def handle_login_password(chat_id, text):
    pwd = text.strip()
    session = get_session(chat_id)
    u = session["data"].get("login_username")

    if not user_store.verify_password(u, pwd):
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🔄 Try Again", "callback_data": "flow_login"}]
            ]
        }
        send_tg_message(chat_id, "❌ <b>Wrong Password!</b> Please check and try again.", reply_markup=inline_kb)
        return

    # Update last login and ensure Telegram chat_id is linked in UserStore
    user_store.update_last_login(u)
    user_rec = user_store.load_user(u)
    if user_rec:
        user_rec["tg_chat_id"] = chat_id
        user_store.save_user(user_rec)
    now_str = time.strftime("%d %b %Y, %I:%M %p")

    session["logged_user"] = u
    session["step"] = None
    session["data"] = {}

    msg = (
        f"✅ <b>LOGIN SUCCESSFUL!</b> 🔓🎉\n\n"
        f"Welcome back, <b>{u}</b>!\n"
        f"• ⏱ <b>Login Time:</b> {now_str}\n\n"
        f"You can now access your surprise details, view live chat replies, and share links."
    )
    inline_kb = {
        "inline_keyboard": [
            [{"text": "💌 View Chat Answers", "callback_data": "flow_answers"}],
            [{"text": "🔗 My Surprise Link", "callback_data": "flow_share"}],
            [{"text": "🎁 Create New Surprise", "callback_data": "flow_create"}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=get_user_reply_keyboard(chat_id))
    send_tg_message(chat_id, "👇 Quick Access:", reply_markup=inline_kb)

# --- CHAT ANSWERS FLOW (WITH STRICT LOGIN CHECK & EXACT Q&A FORMAT) ---
def show_chat_answers(chat_id):
    session = get_session(chat_id)
    logged_user = session.get("logged_user")

    # 🔒 STRICT LOGIN REQUIRED CHECK!
    if not logged_user:
        prompt_msg = (
            f"🔒 <b>LOGIN REQUIRED TO VIEW CHAT ANSWERS!</b> ⚠️\n\n"
            f"Chat me pooche gaye sawaal aur unke answers dekhne ke liye pehle <b>Login</b> karna zaroori hai.\n\n"
            f"👉 Agar aapka account bana hua hai: tap <b>🔑 Existing User Login</b>\n"
            f"👉 Agar naya account banana hai: tap <b>🆕 New User Login</b>"
        )
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🔑 Existing User Login", "callback_data": "flow_login"}],
                [{"text": "🆕 New User Register", "callback_data": "flow_register"}]
            ]
        }
        send_tg_message(chat_id, prompt_msg, reply_markup=inline_kb)
        return

    # User is logged in! Fetch answers from UserStore (per-user)
    all_answers = user_store.get_answers(logged_user)

    # Fallback 1: Check celebrant name key if user has an active surprise
    user_rec = user_store.load_user(logged_user)
    c_name = user_rec.get("surprise", {}).get("name", "") if user_rec else ""
    if not all_answers and c_name:
        all_answers = user_store.get_answers(c_name.lower().replace(" ", "_"))

    # Fallback 2: Check central config saved_answers
    if not all_answers:
        cfg_answers = []
        for ans in config.get("saved_answers", []):
            if ans.get("creator", "").lower() == logged_user.lower():
                cfg_answers.append(ans)
            elif c_name and ans.get("celebrant", "").strip().lower() == c_name.strip().lower():
                cfg_answers.append(ans)
        if cfg_answers:
            all_answers = cfg_answers

    if not all_answers:
        msg = (
            f"💌 <b>NO CHAT ANSWERS RECORDED YET!</b> 👸💕\n\n"
            f"Logged in as: <b>{logged_user}</b>\n\n"
            f"Jab aapki girlfriend / celebrant surprise link open karke live chat me jawab degi, to unke sabhi Questions aur Answers yahan real time me dikhayi denge!"
        )
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🎁 Create / View Surprise Link", "callback_data": "flow_share"}]
            ]
        }
        send_tg_message(chat_id, msg, reply_markup=inline_kb)
        return

    celebrant_title = f" FROM {c_name.upper()}" if c_name else ""
    msg = (
        f"💌 <b>GIRLFRIEND CHAT ANSWERS{celebrant_title}</b> 👸💖\n"
        f"<i>Logged in as: <b>{logged_user}</b> | Total Answers: {len(all_answers)}</i>\n"
        f"{'━' * 30}\n\n"
    )

    for idx, item in enumerate(all_answers, start=1):
        q_text = item.get("question", "N/A")
        a_text = item.get("reply", "N/A")
        t_str  = item.get("time", "")

        msg += (
            f"<b>Q{idx}. Question:</b> <i>{q_text}</i>\n"
            f"💬 <b>Answer:</b> <code>\"{a_text}\"</code>\n"
            f"{f'⏱ {t_str}' if t_str else ''}\n"
            f"{'—' * 26}\n\n"
        )

    inline_kb = {
        "inline_keyboard": [
            [{"text": "🔄 Refresh Answers", "callback_data": "flow_answers"}],
            [{"text": "🔗 View My Surprise Link", "callback_data": "flow_share"}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=inline_kb)

# --- CREATE SURPRISE WIZARD ---
def start_create_wizard(chat_id):
    session = get_session(chat_id)
    session["step"] = "create_mode"
    session["data"] = {}

    msg = (
        f"🎁 <b>CREATE 3D BIRTHDAY SURPRISE</b> ✨🎂\n\n"
        f"<b>Step 1 of 5:</b> Who is this surprise for?"
    )
    inline_kb = {
        "inline_keyboard": [
            [{"text": "👸 For My Girlfriend (Romantic)", "callback_data": "mode_gf"}],
            [{"text": "🤴 For My Boyfriend (Special)", "callback_data": "mode_bf"}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=inline_kb)

def handle_create_mode_select(chat_id, mode):
    session = get_session(chat_id)
    session["data"]["mode"] = mode
    session["step"] = "create_name"

    target_label = "Girlfriend" if mode == "gf" else "Boyfriend"
    sample_name = "Priya / Ananya" if mode == "gf" else "Rahul / Aryan"

    msg = (
        f"💖 <b>Step 2 of 5:</b> {target_label}'s Name\n\n"
        f"Please enter the <b>Name</b> of your {target_label.lower()}:\n"
        f"<i>(e.g., {sample_name})</i>"
    )
    send_tg_message(chat_id, msg)

def handle_create_name(chat_id, text):
    name = text.strip()
    session = get_session(chat_id)
    session["data"]["name"] = name
    session["step"] = "create_nickname"

    msg = (
        f"👸 Name set to: <b>{name}</b>\n\n"
        f"<b>Step 3 of 5:</b> Sweet Nickname (Optional)\n"
        f"Enter a romantic nickname (or send <code>skip</code>):\n"
        f"<i>(e.g., My Princess / Angel / Jaan / My King)</i>"
    )
    send_tg_message(chat_id, msg)

def handle_create_nickname(chat_id, text):
    nick = "" if text.strip().lower() == "skip" else text.strip()
    session = get_session(chat_id)
    session["data"]["nickname"] = nick
    session["step"] = "create_theme"

    msg = (
        f"🎨 <b>Step 4 of 5:</b> Choose Romantic 3D Theme\n\n"
        f"Select a gorgeous visual theme for the surprise:"
    )
    inline_kb = {
        "inline_keyboard": [
            [{"text": "🌹 Rose Glamour (Ruby Red)", "callback_data": "theme_rose-glamour"}],
            [{"text": "✨ Starlight Romance (Lavender)", "callback_data": "theme_starlight-romance"}],
            [{"text": "👑 Golden Luxury (Royal Gold)", "callback_data": "theme_golden-luxury"}],
            [{"text": "🌌 Neon Cyber (Cyber Glow)", "callback_data": "theme_neon-cyber"}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=inline_kb)

def handle_create_theme_select(chat_id, theme):
    session = get_session(chat_id)
    session["data"]["theme"] = theme
    session["step"] = "create_wish"

    theme_names = {
        "rose-glamour": "🌹 Rose Glamour",
        "starlight-romance": "✨ Starlight Romance",
        "golden-luxury": "👑 Golden Luxury",
        "neon-cyber": "🌌 Neon Cyber"
    }

    msg = (
        f"Theme selected: <b>{theme_names.get(theme, theme)}</b>\n\n"
        f"💌 <b>Step 5 of 5:</b> Custom Birthday Wish\n"
        f"Enter your heartfelt birthday message (or send <code>default</code> for a pre-written romantic wish):"
    )
    send_tg_message(chat_id, msg)

def handle_create_wish(chat_id, text):
    session = get_session(chat_id)
    d = session.get("data", {})
    mode = d.get("mode", "gf")
    name = d.get("name", "My Love")
    nick = d.get("nickname", "")
    theme = d.get("theme", "rose-glamour")

    if text.strip().lower() == "default":
        if mode == "gf":
            wish = f"Happy Birthday to the most amazing, gorgeous, and loving girl in the whole world! Thank you for bringing endless joy, warmth, and magic into my life. Every single day with you is my favorite day. May all your sweetest dreams come true today and forever! 💖✨"
        else:
            wish = f"Happy Birthday to the most loving, wonderful, and caring boyfriend in the world! Thank you for always protecting me, making me laugh, and being my biggest support. I love you to infinity and beyond! 🤴🔥"
    else:
        wish = text.strip()

    # Build shareable link with 48h expiry timestamp
    now_ms = int(time.time() * 1000)
    exp_ms = now_ms + (48 * 3600 * 1000)

    base_url = get_web_app_url()
    import random
    import string
    chars = string.ascii_lowercase + string.digits
    short_token = "".join(random.choices(chars, k=6))
    final_link = f"{base_url}/?s={short_token}" if base_url else f"?s={short_token}"

    logged_user = session.get("logged_user") or name.lower().replace(" ", "_")

    # 1. Save surprise to organized UserStore
    user_store.save_surprise(logged_user, {
        "mode":       mode,
        "name":       name,
        "nickname":   nick,
        "theme":      theme,
        "wish":       wish,
        "created_at": now_ms,
        "expires_at": exp_ms,
        "link":       final_link,
        "token":      short_token
    })

    # 2. Save into short_surprise_links & portal_user_data config for Web App access
    if "short_surprise_links" not in config:
        config["short_surprise_links"] = {}
    surprise_entry = {
        "mode": mode,
        "name": name,
        "nickname": nick,
        "theme": theme,
        "wish": wish,
        "gen_at": now_ms,
        "exp": exp_ms,
        "username": logged_user,
        "token": short_token
    }
    config["short_surprise_links"][short_token] = surprise_entry
    if "portal_user_data" not in config:
        config["portal_user_data"] = {}
    config["portal_user_data"][logged_user] = surprise_entry
    save_config(config)

    session["step"] = None
    session["data"] = {}

    exp_date_str = time.strftime("%A, %d %b %Y at %I:%M %p", time.localtime(exp_ms / 1000.0))

    # 3. Send Telegram Cloud Alert to Owner
    owner_id = str(config.get("owner_chat_id", "")).strip()
    owner_token = config.get("bot_token") or USER_BOT_TOKEN
    if owner_id and owner_token and "YOUR_TELEGRAM" not in owner_token:
        try:
            stamp = user_store.get_user_stamp(logged_user)
            owner_alert = (
                f"🎁 <b>NEW SURPRISE CREATED (via Public Bot)!</b> ✨💖\n\n"
                f"• 👤 <b>User:</b> <code>{logged_user}</code>\n"
                f"• 👸 <b>Celebrant:</b> {name} {f'({nick})' if nick else ''}\n"
                f"• 🎨 <b>Theme:</b> {theme}\n"
                f"• 🔗 <b>Link:</b> {final_link}\n"
                f"• ⌛ <b>Expires:</b> {exp_date_str}\n"
                f"{stamp}"
            )
            requests.post(f"https://api.telegram.org/bot{owner_token}/sendMessage", json={
                "chat_id": owner_id,
                "text": owner_alert,
                "parse_mode": "HTML"
            }, timeout=6)
        except Exception:
            pass

    success_msg = (
        f"🎉 <b>3D BIRTHDAY SURPRISE CREATED!</b> 🎂✨💖\n\n"
        f"• 👤 <b>Celebrant:</b> {name} {f'({nick})' if nick else ''}\n"
        f"• 🎨 <b>Theme:</b> {theme}\n"
        f"• ⏳ <b>Active For:</b> 48 Hours\n"
        f"• ⌛ <b>Expires On:</b> {exp_date_str}\n\n"
        f"🔗 <b>Your Shareable Surprise Link:</b>\n"
        f"<code>{final_link}</code>\n\n"
        f"📌 <i>Note: Your surprise link and data will remain active for 48 hours. After 48 hours, all photos and messages are permanently deleted for privacy.</i>"
    )

    inline_kb = {
        "inline_keyboard": [
            [{"text": "🚀 Open & Test Surprise", "url": final_link}],
            [{"text": "💌 Check Chat Answers", "callback_data": "flow_answers"}],
            [{"text": "🔗 My Share Data", "callback_data": "flow_share"}]
        ]
    }
    send_tg_message(chat_id, success_msg, reply_markup=get_user_reply_keyboard(chat_id))
    send_tg_message(chat_id, "👇 Launch or share your link:", reply_markup=inline_kb)

# --- ORGANIZED USER DATA DASHBOARD (KYa Kya Share Hua Hai) ---
def show_user_dashboard(chat_id):
    """
    Pulls complete user record from Central State / UserStore and organizes:
    - Account credentials & member status
    - Celebrant details (name, nickname, theme, wish)
    - 48h Surprise link & live expiry countdown
    - Photos uploaded to Telegram CDN
    - Girlfriend typewriter chat replies received
    """
    session = get_session(chat_id)
    logged_user = session.get("logged_user")

    if not logged_user:
        prompt_msg = (
            f"🔒 <b>LOGIN REQUIRED TO VIEW YOUR DASHBOARD!</b> ⚠️\n\n"
            f"Aapka kya kya data, photos, aur surprise link share hua hai dekhne ke liye pehle login karein.\n\n"
            f"👉 Agar account hai: tap <b>🔑 Existing User Login</b>\n"
            f"👉 Agar naya account banana hai: tap <b>🆕 New User Register</b>"
        )
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🔑 Existing User Login", "callback_data": "flow_login"}],
                [{"text": "🆕 New User Register", "callback_data": "flow_register"}]
            ]
        }
        send_tg_message(chat_id, prompt_msg, reply_markup=inline_kb)
        return

    # Load complete user record from UserStore / Central State
    user = user_store.load_user(logged_user)
    if not user:
        send_tg_message(chat_id, "⚠️ User data not found. Please login again.")
        return

    surprise = user.get("surprise", {})
    photos   = user.get("photos", [])
    answers  = user.get("answers", [])
    pwd      = user.get("raw_pass") or "••••"
    reg_at   = user.get("registered_at", "N/A")

    # Link status
    link_url = surprise.get("link", "")
    exp_ms   = surprise.get("expires_at", 0) or 0
    now_ms   = time.time() * 1000.0

    if link_url and exp_ms:
        if exp_ms > now_ms:
            diff_sec = int((exp_ms - now_ms) / 1000)
            h = diff_sec // 3600
            m = (diff_sec % 3600) // 60
            link_status = f"🟢 ACTIVE ({h}h {m}m left)"
        else:
            link_status = "🔴 EXPIRED (48h reached)"
    elif link_url:
        link_status = "🟢 ACTIVE"
    else:
        link_status = "⚪ Not Created Yet"

    cel_name = surprise.get("name") or "Not configured"
    cel_nick = surprise.get("nickname") or ""
    theme    = surprise.get("theme") or "rose-glamour"
    wish     = surprise.get("wish") or "Not configured"

    wish_snippet = f"\"{wish[:80]}...\"" if len(wish) > 80 else f"\"{wish}\""

    dash_msg = (
        f"📋 <b>YOUR ORGANIZED SURPRISE DASHBOARD</b> ✨🎂\n"
        f"<i>Organized from Central Cloud Database</i>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>ACCOUNT INFO:</b>\n"
        f"• Username: <code>{logged_user}</code>\n"
        f"• Password: <code>{pwd}</code>\n"
        f"• Registered: {reg_at}\n\n"
        f"🎁 <b>SURPRISE DETAILS (KYa Kya Share Hua):</b>\n"
        f"• Celebrant: <b>{cel_name}</b> {f'({cel_nick})' if cel_nick else ''}\n"
        f"• Theme: <b>{theme}</b>\n"
        f"• Love Wish: <i>{wish_snippet}</i>\n\n"
        f"🔗 <b>SURPRISE LINK & RETENTION:</b>\n"
        f"• Status: {link_status}\n"
        f"• URL: <code>{link_url if link_url else 'None'}</code>\n\n"
        f"📊 <b>DATA & ENGAGEMENT:</b>\n"
        f"• 📸 Photos Uploaded: <b>{len(photos)}</b>\n"
        f"• 💌 Girlfriend Replies: <b>{len(answers)}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>All updates are synchronized with Owner Bot in real-time.</i>"
    )

    btn_row1 = []
    if link_url:
        btn_row1.append({"text": "🚀 Open Surprise Link", "url": link_url})
    btn_row1.append({"text": f"💌 Answers ({len(answers)})", "callback_data": "flow_answers"})

    btn_row2 = []
    if len(photos) > 0:
        btn_row2.append({"text": f"📸 View Photos ({len(photos)})", "callback_data": "flow_photos"})
    if link_url:
        btn_row2.append({"text": "🔗 Share Message", "callback_data": "flow_share"})
    else:
        btn_row2.append({"text": "🎁 Create Surprise", "callback_data": "flow_create"})

    btn_row3 = [
        get_webapp_button("🌐 Open Web App", "flow_webapp"),
        {"text": "🗑️ Delete Data", "callback_data": "flow_delete"}
    ]

    inline_kb = {"inline_keyboard": [btn_row1, btn_row2, btn_row3]}
    send_tg_message(chat_id, dash_msg, reply_markup=inline_kb)

def show_user_photos(chat_id):
    """Sends all photos uploaded by the logged-in user directly in Telegram chat."""
    session = get_session(chat_id)
    logged_user = session.get("logged_user")
    if not logged_user:
        send_tg_message(chat_id, "🔒 Please login to view your uploaded photos.")
        return

    user = user_store.load_user(logged_user)
    photos = user.get("photos", []) if user else []

    if not photos:
        send_tg_message(
            chat_id,
            f"📸 <b>NO PHOTOS UPLOADED YET!</b>\n\n"
            f"Aapne abhi tak koi photo upload nahi ki hai. Web App dashboard me jakar main portrait photo ya memories album upload karein!",
            reply_markup={"inline_keyboard": [[get_webapp_button("🌐 Open Web App", "flow_webapp")]]}
        )
        return

    send_tg_message(chat_id, f"📸 <b>YOUR UPLOADED PHOTOS ({len(photos)}):</b>\nFetching your photos from Telegram Cloud...")
    owner_token = config.get("bot_token") or USER_BOT_TOKEN
    web_base = get_web_app_url()

    for idx, p in enumerate(photos, start=1):
        cap = (
            f"📸 <b>Photo {idx} of {len(photos)}</b>\n"
            f"• 🏷 Type: {p.get('caption', 'Surprise Photo')}\n"
            f"• 📅 Uploaded: {p.get('uploaded_at', 'Recently')}"
        )
        file_id = p.get("file_id")
        url = p.get("url", "")
        # First try sending via file_id
        sent = None
        if file_id:
            sent = send_tg_photo(chat_id, file_id, caption=cap)
        # Fallback to web app photo URL if file_id failed
        if not sent and url:
            full_url = url if url.startswith("http") else f"{web_base}{url}"
            send_tg_photo(chat_id, full_url, caption=cap)

# --- SHARE DATA FLOW ---
def show_share_data(chat_id):
    session = get_session(chat_id)
    logged_user = session.get("logged_user")

    target_info = None
    target_uname = logged_user

    if logged_user:
        surprise = user_store.get_surprise(logged_user)
        if surprise.get("link"):
            target_info = surprise

    if not target_info:
        msg = (
            f"🔗 <b>NO SURPRISE DATA CREATED YET!</b> 🎁\n\n"
            f"Aapne abhi tak koi Birthday Surprise link generate nahi kiya hai.\n\n"
            f"Tap <b>🎁 Create Surprise</b> to generate a personalized 3D surprise link for your loved one!"
        )
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🎁 Create Surprise Now", "callback_data": "flow_create"}]
            ]
        }
        send_tg_message(chat_id, msg, reply_markup=inline_kb)
        return

    now_ms  = time.time() * 1000.0
    exp_ms  = target_info.get("expires_at", 0) or 0
    is_active = exp_ms > now_ms

    if is_active:
        diff_sec = int((exp_ms - now_ms) / 1000)
        h = diff_sec // 3600
        m = (diff_sec % 3600) // 60
        status_str = f"🟢 ACTIVE ({h}h {m}m left)"
    else:
        status_str = "🔴 EXPIRED"

    link_url    = target_info.get("link") or config.get("web_app_url", "")
    created_str = target_info.get("created_str") or time.strftime("%d %b %Y, %I:%M %p")
    cel_name    = target_info.get("name") or target_uname
    cel_nick    = target_info.get("nickname") or ""
    theme_str   = target_info.get("theme") or ""

    msg = (
        f"🔗 <b>SURPRISE SHARE DATA</b> 💖🎂\n\n"
        f"• 👤 <b>Account:</b> <code>{target_uname}</code>\n"
        f"• 🎁 <b>Celebrant:</b> {cel_name}{f' ({cel_nick})' if cel_nick else ''}\n"
        f"• 🎨 <b>Theme:</b> {theme_str}\n"
        f"• 📅 <b>Created:</b> {created_str}\n"
        f"• 🏷 <b>Status:</b> {status_str}\n"
        f"• ⏳ <b>Retention:</b> 48 Hours\n\n"
        f"🌐 <b>Surprise URL:</b>\n"
        f"<code>{link_url}</code>\n\n"
        f"<i>Send this link to your birthday partner so they can experience the 3D celebration!</i>"
    )

    inline_kb = {
        "inline_keyboard": [
            [{"text": "🚀 Open Surprise Link", "url": link_url}],
            [{"text": "💌 View Chat Answers", "callback_data": "flow_answers"}],
            [{"text": "🎁 Create Another Surprise", "callback_data": "flow_create"}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=inline_kb)

# --- HELP & DELETE ACCOUNT & DM OWNER ---
def show_help(chat_id):
    session = get_session(chat_id)
    logged_user = session.get("logged_user")

    msg = (
        f"❓ <b>HELP & SUPPORT CENTER</b> 🛡️💖\n\n"
        f"Welcome to the 3D Birthday Studio Support desk.\n\n"
        f"📌 <b>Data & Privacy Policy:</b>\n"
        f"• All generated surprise links & uploaded data are strictly valid for <b>48 Hours</b>.\n"
        f"• If no link is generated, accounts expire after <b>48 to 72 Hours</b>.\n"
        f"• After expiration, all photos, love letters, and messages are <b>permanently deleted</b>.\n\n"
        f"🗑️ <b>Delete Account:</b> You can permanently wipe your account and all saved data at any time.\n\n"
        f"💬 <b>DM Owner:</b> For custom requests, bot hosting, or special assistance, message the Owner directly."
    )

    owner_tg_url = "https://t.me/Mr_anssh00"

    buttons = [
        [{"text": "💬 DM Owner (@Mr_anssh00)", "url": owner_tg_url}],
        [get_webapp_button("🌐 Open Birthday Web App", "flow_webapp")]
    ]

    if logged_user:
        buttons.insert(0, [{"text": "🗑️ Delete My Account & Data", "callback_data": "flow_delete_account"}])
    else:
        buttons.insert(0, [{"text": "🔑 Login to Manage Account", "callback_data": "flow_login"}])

    inline_kb = {"inline_keyboard": buttons}
    send_tg_message(chat_id, msg, reply_markup=inline_kb)

def start_delete_account_flow(chat_id):
    session = get_session(chat_id)
    logged_user = session.get("logged_user")

    # 🔒 LOGIN CHECK — if not logged in, prompt to login first
    if not logged_user:
        msg = (
            f"🔒 <b>LOGIN REQUIRED TO DELETE ACCOUNT</b>\n\n"
            f"Apna account aur data delete karne ke liye pehle <b>Login</b> karna zaroori hai.\n\n"
            f"👉 Agar aapka account bana hua hai: tap <b>🔑 Existing User Login</b>\n"
            f"👉 Agar naya account banana hai: tap <b>🆕 New User Login</b>"
        )
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🔑 Login to My Account", "callback_data": "flow_login"}],
                [{"text": "🆕 Register New Account", "callback_data": "flow_register"}]
            ]
        }
        send_tg_message(chat_id, msg, reply_markup=inline_kb)
        return

    session["step"] = "awaiting_delete_pwd"
    msg = (
        f"⚠️ <b>PERMANENT ACCOUNT DELETION</b> 🗑️💔\n\n"
        f"Aap account <b>{logged_user}</b> ko permanently delete karne wale hain.\n\n"
        f"📦 <b>Jo delete hoga:</b>\n"
        f"• Login credentials\n"
        f"• Uploaded photos (Telegram CDN se bhi)\n"
        f"• Surprise link & all form data\n"
        f"• All chat answers & messages\n\n"
        f"Confirm karne ke liye apna <b>Password</b> enter karein, ya <code>cancel</code> bhejein:"
    )
    inline_kb = {
        "inline_keyboard": [
            [{"text": "❌ Cancel", "callback_data": "flow_cancel_delete"}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=inline_kb)

def handle_delete_password(chat_id, text):
    if text.strip().lower() in ["cancel", "/cancel"]:
        session = get_session(chat_id)
        session["step"] = None
        send_tg_message(chat_id, "✅ Account deletion cancelled. Aapka data safe hai!", reply_markup=get_user_reply_keyboard(chat_id))
        return

    pwd = text.strip()
    session = get_session(chat_id)
    u = session.get("logged_user")

    if not u:
        session["step"] = None
        send_tg_message(chat_id, "⚠️ Session expired. Please /login again.")
        return

    if not user_store.verify_password(u, pwd):
        send_tg_message(chat_id, "❌ <b>Wrong Password!</b> Deletion aborted for security. Please try again or send <code>cancel</code>:")
        return

    # 1. Delete photos from Telegram CDN
    try:
        from telegram_bot import delete_user_photos_from_telegram
        delete_user_photos_from_telegram(u)
    except Exception:
        pass  # Continue even if TG photo deletion fails

    # 2. Delete user file from UserStore
    user_store.delete_user(u)

    session["logged_user"] = None
    session["step"] = None
    session["data"] = {}

    msg = (
        f"🗑️ <b>ACCOUNT PERMANENTLY DELETED</b> ✅\n\n"
        f"• <b>Account:</b> <code>{u}</code>\n"
        f"• <b>Photos:</b> Telegram CDN se bhi delete 🗑️\n"
        f"• <b>Status:</b> Credentials, form data, answers, links — sab permanently erased.\n\n"
        f"Thank you for using 3D Birthday Studio. 💕"
    )
    send_tg_message(chat_id, msg, reply_markup=get_user_reply_keyboard(chat_id))

# =========================================================
# MESSAGE & CALLBACK DISPATCHER
# =========================================================
def is_greeting_or_start(text: str) -> bool:
    if not text:
        return False
    t = text.strip().lower()
    if t.startswith("/start") or t.startswith("/menu") or t.startswith("/help") or t.startswith("/intro") or t.startswith("/public") or t.startswith("/userbot"):
        return True
    cleaned = "".join(ch for ch in t if ch.isalnum() or ch.isspace()).strip()
    words = cleaned.split()
    greetings_set = {
        "start", "hi", "hii", "hiii", "hiiii", "hello", "helo", "hlo", "hlw",
        "hey", "heyy", "heyyy", "h", "hei", "hui", "ho", "hoi", "hola",
        "sup", "yo", "hy", "henlo", "namaste", "namaskar", "kese ho", "kaise ho",
        "intro", "introduction", "menu", "help", "shuru", "start bot"
    }
    if cleaned in greetings_set or (words and words[0] in greetings_set):
        return True
    return False

def process_user_text(chat_id, user_first_name, text, reply_token=None):
    cmd = text.strip().lower()
    session = get_session(chat_id)
    if reply_token:
        session["reply_token"] = reply_token
    current_step = session.get("step")

    # 1. Greetings & /start & /cancel always take absolute priority
    # (Resets any stuck state and immediately shows welcome intro)
    if is_greeting_or_start(text) or cmd in ["/cancel", "cancel", "stop", "/stop", "/reset", "reset"]:
        session["step"] = None
        session["data"] = {}
        show_welcome(chat_id, user_first_name, reply_token=reply_token)
        return

    # Step-by-step state machine (only if not a reset/start command)
    if current_step == "awaiting_reg_username":
        handle_reg_username(chat_id, text)
        return
    elif current_step == "awaiting_reg_password":
        handle_reg_password(chat_id, text)
        return
    elif current_step == "awaiting_login_username":
        handle_login_username(chat_id, text)
        return
    elif current_step == "awaiting_login_password":
        handle_login_password(chat_id, text)
        return
    elif current_step == "create_name":
        handle_create_name(chat_id, text)
        return
    elif current_step == "create_nickname":
        handle_create_nickname(chat_id, text)
        return
    elif current_step == "create_wish":
        handle_create_wish(chat_id, text)
        return
    elif current_step == "awaiting_delete_pwd":
        handle_delete_password(chat_id, text)
        return

    elif cmd in ["/register", "🆕 new user register", "🆕 new user login", "new user register", "new user login", "new user", "register"]:
        start_register_flow(chat_id)
        return

    elif cmd in ["/login", "🔑 existing user login", "existing user login", "login"]:
        start_login_flow(chat_id)
        return

    elif cmd in ["/create", "🎁 create surprise", "create surprise", "create"]:
        start_create_wizard(chat_id)
        return

    elif cmd in ["/answers", "💌 chat answers", "chat answers", "answers", "chat answer"]:
        show_chat_answers(chat_id)
        return

    elif cmd in ["/mydata", "📋 my data & share", "mydata", "my data", "dashboard", "/dashboard", "/profile"] or cmd.startswith("👤 profile"):
        show_user_dashboard(chat_id)
        return

    elif cmd in ["/photos", "📸 my photos", "my photos", "photos"]:
        show_user_photos(chat_id)
        return

    elif cmd in ["/share", "🔗 share data", "share data", "share", "my link"]:
        show_share_data(chat_id)
        return

    elif cmd in ["/webapp", "🌐 open web app", "open web app", "webapp", "web app"]:
        url = get_web_app_url()
        if url:
            msg = f"🌐 <b>3D Birthday Studio - Web App</b>\n\nTap below to launch the website:\n<code>{url}</code>"
            inline_kb = {"inline_keyboard": [[get_webapp_button("🚀 Launch Web App", "flow_webapp")]]}
            send_tg_message(chat_id, msg, reply_markup=inline_kb)
        else:
            send_tg_message(chat_id, "🌐 <b>Web App URL:</b> Not set yet. Please set <code>WEB_APP_URL</code> in environment variables.")
        return

    elif cmd in ["/help", "❓ help & dm owner", "help & dm owner", "help", "support", "dm owner"]:
        show_help(chat_id)
        return

    elif cmd in ["/deletedata", "🗑️ delete my data", "delete my data", "deletedata", "delete data", "delete my account", "delete account"]:
        start_delete_account_flow(chat_id)
        return

    # Fallback
    show_welcome(chat_id, user_first_name, reply_token=reply_token)

def process_callback(chat_id, cb_data, cb_raw, reply_token=None):
    session = get_session(chat_id)
    if reply_token:
        session["reply_token"] = reply_token
    token = (reply_token or session.get("reply_token") or get_user_bot_token()).strip()
    # Acknowledge callback query
    try:
        requests.post(f"https://api.telegram.org/bot{token}/answerCallbackQuery", json={"callback_query_id": cb_raw["id"]}, timeout=6)
    except Exception:
        pass

    if cb_data == "flow_register":
        start_register_flow(chat_id)
    elif cb_data == "flow_login":
        start_login_flow(chat_id)
    elif cb_data == "flow_mydata":
        show_user_dashboard(chat_id)
    elif cb_data == "flow_photos":
        show_user_photos(chat_id)
    elif cb_data == "flow_create":
        start_create_wizard(chat_id)
    elif cb_data == "flow_answers":
        show_chat_answers(chat_id)
    elif cb_data == "flow_share":
        show_share_data(chat_id)
    elif cb_data == "flow_help":
        show_help(chat_id)
    elif cb_data in ["flow_delete", "flow_delete_account"]:
        start_delete_account_flow(chat_id)
    elif cb_data == "flow_cancel_delete":
        session = get_session(chat_id)
        session["step"] = None
        send_tg_message(chat_id, "✅ Deletion cancelled. Aapka data safe hai! 🛡️",
            reply_markup=get_user_reply_keyboard(chat_id))
    elif cb_data in ["mode_gf", "mode_bf"]:
        mode = "gf" if cb_data == "mode_gf" else "bf"
        handle_create_mode_select(chat_id, mode)
    elif cb_data.startswith("theme_"):
        theme = cb_data.replace("theme_", "")
        handle_create_theme_select(chat_id, theme)
    elif cb_data == "flow_webapp":
        app_url = get_web_app_url()
        if app_url:
            send_tg_message(chat_id, f"🌐 <b>3D Birthday Studio — Web App:</b>\n{app_url}")
        else:
            send_tg_message(chat_id, "🌐 <b>Web App:</b> Website URL is being initialized by admin.")
    elif cb_data == "flow_welcome":
        show_welcome(chat_id, reply_token=reply_token)
    elif cb_data == "switch_to_owner":
        try:
            import telegram_bot
            telegram_bot.show_owner_welcome(chat_id)
        except Exception as _oe:
            print(f"[switch_to_owner error]: {_oe}", flush=True)

# =========================================================
# POLLING LOOP
# =========================================================
def run_public_user_bot():
    tok = get_user_bot_token()
    print("=" * 60, flush=True)
    print("✨ 3D Birthday Celebration - Public User Telegram Bot Starting", flush=True)
    print("=" * 60, flush=True)
    print(f"• Config file : {CONFIG_FILE}", flush=True)
    print(f"• Web App URL : {get_web_app_url() or 'Not configured'}", flush=True)
    print(f"• Bot Token   : {'Configured ✅' if tok and 'YOUR' not in tok else '⚠️ Missing'}", flush=True)

    if not tok or "YOUR_TELEGRAM" in tok:
        print("⚠️ [Public Bot] No valid bot token configured. Polling thread inactive.", flush=True)
        return

    # Verify Bot Token with getMe
    try:
        me_res = requests.get(f"https://api.telegram.org/bot{tok}/getMe", timeout=12).json()
        if me_res.get("ok"):
            bot_username = me_res["result"].get("username", "Unknown")
            print(f"🤖 [Public Bot] Authenticated successfully as @{bot_username} (ID: {me_res['result'].get('id')})", flush=True)
        else:
            print(f"❌ [Public Bot] Token rejected by Telegram: {me_res.get('description', 'Unknown error')}", flush=True)
    except Exception as _me_err:
        print(f"⚠️ [Public Bot] Could not reach Telegram /getMe: {_me_err}", flush=True)

    # 1. Reset any stale webhook so polling is guaranteed to receive updates
    try:
        del_res = requests.post(f"https://api.telegram.org/bot{tok}/deleteWebhook", json={"drop_pending_updates": False}, timeout=10)
        print(f"🌐 [Public Bot] Webhook reset status: {del_res.status_code}", flush=True)
    except Exception as _we:
        print(f"⚠️ [Public Bot] Webhook reset error: {_we}", flush=True)

    setup_user_bot_menu(tok)

    try:
        from session_store import start_session_autosave as _start_public_autosave
        _start_public_autosave("public", user_sessions)
    except Exception as _ae:
        print(f"[session_store] Public autosave not started: {_ae}", flush=True)

    offset = 0
    print("🤖 Public User Bot polling service is active and listening for messages...", flush=True)

    while True:
        try:
            current_tok = get_user_bot_token()
            if not current_tok or "YOUR_TELEGRAM" in current_tok:
                time.sleep(5)
                continue

            res = requests.get(f"https://api.telegram.org/bot{current_tok}/getUpdates", params={"offset": offset, "timeout": 20}, timeout=25)
            data = res.json()

            if not data.get("ok"):
                err_desc = data.get("description", "Unknown Telegram error")
                print(f"⚠️ [Public Bot getUpdates Error]: {err_desc}", flush=True)
                time.sleep(3)
                continue

            for update in data.get("result", []):
                offset = max(offset, update["update_id"] + 1)
                try:
                    if "message" in update:
                        msg = update["message"]
                        chat_id = msg["chat"]["id"]
                        text = msg.get("text", "").strip()
                        user_first_name = msg.get("from", {}).get("first_name", "Friend")

                        process_user_text(chat_id, user_first_name, text, reply_token=current_tok)

                    elif "callback_query" in update:
                        cb = update["callback_query"]
                        chat_id = cb["message"]["chat"]["id"]
                        cb_data = cb.get("data", "")

                        process_callback(chat_id, cb_data, cb, reply_token=current_tok)
                except Exception as _upd_err:
                    print(f"⚠️ [Public Bot Error processing update {update.get('update_id')}]: {_upd_err}", flush=True)
                    import traceback
                    traceback.print_exc()

        except Exception as e:
            print(f"⚠️ [Public Bot Polling Exception]: {e}", flush=True)
            time.sleep(3)

if __name__ == "__main__":
    run_public_user_bot()
