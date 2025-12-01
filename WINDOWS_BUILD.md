# Windows için .exe Dosyası Oluşturma

## Önemli Not

macOS'ta Windows için build almak native modüller (better-sqlite3) nedeniyle sorun çıkarabilir. **En iyi yöntem Windows bilgisayarda build almaktır.**

## macOS'ta Windows Build (Deneysel)

Eğer macOS'ta denemek isterseniz:

```bash
cd /Users/mert/Desktop/bihter1
npm run build:win
```

**Not:** Bu işlem başarısız olabilir çünkü `better-sqlite3` native modülü Windows için macOS'ta derlenemeyebilir.

## Windows'ta Build Alma (Önerilen)

### 1. Windows Bilgisayarda Hazırlık

1. Node.js ve npm yükleyin (https://nodejs.org/)
2. Projeyi Windows bilgisayara kopyalayın
3. Terminal/PowerShell'de proje klasörüne gidin

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Windows için Build Alın

```bash
npm run build:win
```

Bu komut `dist/` klasöründe şu dosyayı oluşturur:
- `Bihter Admin-1.0.0-Setup.exe` - Windows kurulum dosyası

### 4. Kurulum Dosyasını Dağıtın

- `dist/Bihter Admin-1.0.0-Setup.exe` dosyasını USB flash drive'a kopyalayın
- Diğer Windows bilgisayarlarda bu dosyayı çalıştırın

## Alternatif: Portable Versiyon

Eğer kurulum yerine taşınabilir (portable) bir versiyon istiyorsanız, `package.json`'daki `win.target` kısmını şu şekilde değiştirin:

```json
"win": {
  "target": [
    {
      "target": "portable",
      "arch": ["x64"]
    }
  ]
}
```

Bu durumda `dist/` klasöründe `Bihter Admin-1.0.0.exe` dosyası oluşur ve kurulum gerektirmez.

## Sorun Giderme

### "better-sqlite3" build hatası

Windows'ta build alırken `better-sqlite3` hatası alırsanız:

1. Visual Studio Build Tools yükleyin (https://visualstudio.microsoft.com/downloads/)
2. "Desktop development with C++" seçeneğini yükleyin
3. Tekrar deneyin:

```bash
npm run rebuild
npm run build:win
```

### Build başarısız olursa

1. `node_modules` klasörünü silin
2. `package-lock.json` dosyasını silin
3. Tekrar yükleyin:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build:win
```

## Kurulum Özellikleri

Oluşturulan `.exe` dosyası:
- ✅ Kullanıcı kurulum dizinini seçebilir
- ✅ Masaüstü kısayolu oluşturur
- ✅ Başlat menüsüne ekler
- ✅ Kurulumdan sonra otomatik başlatır
- ✅ Kaldırma programı içerir

## Versiyon Güncelleme

Yeni bir sürüm için `package.json`'daki `version` numarasını artırın:

```json
"version": "1.0.1"
```

Sonra tekrar build alın.

