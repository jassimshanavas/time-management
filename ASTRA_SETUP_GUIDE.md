# CRITICAL: Astra AI - API Key Issue

## The Problem (100% Confirmed)

Your current API key (`AIzaSyDhrcYZxP0EsiFlZUuZfSGA3VPeVHYM5dM`) **does NOT have access** to the `v1beta` API endpoint that the Google Generative AI SDK requires.

All requests are failing with:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
404 (Not Found)
```

This is NOT a code issue. This is an API key permissions issue.

---

## The ONLY Solution

You **MUST** create a new API key. Here's exactly how:

### Step 1: Go to Google AI Studio
**Link:** https://aistudio.google.com/app/apikey

### Step 2: Create New API Key
1. Click the blue **"Create API key"** button
2. **IMPORTANT:** Select **"Create API key in new project"**
   - Do NOT select "in existing project"
   - This ensures the new project has all permissions

### Step 3: Copy the New Key
- The key will start with `AIza...`
- Copy the ENTIRE key

### Step 4: Update .env.local
Open this file:
```
c:\Users\jassi\Desktop\habit-react\.env.local
```

Find line 23:
```
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyDhrcYZxP0EsiFlZUuZfSGA3VPeVHYM5dM
```

Replace with your NEW key:
```
NEXT_PUBLIC_GEMINI_API_KEY=YOUR_NEW_KEY_HERE
```

**SAVE THE FILE**

### Step 5: Restart Everything
1. In your terminal, press **Ctrl+C** to stop the dev server
2. Run: `npm run dev`
3. In your browser, **hard refresh** (Ctrl+Shift+R)

### Step 6: Test Astra
1. Click the Astra orb (bottom right)
2. Type: "Hello Astra"
3. You should see in the console: `[Astra] ✓ Connected via gemini-...`

---

## Why Your Current Key Doesn't Work

Your key was created in a Google Cloud project that:
- ✅ Has a valid API key
- ❌ Does NOT have the "Generative Language API" enabled
- ❌ Does NOT have access to the v1beta endpoint

The `@google/generative-ai` SDK is hardcoded to use `v1beta`. There is no way to change this in code.

---

## Alternative: Enable API Manually (Advanced)

If you want to keep your current key:

1. Go to: https://console.cloud.google.com/
2. Find which project your key belongs to (check the project dropdown at the top)
3. Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
4. Make sure the correct project is selected
5. Click **"ENABLE"**
6. Wait 5 minutes for propagation
7. Restart your dev server

**However, creating a new key is faster and more reliable.**

---

## After You Get a New Key

Once Astra is working, you'll see this in the console:
```
[Astra] Attempting gemini-1.5-flash-8b...
[Astra] ✓ Connected via gemini-1.5-flash-8b
```

And Astra will respond to your messages!

---

## Need Help?

If you create a new key and it still doesn't work:
1. Make sure you selected "Create API key in **new project**"
2. Make sure you copied the ENTIRE key
3. Make sure you saved .env.local
4. Make sure you restarted the dev server (Ctrl+C, then npm run dev)
5. Make sure you hard refreshed your browser (Ctrl+Shift+R)
