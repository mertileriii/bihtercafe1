# Windows .exe Dosyası Oluşturma - Adım Adım Rehber

## ⚠️ ÇOK ÖNEMLİ

**macOS'ta Windows için build almak MÜMKÜN DEĞİLDİR!**

- ❌ `npm run build:win` macOS'ta çalışmaz
- ❌ `npm run build:win:portable` macOS'ta çalışmaz
- ❌ Her iki komut da aynı hatayı verir (better-sqlite3 native modül sorunu)

**Çözüm:** Bu komutları **SADECE Windows bilgisayarda** çalıştırın!

---

## Windows Bilgisayarda Yapılacaklar

### Adım 1: Gereksinimleri Yükleyin

1. **Node.js** yükleyin (https://nodejs.org/)
   - LTS versiyonunu öneriyoruz (v20.x veya üzeri)
   - Yüklerken "Add to PATH" seçeneğini işaretleyin

2. **Visual Studio Build Tools** yükleyin (https://visualstudio.microsoft.com/downloads/)
   - "Build Tools for Visual Studio" indirin
   - Yüklerken "Desktop development with C++" seçeneğini işaretleyin
   - Bu, native modülleri derlemek için gereklidir

### Adım 2: Projeyi Windows'a Taşıyın

1. Proje klasörünü (`bihter1`) Windows bilgisayara kopyalayın
   - USB flash drive kullanabilirsiniz
   - Veya network üzerinden paylaşabilirsiniz

2. Proje klasörüne gidin (PowerShell veya CMD'de):
```cmd
cd C:\path\to\bihter1
```

### Adım 3: Bağımlılıkları Yükleyin

```cmd
npm install
```

Bu işlem birkaç dakika sürebilir.

### Adım 4: Windows için Build Alın

**⚠️ NOT:** Bu adımları **SADECE Windows bilgisayarda** yapın!

#### Seçenek 1: Kurulum Dosyası (.exe installer) - ÖNERİLEN

Windows PowerShell veya CMD'de:

```cmd
npm run build:win
```

Bu komut `dist/` klasöründe şu dosyayı oluşturur:
- **`Bihter Admin-1.0.0-Setup.exe`** - Windows kurulum dosyası (~100-150 MB)

**Özellikler:**
- ✅ Kullanıcı kurulum dizinini seçebilir
- ✅ Masaüstü kısayolu oluşturur
- ✅ Başlat menüsüne ekler
- ✅ Kurulumdan sonra otomatik başlatır
- ✅ Kaldırma programı içerir (Program Files'tan kaldırılabilir)

#### Seçenek 2: Portable Versiyon (Kurulum Gerektirmez)

Windows PowerShell veya CMD'de:

```cmd
npm run build:win:portable
```

Bu komut `dist/` klasöründe şu dosyayı oluşturur:
- **`Bihter Admin-1.0.0.exe`** - Taşınabilir uygulama (~100-150 MB)

**Özellikler:**
- ✅ Kurulum gerektirmez
- ✅ USB'den çalıştırılabilir
- ✅ Tek dosya
- ✅ Herhangi bir klasöre kopyalanıp çalıştırılabilir
- ❌ Başlat menüsüne otomatik eklenmez
- ❌ Kaldırma programı yok (dosyayı silmek yeterli)

### Adım 5: Kurulum Dosyasını Dağıtın

1. `dist/` klasörüne gidin
2. `.exe` dosyasını USB flash drive'a kopyalayın
3. Diğer Windows bilgisayarlarda bu dosyayı çalıştırın

---

## Kurulum Kullanımı

### Setup.exe (Kurulum Dosyası)

1. `Bihter Admin-1.0.0-Setup.exe` dosyasını çift tıklayın
2. Kurulum sihirbazını takip edin:
   - Kurulum dizinini seçin (varsayılan: `C:\Program Files\Bihter Admin`)
   - "Kur" butonuna tıklayın
3. Kurulum tamamlandıktan sonra uygulama otomatik başlatılır
4. Masaüstünde "Bihter Admin" kısayolu oluşur

### Portable (.exe)

1. `Bihter Admin-1.0.0.exe` dosyasını istediğiniz yere kopyalayın
2. Çift tıklayarak çalıştırın
3. Kurulum gerektirmez

---

## Sorun Giderme

### Hata: "better-sqlite3 build failed"

**Çözüm:**
1. Visual Studio Build Tools'un yüklü olduğundan emin olun
2. "Desktop development with C++" seçeneğinin yüklü olduğunu kontrol edin
3. PowerShell'i **Yönetici olarak çalıştırın**
4. Tekrar deneyin:

```cmd
npm run rebuild
npm run build:win
```

### Hata: "node-gyp rebuild failed"

**Çözüm:**
```cmd
npm install -g windows-build-tools
npm run rebuild
npm run build:win
```

### Build başarısız olursa

1. `node_modules` klasörünü silin
2. `package-lock.json` dosyasını silin
3. Tekrar yükleyin:

```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
npm run build:win
```

---

## Versiyon Güncelleme

Yeni bir sürüm için `package.json` dosyasını açın ve `version` numarasını artırın:

```json
"version": "1.0.1"
```

Sonra tekrar build alın.

---

## Özet

✅ **Windows bilgisayarda build alın** (macOS'ta çalışmaz)
✅ **Visual Studio Build Tools yükleyin** (native modüller için)
✅ **`npm run build:win`** komutunu çalıştırın
✅ **`dist/` klasöründeki `.exe` dosyasını dağıtın**

Başarılar! 🚀

