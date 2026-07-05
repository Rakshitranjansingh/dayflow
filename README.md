# 🌊 DayFlow — Your Intelligent Daily Companion
 
> A free, AI-powered personal productivity app that lives on your phone. Track habits, log food, journal your thoughts, manage expenses — and let AI turn your entire day into a beautiful blog and a ready-to-film Hinglish vlog script.
 
---
 
## ✨ What is DayFlow?
 
DayFlow is a **Progressive Web App (PWA)** — a single HTML file you host for free on GitHub Pages that installs on your iPhone or Android like a native app. No App Store. No subscriptions. No servers. Your data stays on **your device** and **your Google Drive**. You bring your own Gemini API key (free tier is more than enough for personal use).
 
---
 
## 🚀 Features
 
### 🤖 AI Tools
- **💬 Chat** — Full AI assistant. Every key insight is automatically saved to your journal.
- **📝 Text Formatter** — One tool for everything: Rewrite, Summarize, Write Email, Split Paragraphs. Choose from 8 tones (Formal, Casual, Family, Persuasive, and more) and apply grammar fixes and clarity improvements.
### 🍎 Nutrition Tracker
- Take a photo of any meal → Gemini AI instantly analyses calories, carbs, protein, and fat
- Multiple meals per day, all tracked with timestamps
- Daily nutrition summary always visible on the homepage
### 📈 Habit Tracker
- Three categories: **Skill**, **Body**, and **Money**
- Daily check-ins with automatic streak counting
- Add your own custom habits to any category
### 😴 Sleep Tracker
- Log your wake-up and sleep time
- Auto-calculates sleep duration
- Weekly sleep history at a glance
### 🎙️ Voice Journal
- Record audio or type your thoughts
- AI transcribes, summarises, detects mood, and extracts to-do items automatically
- All entries saved to that day's journal. Grows throughout the day.
### ✅ To-Do List
- **Today tab** — Tasks for the current day
- **Pending tab** — All incomplete tasks across all days, so nothing ever gets lost
- Tasks auto-added from journal entries when AI detects action items
- Badge count visible on the homepage
### 💸 Expense Tracker
- Two-tap logging: amount + category
- Categories: Food, Transport, Shopping, Health, Entertainment, Other
- Today's total and this month's total always on the homepage
### ⏱️ Focus Timer
- **Stopwatch** — Track how long you work
- **Countdown Timer** — Set any duration
- **Pomodoro** — 25-minute focus sessions with session count
### 📖 Daily Log & Blog
- At the end of the day, tap one button — AI reads all your data (sleep, habits, food, expenses, journal, chat insights) and writes a beautiful personal blog entry in a consistent format
- Gives your day a score out of 100
- Every log saved permanently and browsable by date
### 🎬 Hinglish Vlog Script
- One tap on any daily log generates a **1-minute vlog script**
- Hindi words written in **देवनागरी**, English words in English — natural code-switching
- Starts with a **2–5 second hook** to grab attention instantly
- Includes intro, highlights, food & money recap, and a CTA outro
- Copy to clipboard, done. Start filming.
---
 
## 📱 Installing on Your Phone
 
DayFlow is a PWA — install it like an app directly from your browser.
 
**On iPhone (Safari):**
1. Open your DayFlow URL in Safari
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**
5. DayFlow now appears on your home screen as an app icon ✅
**On Android (Chrome):**
1. Open your DayFlow URL in Chrome
2. Tap the **three-dot menu**
3. Tap **Add to Home Screen**
4. Tap **Add** ✅
---

 
## 🔑 Getting Your Free Gemini API Key
 
DayFlow uses Google Gemini 2.0 Flash for all AI features. The free tier is generous enough for daily personal use.
 
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API Key**
4. Click **Create API Key**
5. Copy the key
**Free tier includes:**
- 15 requests per minute
- 1 million tokens per day
- No credit card required
When you open DayFlow for the first time, it will ask you to paste this key. It is stored **only on your device** and never sent anywhere except directly to Google's API.
 
---
 
## ☁️ Google Drive Backup
 
DayFlow automatically creates a `DayFlow` folder in your Google Drive and backs up your data there.
 
```
📁 My Drive
└── 📁 DayFlow
    ├── 📄 settings.json
    ├── 📄 backup.json
    ├── 📁 daily-logs
    ├── 📁 journals
    └── 📁 exports
```
 
**What's backed up:**
- All habits, streaks, and history
- Sleep logs
- Nutrition data (not the photos themselves)
- Expense records
- Journal entries and transcripts
- Daily blog posts and vlog scripts
- To-do list
**What's NOT stored in Drive:**
- Your API key (for security — stays on device only)
**Media storage policy:**
- Nutrition photos and journal audio are kept for **30 days** in Drive, then auto-deleted to save storage space
- All text data and logs are kept **forever**
- You can change the retention period in Settings

---
 
## 🔒 Privacy & Data
 
| What | Where it's stored |
|------|------------------|
| Your name & preferences | Your device (localStorage) |
| Gemini API key | Your device only — never shared |
| Habits, sleep, expenses | Your device + your Google Drive |
| Journal entries | Your device + your Google Drive |
| Daily blogs | Your device + your Google Drive |
| Food photos | Your Google Drive (30-day rolling) |
| Chat history | Your device |
 
**DayFlow has no backend server. There is no database. No one else can see your data.**
 
---
 
## 📤 Export & Import Your Data
 
At the bottom of the app homepage:
 
- **Export All Data** — Downloads a `dayflow-YYYY-MM-DD.json` file with everything (API key excluded)
- **Import Data** — Upload a previously exported file to restore your data
This means you can:
- Switch devices easily — export on one, import on another
- Keep manual backups anytime
---
 
## 🧭 How to Use DayFlow — Daily Routine
 
**Morning:**
- Open DayFlow → Log your wake time in **Sleep**
- Check your **To-Do** for today's tasks
- Snap a photo of breakfast in **Nutrition**
**Throughout the day:**
- Log meals as you eat with a photo
- Check off habits in **Habits**
- Add expenses with 2 taps in **Expenses**
- Use **Focus** timer for work sessions
- Voice journal quick thoughts anytime
**Evening:**
- Log your sleep time
- Open **Daily Log** → tap **Generate Today's Blog**
- Review your day score and blog
- Tap **Generate Vlog Script** for your 1-min Hinglish script
- Film your vlog and post it 🎬
---
 
## 🎨 Design Philosophy
 
DayFlow is built around one rule: **log fast, review easy, act smart.**
 
Every tool opens in a right-side slide panel, keeping the homepage always visible. The homepage shows only what matters: today's stats, quick tool buttons, and pending alerts. Nothing else.
 
Every tool is designed to take under 10 seconds to use.
 
---
 
## 🛠️ Tech Stack
 
| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript (single file) |
| AI | Google Gemini 2.0 Flash API |
| Local Storage | Browser localStorage |
| Cloud Backup | Google Drive API |
| Hosting | GitHub Pages (free) |
| Install | PWA via Safari / Chrome |
| Cost | 100% free |
 
---
 
## ❓ Frequently Asked Questions
 
**Can multiple people use the same app URL?**
Yes. Everyone who opens the URL gets their own completely private version. Their data goes to their device and their Google Drive. No one can see anyone else's data.
 
**What happens if I clear my browser data?**
Your localStorage will be wiped. This is why Google Drive backup is recommended — you can restore everything from Drive on any device.
 
**Does it work offline?**
Partially. The app loads and you can view existing data offline. AI features (chat, nutrition analysis, journal analysis, blog generation) require an internet connection to call the Gemini API.
 
**Is my API key safe?**
Yes. Your key is saved only in your browser's localStorage on your device. It is never sent to any server except Google's own API endpoint. It is also excluded from all exports.
 
**Can I use a different AI provider?**
Currently DayFlow is built for Google Gemini. Support for other providers may be added in future updates.
 
**The vlog script isn't generating — what's wrong?**
Make sure you have generated a Daily Blog first. The vlog script is based on the blog content. Also verify your API key is valid in Settings.
 
---
 
## 🤝 Contributing
 
DayFlow is open source. If you'd like to improve it:
 
1. Fork the repository on GitHub
2. Make your changes to `dayflow.html`
3. Test on both desktop and mobile
4. Submit a pull request with a description of what you changed
Ideas for contributions: Google Drive OAuth integration, push notifications, multi-language support, dark mode, widget shortcuts.
 
---
 
## 📄 License
 
MIT License — free to use, modify, and distribute.
 
---
 
## 🙏 Credits
 
Built with Care(Gemini, Copilot, Claude, Cursor) · Hosted on [GitHub Pages](https://pages.github.com) · Designed to be used every single day.
 
---
 
*Made with ❤️ · Start your DayFlow today 🌊*
 
