# 🚀 Hızlı Deploy Kılavuzu

## Tek Komutla Deploy (En Basit)

```bash
cd /Users/mert/Desktop/bihter1
firebase deploy --only hosting
```

## Tam Adım Adım Deploy

### 1. Terminal'i açın ve proje dizinine gidin
```bash
cd /Users/mert/Desktop/bihter1
```

### 2. Firebase'e giriş yapın (eğer yapmadıysanız)
```bash
firebase login
```

### 3. Doğru projeyi seçin
```bash
firebase use bihtercafemenu
```

### 4. Deploy edin
```bash
firebase deploy --only hosting
```

### 5. Siteyi kontrol edin
Deploy tamamlandıktan sonra şu URL'yi açın:
**https://bihtercafemenu.web.app**

## Sık Kullanılan Komutlar

### Local'de test etmek için:
```bash
firebase serve --only hosting
```
Bu komut çalıştıktan sonra: **http://localhost:5000**

### Deploy durumunu kontrol etmek için:
```bash
firebase deploy:list
```

### Sadece Firestore Rules'ı deploy etmek için:
```bash
firebase deploy --only firestore:rules
```

## Hata Alırsanız

1. **"Permission denied" hatası:**
   ```bash
   firebase logout
   firebase login
   ```

2. **"Project not found" hatası:**
   ```bash
   firebase use bihtercafemenu
   ```

3. **"Not logged in" hatası:**
   ```bash
   firebase login
   ```

## Önemli Dosyalar

- ✅ `index.html` - Ana sayfa
- ✅ `app.js` - Menü uygulaması
- ✅ `firebase.json` - Hosting yapılandırması
- ❌ `admin/` - Admin paneli (deploy edilmez)
- ❌ `electron/` - Electron app (deploy edilmez)
- ❌ `node_modules/` - Dependencies (deploy edilmez)

## QR Kod Test

Deploy sonrası QR kod okutun ve şu URL'yi açın:
**https://bihtercafemenu.web.app**

Landing page görünmeli! 🎉

