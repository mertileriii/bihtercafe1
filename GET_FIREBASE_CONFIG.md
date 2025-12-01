# 🔥 Firebase Web App Config Nasıl Alınır?

Domain'deki menünün çalışması için Firebase Web App Configuration bilgilerine ihtiyacımız var.

## Adımlar:

### 1. Firebase Console'a Gidin
https://console.firebase.google.com/ → Projenizi seçin (`bihtercafemenu`)

### 2. Project Settings'e Gidin
- Sol üstte ⚙️ (Settings) ikonuna tıklayın
- **Project settings** seçeneğine tıklayın

### 3. Web App Config'i Bulun
- Sayfanın altında **"Your apps"** bölümünü bulun
- **Web** ikonuna (</>) tıklayın
- Eğer Web app yoksa:
  - **"Add app"** → **Web** (</>) ikonuna tıklayın
  - App nickname: `Bihter Cafe Menu`
  - **Register app** butonuna tıklayın

### 4. Config Bilgilerini Kopyalayın
Şu bilgileri göreceksiniz:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← Bu
  authDomain: "bihtercafemenu.web.app",
  projectId: "bihtercafemenu",
  storageBucket: "bihtercafemenu.appspot.com",  // ← Bu
  messagingSenderId: "123456789",  // ← Bu
  appId: "1:123456789:web:abc123"  // ← Bu
};
```

### 5. Bu Bilgileri Paylaşın
Aşağıdaki bilgileri bana verin:
- ✅ `apiKey`
- ✅ `storageBucket` (genelde `[project-id].appspot.com`)
- ✅ `messagingSenderId`
- ✅ `appId`

**VEYA** tüm config objesini paylaşın, ben güncellerim!

---

## Hızlı Yol:
Firebase Console → Project Settings → General → Your apps → Web app
→ Config bilgilerini kopyala ve bana gönder! 📋


