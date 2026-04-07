🌸 Amore — Your Daily Girl Space
A cozy, privacy-first wellness app that lives entirely in your browser.
No servers. No tracking. No ads. Your data stays on your device.

📁 File Structure
amore/
├── index.html      # Main app (UI + logic)
├── db.js           # Database module (localStorage abstraction + RAG)
└── README.md       # This file
Important: db.js must be in the same folder as index.html and loaded before the main script. It's referenced as <script src="db.js"></script> in the <head>.

✨ Features
Feature	Description
🌸 Mood tracker	Log moods with notes; view weekly chart
💧 Hydration	8-cup water tracker with smart reminders
🧘 Habits	Daily habit list with streaks
📓 Journal	Notebook-style journal with daily prompts
🌿 Skincare	AM routine checklist
🙏 Gratitude	Daily gratitude list
📊 Stats	Weekly/monthly wellness overview
🌙 Period tracker	Calendar-style period log
💜 Amie AI	AI chatbot with RAG (reads your personal data)
🔔 Notifications	In-app smart reminders (water, mood, habits, journal)
💾 Database (db.js)
All data is stored in localStorage under namespaced keys:

amore_{userId}_{key}    →  logged-in user data
amore_guest_{key}       →  guest data
amore_users             →  all accounts (shared)
amore_session           →  current session (shared)
API
AmoreDB.init(userId)         // call once after login (null = guest)
AmoreDB.get('water', 0)      // read key with default
AmoreDB.set('water', 5)      // write key
AmoreDB.remove('water')      // delete key
AmoreDB.all()                // dump all user keys → object
AmoreDB.export()             // → JSON string (for backup)
AmoreDB.import(jsonStr)      // restore from JSON string
AmoreDB.clearUser()          // wipe all data for current user

// Auth helpers
AmoreDB.users.get()          // → { uid: { displayName, pass, created } }
AmoreDB.users.save(users)
AmoreDB.session.get()        // → { uid, name } | null
AmoreDB.session.save(uid, name)
AmoreDB.session.clear()

// Chat / RAG
AmoreDB.chat.getHistory(limit)       // → [{ role, content, ts }]
AmoreDB.chat.append(role, content)   // save message to history
AmoreDB.chat.clear()                 // wipe chat history
AmoreDB.chat.buildRAGContext()       // → string snapshot of user's wellness data
Data keys used by the app
Key	Contents
water	Number (0–8)
habits	Array of { name, done, streak }
mood_log	Array of { mood, note, time, date, ts } (max 100)
journal_{dateStr}	String (today's journal text)
journal_meta	{ count, lastDate }
gratitude_today	Array of { text }
skin	Array of step indices completed
period_{YYYY-MM}	Array of day numbers
streak	Number
theme	'light' or 'dark'
chat_history	Array of { role, content, ts } (max 200)
💜 AI Chatbot — Amie
Amie is a floating AI companion (bottom-right 💜 button) powered by the Anthropic Claude API.

How RAG works
On every message, AmoreDB.chat.buildRAGContext() reads the user's live data and injects it into the API prompt:

[User context — today is Mon Apr 07 2025]
- Water: 3/8 glasses today
- Habits: 2/5 done today; Morning stretch ✓, Take vitamins ✓, Read for 10 min, ...
- Mood log (recent): 🌸 Glowing (Mon Apr 07), 🌤 Okay (Sun Apr 06)
- Journal entries total: 12; today's entry: "Feeling a bit tired but..."
- Gratitude today: my coffee, sunny weather
- Skincare routine: 3/5 steps done (Cleanse, Toner, Vitamin C Serum)
- Day streak: 5
- Period days logged this month: 4
This context is prepended to every conversation, so Amie always knows your current state without you having to explain anything.

Setup
The chatbot calls https://api.anthropic.com/v1/messages directly from the browser. In production you should proxy this through your own backend to keep your API key safe.

The API key is handled by the claude.ai environment when running inside Artifacts. For standalone hosting, add your key to the fetch headers:

headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_API_KEY',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
}
Chat history persistence
All messages are saved to localStorage via AmoreDB.chat. The last 200 messages are kept; the last 20 are sent to the API as conversation context.

🔔 Notifications
Notifications in Amore are in-app only (no browser push notifications):

They appear in the Notifications panel (Journal & Mind section)
They are rendered by renderNotifs() which reads current state on page load
Water reminder — shows if < 4 glasses after 10am, or < 8 after 6pm
Mood reminder — shows if no mood logged yet today (after 9am)
Habit reminder — shows if < 50% habits done after 6pm
Journal reminder — shows if no journal entry saved after 8pm
The reminder toggles (Water, Mood, Habit, Journal) in the UI are visual only — they save toggle state but browser push API is not implemented
To add real push notifications, you'd need to register a Service Worker and use the Notifications API.

🔒 Privacy
All data is stored in localStorage on the user's device
Nothing is sent to any server (except Claude API calls from the chatbot, which contain only the anonymised wellness context — no names, emails, or PII)
Works fully offline (except the AI chatbot)
Multi-user: each account's data is isolated under its own namespace key
🚀 Running locally
Just open index.html in a browser — no build step, no dependencies.

# Option 1: open directly
open index.html

# Option 2: local server (recommended for API calls)
npx serve .
# or
python3 -m http.server 8080
💌 Contact
Built with love. Say hi on Telegram: @niriri1
