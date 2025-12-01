# Firebase Setup Guide

## 🔥 Firebase Firestore Kurulumu

Bu proje, ürünlerin domain'de (`bihtercafemenu.web.app`) görünmesi için Firebase Firestore kullanıyor.

### Adım 1: Firebase Console'da Proje Oluşturma

1. https://console.firebase.google.com/ adresine gidin
2. Yeni bir proje oluşturun veya mevcut projeyi seçin
3. Proje ID'nizi not edin

### Adım 2: Firestore Database Oluşturma

1. Firebase Console'da **Firestore Database** sekmesine gidin
2. **Create database** butonuna tıklayın
3. **Production mode** seçin (veya Test mode)
4. Bölge seçin (örn: `europe-west1`)
5. **Enable** butonuna tıklayın

### Adım 3: Service Account Key İndirme (Electron için)

1. Firebase Console'da **Project Settings** → **Service Accounts** sekmesine gidin
2. **Generate new private key** butonuna tıklayın
3. JSON dosyasını indirin
4. İndirilen dosyayı proje root dizinine kopyalayın: `/Users/mert/Desktop/bihter1/firebase-service-account.json`
5. ⚠️ **GÜVENLİK**: Bu dosyayı git'e commit etmeyin! `.gitignore`'a ekleyin.

### Adım 4: Firestore Security Rules

Firebase Console'da **Firestore Database** → **Rules** sekmesine gidin ve şu kuralları ekleyin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Menu items - herkes okuyabilir, sadece admin yazabilir
    match /menu_items/{itemId} {
      allow read: if true; // Herkes okuyabilir (domain menüsü için)
      allow write: if false; // Sadece Admin SDK ile yazılabilir (Electron'dan)
    }
  }
}
```

### Adım 5: Firebase Web App Configuration

Firebase Console'da **Project Settings** → **General** sekmesine gidin:

1. **Your apps** bölümünde **Web** ikonuna tıklayın (</>)
2. App nickname girin: `Bihter Cafe Menu`
3. **Register app** butonuna tıklayın
4. Firebase configuration bilgilerini kopyalayın

### Adım 6: Domain'deki app.js'i Güncelleme

`app.js` dosyasındaki Firebase config'i güncelleyin:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "bihtercafemenu.web.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Adım 7: Firebase Hosting (Opsiyonel)

Domain'inizi Firebase Hosting'e deploy edin:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```

### ✅ Test

1. Electron uygulamasını başlatın: `npm start`
2. Admin panelde bir ürün ekleyin
3. Domain'de (`bihtercafemenu.web.app`) menüyü açın
4. Eklediğiniz ürünün göründüğünü kontrol edin

### 🔒 Güvenlik Notları

- ✅ Service Account Key dosyasını `.gitignore`'a ekleyin
- ✅ Firestore Security Rules'u production için optimize edin
- ✅ Domain'de sadece okuma izni verin
- ✅ Yazma işlemleri sadece Electron admin panelinden yapılsın

### 📝 .gitignore

`.gitignore` dosyasına ekleyin:
```
firebase-service-account.json
```


