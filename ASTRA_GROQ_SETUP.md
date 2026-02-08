# ✅ Astra Switched to Groq!

## What I Just Did

1. ✅ **Updated `lib/gemini.ts`** to use Groq API instead of Gemini
2. ✅ **Updated `.env.local`** with Groq API key placeholder

---

## What You Need to Do Now (2 minutes)

### Step 1: Get Your Free Groq API Key

1. **Go to:** https://console.groq.com/keys
2. **Sign up** (free, just email)
3. **Click** "Create API Key"
4. **Name it** "Astra" (or anything)
5. **Copy** the key (starts with `gsk_...`)

### Step 2: Add Key to .env.local

Open: `c:\Users\jassi\Desktop\habit-react\.env.local`

Find line 24 and replace `your_groq_api_key_here` with your actual key:

```env
NEXT_PUBLIC_GROQ_API_KEY=gsk_your_actual_key_here
```

**Save the file** (Ctrl+S)

### Step 3: Restart Dev Server

In your terminal:
```bash
# Press Ctrl+C to stop
npm run dev
```

### Step 4: Test Astra

1. **Refresh browser** (Ctrl+Shift+R)
2. **Click** the Astra orb (bottom right)
3. **Type** "Hello Astra"
4. **Check console** - you should see:
   ```
   [Astra] ✓ Connected via Groq (Llama 3.3 70B)
   ```

---

## Why Groq is Better

- ✅ **No project setup** - just one API key
- ✅ **100% free** forever
- ✅ **Faster than GPT-4** (seriously!)
- ✅ **No billing required**
- ✅ **No v1beta issues**
- ✅ **Works immediately**

---

## Troubleshooting

### If you see "API key invalid":
- Make sure you copied the entire key (starts with `gsk_`)
- Make sure there are no spaces before/after the key
- Make sure you saved .env.local
- Make sure you restarted the dev server

### If Astra doesn't respond:
- Check browser console (F12)
- Look for `[Astra]` logs
- Make sure you hard refreshed (Ctrl+Shift+R)

---

## Next Steps

Once Astra is working, try these commands:
- "Astra, give me a status report"
- "How am I doing on my tasks?"
- "What should I focus on today?"
- Click the Mic icon and speak!

---

**Let me know once you've added the Groq API key and I'll help you test it!**
