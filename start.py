#!/usr/bin/env python3
"""
✨ 3D Birthday Celebration — Render Unified Starter
====================================================
This script starts ALL services together in one Render web process:

  1. HTTP API Server        → Serves Web App (index.html, style.css, js/) + REST API
                              Port: auto-assigned by Render via $PORT env variable
  2. Owner Telegram Bot     → Private bot for the boyfriend (creator)
                              (telegram_bot.py polling loop)
  3. Public User Telegram Bot → Bot for girlfriend/random users
                              (public_user_bot.py polling loop)

Why one process?
  - Render's free/starter plan gives 1 web service (with PORT).
  - All 3 components share the same bot_config.json on the same filesystem.
  - The HTTP API server serves static files AND acts as a sync bridge.

Environment Variables to set in Render Dashboard:
  BOT_TOKEN         - Owner Telegram Bot Token (from @BotFather)
  PUBLIC_BOT_TOKEN  - Public User Bot Token (can be same as BOT_TOKEN or different)
  OWNER_CHAT_ID     - Your Telegram Chat ID
  WEB_APP_URL       - Your Render live URL (e.g. https://surprise-love.onrender.com)
  PORT              - Set automatically by Render (default: 10000)
"""

import os
import sys
import threading
import time

# ---------------------------------------------------------------------------
# Ensure we can import local modules
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_public_bot():
    """Run the public user bot polling in a background thread."""
    try:
        import public_user_bot
        print("✅ Public User Bot thread starting...")
        public_user_bot.setup_user_bot_menu()
        public_user_bot.run_public_user_bot()
    except Exception as e:
        print(f"[Public Bot Error]: {e}")
        import traceback
        traceback.print_exc()

def run_owner_bot():
    """Run the owner bot polling in a background thread."""
    try:
        import telegram_bot
        print("✅ Owner Bot thread starting...")
        telegram_bot.setup_telegram_menu()
        telegram_bot.handle_updates()
    except Exception as e:
        print(f"[Owner Bot Error]: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Determine port from env (Render sets PORT automatically)
    port = int(os.environ.get("PORT", 10000))
    import telegram_bot
    b_tok = os.environ.get("BOT_TOKEN", "").strip() or telegram_bot.config.get("bot_token", "").strip()
    p_tok = os.environ.get("PUBLIC_BOT_TOKEN", "").strip() or telegram_bot.config.get("public_bot_token", "").strip()
    has_separate_tokens = bool(p_tok and p_tok != b_tok)

    print("=" * 65, flush=True)
    print("✨  3D Birthday Celebration — Unified Render Launcher", flush=True)
    print("=" * 65, flush=True)
    print(f"• PORT             : {port}", flush=True)
    print(f"• BOT_TOKEN        : {'✅ Set' if b_tok else '⚠️  Not set'}", flush=True)
    print(f"• PUBLIC_BOT_TOKEN : {'✅ Set (Dedicated Public Bot active)' if has_separate_tokens else 'ℹ️  Not set (Unified Single-Bot mode active)'}", flush=True)
    print(f"• OWNER_CHAT_ID    : {os.environ.get('OWNER_CHAT_ID', '⚠️  Not set')}", flush=True)
    print(f"• WEB_APP_URL      : {os.environ.get('WEB_APP_URL', '⚠️  Not set')}", flush=True)
    print(f"• ADMIN_SECRET     : {'✅ Set' if os.environ.get('ADMIN_SECRET') else '⚠️  Not set'}", flush=True)
    print("=" * 65, flush=True)

    # 1. Start HTTP API + Web App server in background thread
    api_thread = threading.Thread(
        target=telegram_bot.start_api_server,
        args=(port,),
        daemon=True
    )
    api_thread.start()
    print(f"🌐 Web App & API Server started on 0.0.0.0:{port}", flush=True)

    # Small delay to ensure the HTTP server is fully up
    time.sleep(1)

    # 1.5 Restore database from Telegram Cloud (survives Render disk wipes)
    try:
        telegram_bot.restore_database_from_telegram_cloud()
    except Exception as _re:
        print(f"[TelegramCloud] Initial restore skipped: {_re}", flush=True)

    # 2. Start Public User Bot ONLY if a separate dedicated token is configured
    if has_separate_tokens:
        pub_bot_thread = threading.Thread(target=run_public_bot, daemon=True)
        pub_bot_thread.start()
        print("🤖 Dedicated Public User Bot thread launched on separate token", flush=True)
    else:
        print("🤖 Unified Single Bot Mode: Owner & Public user flows are unified on BOT_TOKEN", flush=True)

    # 3. Start Scheduled Deletion Cleanup in background thread
    cleanup_thread = threading.Thread(
        target=telegram_bot.cleanup_scheduled_deletions,
        daemon=True
    )
    cleanup_thread.start()
    print("🧹 Cleanup thread launched", flush=True)

    # 4. Run Owner Bot in main thread (keeps process alive)
    print("👑 Owner Bot starting (main thread)...")
    run_owner_bot()
