# Windows .exe Dosyası Oluşturma - Hızlı Rehber

## ⚠️ ÖNEMLİ NOT

**macOS'ta Windows için build almak MÜMKÜN DEĞİLDİR!**

Native modüller (better-sqlite3) nedeniyle Windows build'i **SADECE Windows bilgisayarda** alınabilir.

---

## Hızlı Adımlar

### 1. Projeyi Windows'a Taşıyın

**macOS'ta:**
```bash
cd /Users/mert/Desktop/bihter1
./create-portable-zip.sh
```

Bu komut `bihter1-for-windows.zip` dosyası oluşturur (~2.8 MB).

**ZIP dosyasını USB flash drive'a kopyalayın ve Windows bilgisayara taşıyın.**

### 2. Windows'ta Gereksinimleri Yükleyin

1. **Node.js** (https://nodejs.org/)
   - LTS versiyonu indirin ve yükleyin
   - "Add to PATH" seçeneğini işaretleyin

2. **Visual Studio Build Tools** (https://visualstudio.microsoft.com/downloads/)
   - "Build Tools for Visual Studio" indirin
   - Yüklerken **"Desktop development with C++"** seçeneğini işaretleyin
   - Bu, native modülleri derlemek için **ZORUNLUDUR**

### 3. Projeyi Hazırlayın

**Windows PowerShell veya CMD'de:**

```cmd
# ZIP'i açın ve klasöre gidin
cd C:\path\to\bihter1

# Bağımlılıkları yükleyin
npm install
```

Bu işlem 5-10 dakika sürebilir.

### 4. .exe Dosyası Oluşturun

**Kurulum Dosyası (.exe installer) için:**
```cmd
npm run build:win
```

**Portable Versiyon (kurulum gerektirmez) için:**
```cmd
npm run build:win:portable
```

### 5. .exe Dosyasını Bulun

Build tamamlandıktan sonra:
- **Kurulum dosyası:** `dist/Bihter Admin-1.0.0-Setup.exe`
- **Portable:** `dist/Bihter Admin-1.0.0.exe`

Bu dosyaları USB flash drive'a kopyalayıp diğer Windows bilgisayarlarda kullanabilirsiniz.

---

## Sorun Giderme

### "better-sqlite3 build failed" hatası

**Çözüm:**
1. Visual Studio Build Tools'un yüklü olduğundan emin olun
2. "Desktop development with C++" seçeneğinin yüklü olduğunu kontrol edin
3. PowerShell'i **Yönetici olarak çalıştırın**
4. Tekrar deneyin:

```cmd
npm run rebuild
npm run build:win
```

### Build başarısız olursa

```cmd
# node_modules'ı silin
rmdir /s /q node_modules
del package-lock.json

# Tekrar yükleyin
npm install
npm run build:win
```

---

## Özet

1. ✅ macOS'ta ZIP oluştur: `./create-portable-zip.sh`
2. ✅ ZIP'i Windows'a taşı
3. ✅ Windows'ta Node.js ve Visual Studio Build Tools yükle
4. ✅ `npm install` çalıştır
5. ✅ `npm run build:win` çalıştır
6. ✅ `dist/` klasöründeki `.exe` dosyasını kullan

**Başarılar! 🚀**

