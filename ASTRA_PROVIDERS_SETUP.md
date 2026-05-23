# 🧠 Astra Multi-Provider Failover Setup

Astra is now powered by a **state-of-the-art multi-provider neural fallback system**! 

If one API provider is rate-limited (e.g. Groq free tier limit of 100,000 tokens/day), Astra will **automatically and transparently rotate** to the next available provider within milliseconds, ensuring 100% uptime and seamless operation.

---

## ⚡ Fallback Priority Hierarchy

Astra will attempt completions in this order, based on which keys are configured:

1. **Groq Core** (`llama-3.3-70b-versatile`) — Blazing fast, native 70B capability.
2. **Cerebras Core** (`gpt-oss-120b`) — Unparalleled wafer-scale engine speed, running their production 120B parameter reasoning model.
3. **OpenRouter Llama Free** (`meta-llama/llama-3.3-70b-instruct:free`) — Identical model fallback.
4. **OpenRouter Qwen Free** (`qwen/qwen-2.5-72b-instruct:free`) — Highly capable 72B parameter reasoning and tool-calling backup.

---

## 🔑 How to Get Keys (All 100% Free!)

### 1. Groq (Primary)
* **Register at:** https://console.groq.com/keys
* Key format starts with: `gsk_...`

### 2. Cerebras (High-Speed Fallback)
* **Register at:** https://inference.cerebras.ai/
* Key format starts with: `csk_...`

### 3. OpenRouter (Free Tier Fallback Router)
* **Register at:** https://openrouter.ai/keys
* Key format starts with: `sk-or-...`

---

## ⚙️ Configuration Methods

You can configure your keys using either of the following two methods:

### Method A: Environment Variables (App-wide)
Add these keys to your `c:\Users\jassi\Desktop\habit-react\.env.local` file:

```env
# Groq (Primary)
NEXT_PUBLIC_GROQ_API_KEY=gsk_your_key_here

# Cerebras (Fallback)
NEXT_PUBLIC_CEREBRAS_API_KEY=csk_your_key_here

# OpenRouter (Fallback)
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-your_key_here
```
*Note: Remember to restart the Next.js dev server (`npm run dev`) after updating `.env.local`.*

---

### Method B: Developer LocalStorage Override (No restarts required!)
For instant setup, overrides, or testing keys without editing files, you can inject them directly into your browser console's LocalStorage!

Open your browser's Developer Tools (press `F12` or `Ctrl+Shift+I` on Astra page), navigate to the **Console** tab, and paste any of these commands:

```javascript
// Configure Cerebras
localStorage.setItem('NEXT_PUBLIC_CEREBRAS_API_KEY', 'csk_your_actual_key_here');

// Configure OpenRouter
localStorage.setItem('NEXT_PUBLIC_OPENROUTER_API_KEY', 'sk-or-v1-your_actual_key_here');

// Configure Groq Override
localStorage.setItem('NEXT_PUBLIC_GROQ_API_KEY', 'gsk_your_actual_key_here');
```

Then **refresh the page** (Ctrl+R). Astra will immediately pick up these keys! 

To clear any local override and revert to the `.env.local` defaults:
```javascript
localStorage.removeItem('NEXT_PUBLIC_CEREBRAS_API_KEY');
localStorage.removeItem('NEXT_PUBLIC_OPENROUTER_API_KEY');
```

---

## 🖥️ Live Telemetry Logs
To confirm which provider is currently serving Astra's replies, check the **Jarvis Cinematic Terminal** on the Astra dashboard. Replies will display the active serving provider in real time, e.g.:

* `ASTRA NUCLEUS REPLY (Groq (Llama 3.3 70B)): "Certainly, Sir..."`
* `ASTRA NUCLEUS REPLY (Cerebras (Llama 3.3 70B)): "Focus protocol active, Sir..."`
* `ASTRA NUCLEUS REPLY (OpenRouter Llama 3.3 70B (Free)): "Tasks updated, Sir..."`
