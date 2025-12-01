# GitHub Actions ile Windows .exe Oluşturma (Ücretsiz)

## ✅ Avantajlar

- ❌ Windows bilgisayar gerekmez
- ❌ Node.js yüklemenize gerek yok
- ❌ Visual Studio Build Tools yüklemenize gerek yok
- ✅ GitHub'ın Windows sunucularında otomatik build
- ✅ Ücretsiz (public repo için)
- ✅ Her zaman en güncel build

## Adım Adım Rehber

### 1. GitHub Repository Oluşturun

1. GitHub.com'a gidin ve yeni bir repository oluşturun
2. Repository'yi public yapın (ücretsiz GitHub Actions için)

### 2. Projeyi GitHub'a Yükleyin

**macOS Terminal'de:**

```bash
cd /Users/mert/Desktop/bihter1

# Git initialize (eğer yoksa)
git init

# .gitignore oluştur
cat > .gitignore << EOF
node_modules/
dist/
*.log
.DS_Store
firebase-service-account.json
EOF

# Dosyaları ekle
git add .

# Commit yap
git commit -m "Initial commit"

# GitHub repository'nizi ekleyin (YOUR_USERNAME ve YOUR_REPO_NAME'i değiştirin)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 3. GitHub Actions'ı Tetikleyin

1. GitHub repository'nize gidin
2. **Actions** sekmesine tıklayın
3. **Build Windows Executable** workflow'unu seçin
4. **Run workflow** butonuna tıklayın
5. **Run workflow** butonuna tekrar tıklayın

### 4. Build'i İndirin

1. Actions sekmesinde workflow'un tamamlanmasını bekleyin (5-10 dakika)
2. Workflow tamamlandığında, **"windows-exe"** artifact'ına tıklayın
3. `.exe` dosyasını indirin

## Alternatif: Manuel Tag ile Build

```bash
# Tag oluştur
git tag v1.0.0
git push origin v1.0.0
```

Bu tag push edildiğinde otomatik olarak build başlar.

## ⚠️ Önemli Notlar

1. **firebase-service-account.json**: Bu dosya hassas bilgi içerir, `.gitignore`'a ekleyin
2. **Public Repository**: Ücretsiz GitHub Actions için repository public olmalı
3. **Private Repository**: Eğer private kullanmak isterseniz, GitHub Pro gerekir (ücretli)

## Sorun Giderme

### Build başarısız olursa

1. Actions sekmesinde workflow'u açın
2. Hata mesajlarını kontrol edin
3. Genellikle `npm install` veya `npm run rebuild` hataları olur
4. `.github/workflows/build-windows.yml` dosyasını kontrol edin

### Artifact bulunamıyorsa

- Workflow'un tamamlandığından emin olun
- "windows-exe" artifact'ının oluşturulduğunu kontrol edin
- Eğer yoksa, workflow loglarını kontrol edin

## Özet

1. ✅ GitHub repository oluştur
2. ✅ Projeyi GitHub'a push et
3. ✅ Actions sekmesinden workflow'u çalıştır
4. ✅ Build tamamlandığında .exe dosyasını indir

**Bu yöntemle Windows bilgisayar olmadan .exe dosyası oluşturabilirsiniz! 🚀**

