# Projeyi Windows Bilgisayara Kopyalama Rehberi

## Yöntem 1: USB Flash Drive (En Kolay) ⭐ ÖNERİLEN

### Adımlar:

1. **USB flash drive'ı Mac'inize takın**

2. **Proje klasörünü USB'ye kopyalayın:**
   ```bash
   # Terminal'de:
   cp -r /Users/mert/Desktop/bihter1 /Volumes/USB_DRIVE_NAME/
   ```
   
   VEYA Finder'da:
   - `bihter1` klasörünü bulun
   - USB flash drive'a sürükleyin

3. **USB'yi güvenle çıkarın:**
   - Finder'da USB'yi sağ tıklayın → "Çıkar"

4. **Windows bilgisayarda:**
   - USB'yi takın
   - `bihter1` klasörünü Windows bilgisayara kopyalayın (örneğin: `C:\Users\YourName\Desktop\bihter1`)

### ⚠️ Önemli Notlar:
- USB flash drive'ın yeterli boş alanı olduğundan emin olun (en az 500 MB)
- `node_modules` klasörünü kopyalamak isteyip istemediğinize karar verin:
  - **Kopyalayın:** Daha hızlı (ama büyük dosya boyutu ~200-300 MB)
  - **Kopyalamayın:** Daha küçük, ama Windows'ta `npm install` çalıştırmanız gerekir

---

## Yöntem 2: Network Paylaşımı (Aynı Ağdaysa)

### macOS'ta Paylaşım Açma:

1. **Sistem Tercihleri** → **Paylaşım** → **Dosya Paylaşımı**'nı açın
2. **Seçenekler** → **SMB**'yi işaretleyin
3. Paylaşmak istediğiniz klasörü ekleyin (`bihter1`)

### Windows'tan Erişim:

1. Windows'ta **Dosya Gezgini**'ni açın
2. Adres çubuğuna yazın: `\\MAC_IP_ADDRESS` (örneğin: `\\192.168.1.100`)
3. Mac kullanıcı adı ve şifresiyle giriş yapın
4. `bihter1` klasörünü kopyalayın

---

## Yöntem 3: Cloud Storage (Google Drive, Dropbox, OneDrive)

### Adımlar:

1. **Cloud storage hesabınıza giriş yapın** (Google Drive, Dropbox, vb.)

2. **`bihter1` klasörünü ZIP olarak sıkıştırın:**
   ```bash
   cd /Users/mert/Desktop
   zip -r bihter1.zip bihter1 -x "bihter1/node_modules/*" -x "bihter1/dist/*"
   ```
   
   ⚠️ **Not:** `node_modules` ve `dist` klasörlerini hariç tutuyoruz (çok büyük)

3. **ZIP dosyasını cloud storage'a yükleyin**

4. **Windows bilgisayarda:**
   - ZIP dosyasını indirin
   - Açın ve `bihter1` klasörünü çıkarın
   - `npm install` çalıştırın (bağımlılıkları yüklemek için)

---

## Yöntem 4: Git Repository (Geliştiriciler için)

### Eğer Git kullanıyorsanız:

1. **GitHub/GitLab'a push edin:**
   ```bash
   cd /Users/mert/Desktop/bihter1
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Windows'ta clone edin:**
   ```cmd
   git clone YOUR_REPO_URL
   cd bihter1
   npm install
   ```

### ⚠️ Önemli:
- `.gitignore` dosyasına `node_modules/`, `dist/`, `firebase-service-account.json` ekleyin
- `firebase-service-account.json` hassas bilgi içerir, Git'e eklemeyin!

---

## Yöntem 5: WeTransfer / SendAnywhere (Büyük Dosyalar için)

1. **WeTransfer.com** veya **SendAnywhere.com**'a gidin
2. `bihter1` klasörünü ZIP olarak sıkıştırın (yukarıdaki komutla)
3. ZIP dosyasını yükleyin
4. Windows bilgisayarda indirin ve açın

---

## ⭐ ÖNERİLEN YÖNTEM: USB Flash Drive (Basit ve Hızlı)

### Hızlı Adımlar:

1. USB flash drive'ı Mac'e takın
2. Finder'da `bihter1` klasörünü bulun
3. USB flash drive'a sürükleyin
4. USB'yi güvenle çıkarın
5. Windows bilgisayarda USB'yi takın
6. `bihter1` klasörünü Windows'a kopyalayın

### Kopyalarken Dikkat Edilecekler:

**Kopyalayın:**
- ✅ `electron/` klasörü
- ✅ `admin/` klasörü
- ✅ `images/` klasörü
- ✅ `firebase-config.js`
- ✅ `firebase-service-account.json` (ÖNEMLİ!)
- ✅ `package.json`
- ✅ `package-lock.json`

**İsteğe Bağlı (Kopyalamasanız da olur):**
- ⚠️ `node_modules/` - Windows'ta `npm install` çalıştırabilirsiniz
- ⚠️ `dist/` - Build dosyaları, gerekmez

---

## Windows'ta İlk Kurulum

Projeyi Windows'a kopyaladıktan sonra:

1. **PowerShell veya CMD'yi açın**

2. **Proje klasörüne gidin:**
   ```cmd
   cd C:\path\to\bihter1
   ```

3. **Bağımlılıkları yükleyin:**
   ```cmd
   npm install
   ```

4. **Build alın:**
   ```cmd
   npm run build:win
   ```

---

## Sorun Giderme

### "Dosya çok büyük" hatası alırsanız:

`node_modules` klasörünü hariç tutun:
```bash
cd /Users/mert/Desktop
zip -r bihter1.zip bihter1 -x "bihter1/node_modules/*" -x "bihter1/dist/*"
```

Windows'ta `npm install` çalıştırın.

### USB'de dosyalar görünmüyorsa:

- USB'yi NTFS veya exFAT formatında formatlayın (FAT32 4GB'dan büyük dosyaları desteklemez)

---

## Hızlı Başlangıç Komutu (macOS)

Terminal'de şu komutu çalıştırarak `node_modules` olmadan ZIP oluşturabilirsiniz:

```bash
cd /Users/mert/Desktop
zip -r bihter1.zip bihter1 -x "bihter1/node_modules/*" -x "bihter1/dist/*" -x "*.DS_Store"
```

Bu ZIP dosyasını USB'ye kopyalayın veya cloud storage'a yükleyin.

