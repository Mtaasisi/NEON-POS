# 🔐 Passcode Management - Quick Start

## ✅ Done! Feature is Live!

Your POS now supports **custom passcodes** for day opening/closing!

---

## 🎯 How to Change Passcode (3 Steps):

1. **Open POS** → Click **Settings** ⚙️
2. **General Tab** → Scroll to **"Security Settings"**
3. **Enter New Passcode** → Click **"Save"**

Done! ✅

---

## 📍 Where to Find It:

```
POS Page
  └─ Settings Button (top right)
      └─ General Tab
          └─ Security Settings (scroll down)
              └─ Day Closing Passcode field
```

---

## 🔥 What It Does:

| Action | Before | After |
|--------|--------|-------|
| Close Day | Passcode: `1234` (hardcoded) | Passcode: **Your custom code** |
| Open Day | Passcode: `1234` (hardcoded) | Passcode: **Your custom code** |
| Change Code | ❌ Not possible | ✅ **In Settings!** |

---

## 🚀 Quick Test:

```bash
# 1. Current passcode is: 1234
Close Day → Enter 1234 → ✅ Works

# 2. Change to: 5678
Settings → Security → Passcode: 5678 → Save

# 3. Test new passcode
Close Day → Enter 5678 → ✅ Works!
Close Day → Enter 1234 → ❌ "Invalid passcode"
```

---

## 💡 Pro Tips:

- ✅ Use 4-6 digits
- ✅ Change monthly for security
- ✅ Share only with authorized staff
- ❌ Avoid obvious codes like "1111" or "0000"

---

## 🆘 If You Forget the Passcode:

**Admin Can Reset:**
```sql
UPDATE lats_pos_general_settings 
SET day_closing_passcode = '1234';
```

Then it's back to default: `1234`

---

## 📝 Default Passcode:

**Current Default**: `1234`

This is set automatically for all existing installations. You can change it anytime!

---

## ✨ That's It!

Simple, secure, and customizable! 

Need more details? Read `PASSCODE-MANAGEMENT-GUIDE.md`

🎉 **Enjoy your secure POS!**

