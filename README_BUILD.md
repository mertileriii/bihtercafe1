# Build Alma Rehberi - Özet

## ⚠️ ÖNEMLİ UYARI

**macOS'ta Windows için build almak MÜMKÜN DEĞİLDİR!**

Tüm `build:win` komutları **SADECE Windows bilgisayarda** çalışır.

## Hangi Komut Ne İşe Yarar?

### macOS'ta Çalışan Komutlar

```bash
npm run build:mac    # macOS için .dmg dosyası oluşturur
npm run build        # Tüm platformlar için (ama Windows build başarısız olur)
```

### Windows'ta Çalışan Komutlar

```cmd
npm run build:win              # Windows kurulum dosyası (.exe installer)
npm run build:win:portable     # Windows portable versiyon (.exe, kurulum gerektirmez)
```

## Hangi Komutu Kullanmalıyım?

### Windows Kurulum Dosyası İstiyorsanız:
```cmd
npm run build:win
```
→ `Bihter Admin-1.0.0-Setup.exe` oluşturur
→ Kurulum gerektirir, Program Files'a yüklenir

### Taşınabilir Versiyon İstiyorsanız:
```cmd
npm run build:win:portable
```
→ `Bihter Admin-1.0.0.exe` oluşturur
→ Kurulum gerektirmez, USB'den çalıştırılabilir

## Neden macOS'ta Çalışmıyor?

`better-sqlite3` native bir modüldür ve Windows için macOS'ta derlenemez. Bu yüzden:

- ❌ macOS'ta `npm run build:win` → HATA
- ❌ macOS'ta `npm run build:win:portable` → HATA
- ✅ Windows'ta `npm run build:win` → BAŞARILI
- ✅ Windows'ta `npm run build:win:portable` → BAŞARILI

## Çözüm

Windows bilgisayarda build alın. Detaylı rehber için `WINDOWS_BUILD_STEPS.md` dosyasına bakın.

