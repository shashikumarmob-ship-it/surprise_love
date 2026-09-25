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

config = load_config()

# Use public_bot_token if provided, otherwise fallback to bot_token
USER_BOT_TOKEN = config.get("public_bot_token", "").strip() or config.get("bot_token", "").strip()
BASE_TG_URL = f"https://api.telegram.org/bot{USER_BOT_TOKEN}"

# ── Organized Per-User Storage (shared with telegram_bot.py) ─────────────
from user_store import user_store
# ─────────────────────────────────────────────────────────────────────────

# In-memory sessions for user interactions
# user_sessions[chat_id] = { "logged_user": "username", "step": "step_name", "data": {...} }
user_sessions = {}

# =========================================================
# TELEGRAM API HELPERS
# =========================================================
def send_tg_message(chat_id, text, reply_markup=None):
    if not USER_BOT_TOKEN or "YOUR_TELEGRAM" in USER_BOT_TOKEN:
        return None
    url = f"{BASE_TG_URL}/sendMessage"
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
        return res.json()
    except Exception as e:
        print(f"[Send Message Error]: {e}")
        return None

def setup_user_bot_menu():
    """Sets up the 3-line Telegram burger menu for public users"""
    if not USER_BOT_TOKEN or "YOUR_TELEGRAM" in USER_BOT_TOKEN:
        return
    commands = [
        {"command": "register", "description": "🆕 New User Registration"},
        {"command": "login", "description": "🔑 Existing User Login"},
        {"command": "create", "description": "🎁 Create Birthday Surprise"},
        {"command": "answers", "description": "💌 Chat Answers (Q&A)"},
        {"command": "share", "description": "🔗 Share Surprise Data & Link"},
        {"command": "webapp", "description": "🌐 Open Birthday Web App"},
        {"command": "help", "description": "❓ Help, Delete Account & DM Owner"}
    ]
    try:
        res = requests.post(f"{BASE_TG_URL}/setMyCommands", json={"commands": commands}, timeout=10)
        print(f"📋 Public User Bot Menu configured: {res.status_code}")
    except Exception as e:
        print(f"Error configuring menu: {e}")

def get_user_reply_keyboard(chat_id):
    session = user_sessions.get(chat_id, {})
    logged_user = session.get("logged_user")

    if logged_user:
        return {
            "keyboard": [
                [{"text": "🎁 Create Surprise"}, {"text": "💌 Chat Answers"}],
                [{"text": "🔗 Share Data"}, {"text": "🌐 Open Web App"}],
                [{"text": f"👤 Profile ({logged_user})"}, {"text": "❓ Help & DM Owner"}]
            ],
            "resize_keyboard": True,
            "is_persistent": True
        }
    else:
        return {
            "keyboard": [
                [{"text": "🆕 New User Login"}, {"text": "🔑 Existing User Login"}],
                [{"text": "🎁 Create Surprise"}, {"text": "💌 Chat Answers"}],
                [{"text": "🔗 Share Data"}, {"text": "🌐 Open Web App"}],
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

def show_welcome(chat_id, user_first_name="Friend"):
    session = get_session(chat_id)
    logged_user = session.get("logged_user")

    if logged_user:
        msg = (
            f"✨ <b>Welcome back, {logged_user}!</b> 💖🎂\n\n"
            f"You are currently <b>logged in</b> to 3D Birthday Studio.\n\n"
            f"👇 <b>Select an option from the menu:</b>\n"
            f"• 🎁 <b>Create Surprise:</b> Create a magical 3D surprise link\n"
            f"• 💌 <b>Chat Answers:</b> See real-time questions & answers\n"
            f"• 🔗 <b>Share Data:</b> View your generated link & details\n"
            f"• 🌐 <b>Open Web App:</b> Launch 3D Birthday Studio\n"
            f"• ❓ <b>Help:</b> Delete account or DM Owner\n"
        )
    else:
        msg = (
            f"🎉 <b>Welcome to 3D Birthday Surprise Studio!</b> 💖✨\n\n"
            f"Hello <b>{user_first_name}</b>! Create breathtaking 3D birthday celebration surprises for your girlfriend, boyfriend, or loved ones.\n\n"
            f"👇 <b>Get Started (Select an option):</b>\n"
            f"• 🆕 <b>New User Login:</b> Create a new account\n"
            f"• 🔑 <b>Existing User Login:</b> Login to access saved data\n"
            f"• 🎁 <b>Create Surprise:</b> Start 3D surprise creation\n"
            f"• 💌 <b>Chat Answers:</b> View answers to surprise questions\n"
            f"• 🌐 <b>Open Web App:</b> Launch web experience\n"
            f"• ❓ <b>Help:</b> Support, Delete data & DM Owner\n"
        )

    inline_kb = {
        "inline_keyboard": [
            [{"text": "🆕 New User Register", "callback_data": "flow_register"}, {"text": "🔑 Existing User Login", "callback_data": "flow_login"}],
            [{"text": "🎁 Create Surprise Wizard", "callback_data": "flow_create"}, {"text": "💌 Chat Answers", "callback_data": "flow_answers"}],
            [{"text": "🌐 Open Web App", "url": config.get("web_app_url", "http://localhost:8000/")}],
            [{"text": "❓ Help & Support", "callback_data": "flow_help"}]
        ]
    }
    send_tg_message(chat_id, msg, reply_markup=get_user_reply_keyboard(chat_id))

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
            [{"text": "🌐 Launch Web App", "url": config.get("web_app_url", "http://localhost:8000/")}]
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

    # Update last login in UserStore
    user_store.update_last_login(u)
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

    msg = (
        f"💌 <b>GIRLFRIEND CHAT ANSWERS & REPLIES</b> 👸💖\n"
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

    base_url = config.get("web_app_url", "http://localhost:8000/").rstrip("/") + "/"
    params = {
        "surprise": "1",
        "mode": mode,
        "name": name,
        "theme": theme,
        "wish": wish,
        "exp": str(exp_ms)
    }
    if nick:
        params["nickname"] = nick

    final_link = f"{base_url}?{urlencode(params)}"

    logged_user = session.get("logged_user") or name.lower().replace(" ", "_")

    # Save surprise to organized UserStore
    user_store.save_surprise(logged_user, {
        "mode":       session.get("data", {}).get("mode", "gf"),
        "name":       name,
        "nickname":   nick,
        "theme":      theme,
        "wish":       wish,
        "created_at": now_ms,
        "expires_at": exp_ms,
        "link":       final_link,
    })

    session["step"] = None
    session["data"] = {}

    exp_date_str = time.strftime("%A, %d %b %Y at %I:%M %p", time.localtime(exp_ms / 1000.0))

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
        [{"text": "🌐 Open Birthday Web App", "url": config.get("web_app_url", "http://localhost:8000/")}]
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

    if not logged_user:
        send_tg_message(chat_id, "⚠️ Please login first to delete your account.", reply_markup=get_user_reply_keyboard(chat_id))
        return

    session["step"] = "awaiting_delete_pwd"
    msg = (
        f"⚠️ <b>PERMANENT ACCOUNT DELETION</b> 🗑️💔\n\n"
        f"You are about to permanently delete account <b>{logged_user}</b>.\n"
        f"All your saved form data, uploaded photos, chat history, and links will be permanently erased.\n\n"
        f"To confirm deletion, please enter your <b>Password</b> (or send <code>cancel</code>):"
    )
    send_tg_message(chat_id, msg)

def handle_delete_password(chat_id, text):
    if text.strip().lower() == "cancel":
        session = get_session(chat_id)
        session["step"] = None
        send_tg_message(chat_id, "✅ Account deletion cancelled.", reply_markup=get_user_reply_keyboard(chat_id))
        return

    pwd = text.strip()
    session = get_session(chat_id)
    u = session.get("logged_user")

    if not user_store.verify_password(u, pwd):
        send_tg_message(chat_id, "❌ <b>Wrong Password!</b> Deletion aborted for security. Please try again or send <code>cancel</code>:")
        return

    # Schedule deletion (24h grace period, or immediate)
    user_store.schedule_deletion(u, after_seconds=0)  # immediate deletion
    # Actually delete the file now
    user_store.delete_user(u)

    session["logged_user"] = None
    session["step"] = None
    session["data"] = {}

    msg = (
        f"🗑️ <b>ACCOUNT PERMANENTLY DELETED</b> ✅\n\n"
        f"• <b>Account:</b> {u}\n"
        f"• <b>Status:</b> All credentials, form data, photos & links erased from server.\n\n"
        f"Thank you for using 3D Birthday Studio. 💕"
    )
    send_tg_message(chat_id, msg, reply_markup=get_user_reply_keyboard(chat_id))

# =========================================================
# MESSAGE & CALLBACK DISPATCHER
# =========================================================
def process_user_text(chat_id, user_first_name, text):
    cmd = text.strip().lower()
    session = get_session(chat_id)
    current_step = session.get("step")

    # Step-by-step state machine
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

    # Slash Commands & Button Triggers
    if cmd in ["/start", "start", "hi", "hello", "menu"]:
        show_welcome(chat_id, user_first_name)
        return

    elif cmd in ["/register", "🆕 new user login", "new user login", "new user", "register"]:
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

    elif cmd in ["/share", "🔗 share data", "share data", "share", "my link"]:
        show_share_data(chat_id)
        return

    elif cmd in ["/webapp", "🌐 open web app", "open web app", "webapp", "web app"]:
        url = config.get("web_app_url", "http://localhost:8000/")
        msg = f"🌐 <b>3D Birthday Studio - Web App</b>\n\nTap below to launch the website:"
        inline_kb = {"inline_keyboard": [[{"text": "🚀 Launch Web App", "url": url}]]}
        send_tg_message(chat_id, msg, reply_markup=inline_kb)
        return

    elif cmd in ["/help", "❓ help & dm owner", "help & dm owner", "help", "support", "dm owner"]:
        show_help(chat_id)
        return

    elif cmd.startswith("👤 profile"):
        logged_user = session.get("logged_user")
        if logged_user:
            send_tg_message(chat_id, f"👤 <b>Your Profile:</b>\n\n• <b>Username:</b> <code>{logged_user}</code>\n• <b>Status:</b> Active & Logged In ✅", reply_markup=get_user_reply_keyboard(chat_id))
        else:
            send_tg_message(chat_id, "👤 You are currently not logged in. Tap <b>🔑 Existing User Login</b> to sign in.", reply_markup=get_user_reply_keyboard(chat_id))
        return

    # Fallback
    show_welcome(chat_id, user_first_name)

def process_callback(chat_id, cb_data, cb_raw):
    # Acknowledge callback query
    try:
        requests.post(f"{BASE_TG_URL}/answerCallbackQuery", json={"callback_query_id": cb_raw["id"]})
    except Exception:
        pass

    if cb_data == "flow_register":
        start_register_flow(chat_id)
    elif cb_data == "flow_login":
        start_login_flow(chat_id)
    elif cb_data == "flow_create":
        start_create_wizard(chat_id)
    elif cb_data == "flow_answers":
        show_chat_answers(chat_id)
    elif cb_data == "flow_share":
        show_share_data(chat_id)
    elif cb_data == "flow_help":
        show_help(chat_id)
    elif cb_data == "flow_delete_account":
        start_delete_account_flow(chat_id)
    elif cb_data in ["mode_gf", "mode_bf"]:
        mode = "gf" if cb_data == "mode_gf" else "bf"
        handle_create_mode_select(chat_id, mode)
    elif cb_data.startswith("theme_"):
        theme = cb_data.replace("theme_", "")
        handle_create_theme_select(chat_id, theme)

# =========================================================
# POLLING LOOP
# =========================================================
def run_public_user_bot():
    print("=" * 60)
    print("✨ 3D Birthday Celebration - Public User Telegram Bot Started")
    print("=" * 60)
    print(f"• Config file: {CONFIG_FILE}")
    print(f"• Web App URL: {config.get('web_app_url')}")
    print(f"• Bot Token: {'Configured ✅' if USER_BOT_TOKEN and 'YOUR' not in USER_BOT_TOKEN else '⚠️ Missing'}")

    setup_user_bot_menu()

    offset = 0
    print("🤖 Public User Bot polling service is active...")

    while True:
        try:
            if not USER_BOT_TOKEN or "YOUR_TELEGRAM" in USER_BOT_TOKEN:
                time.sleep(5)
                continue

            res = requests.get(f"{BASE_TG_URL}/getUpdates", params={"offset": offset, "timeout": 20}, timeout=25)
            data = res.json()

            if not data.get("ok"):
                time.sleep(3)
                continue

            for update in data.get("result", []):
                offset = update["update_id"] + 1

                if "message" in update:
                    msg = update["message"]
                    chat_id = msg["chat"]["id"]
                    text = msg.get("text", "").strip()
                    user_first_name = msg.get("from", {}).get("first_name", "Friend")

                    process_user_text(chat_id, user_first_name, text)

                elif "callback_query" in update:
                    cb = update["callback_query"]
                    chat_id = cb["message"]["chat"]["id"]
                    cb_data = cb.get("data", "")

                    process_callback(chat_id, cb_data, cb)

        except Exception as e:
            time.sleep(3)

if __name__ == "__main__":
    run_public_user_bot()
