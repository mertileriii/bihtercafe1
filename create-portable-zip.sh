#!/bin/bash
# Projeyi Windows'a kopyalamak için ZIP oluşturma scripti

echo "📦 Proje ZIP dosyası oluşturuluyor..."
echo ""

# Proje dizinine git
cd "$(dirname "$0")"

# ZIP dosyası adı
ZIP_NAME="bihter1-for-windows.zip"

# Eski ZIP varsa sil
if [ -f "$ZIP_NAME" ]; then
    echo "🗑️  Eski ZIP dosyası siliniyor..."
    rm "$ZIP_NAME"
fi

# ZIP oluştur (node_modules ve dist hariç)
echo "📦 ZIP oluşturuluyor (node_modules ve dist hariç)..."
zip -r "$ZIP_NAME" . \
    -x "node_modules/*" \
    -x "dist/*" \
    -x "*.DS_Store" \
    -x ".git/*" \
    -x "*.log" \
    -x ".vscode/*" \
    -x ".idea/*" \
    > /dev/null 2>&1

# Dosya boyutunu göster
if [ -f "$ZIP_NAME" ]; then
    SIZE=$(du -h "$ZIP_NAME" | cut -f1)
    echo "✅ ZIP dosyası oluşturuldu: $ZIP_NAME"
    echo "📊 Dosya boyutu: $SIZE"
    echo ""
    echo "📍 Dosya konumu: $(pwd)/$ZIP_NAME"
    echo ""
    echo "📋 Sonraki adımlar:"
    echo "   1. Bu ZIP dosyasını USB flash drive'a kopyalayın"
    echo "   2. Windows bilgisayarda ZIP'i açın"
    echo "   3. PowerShell'de: cd bihter1 && npm install"
    echo "   4. npm run build:win"
else
    echo "❌ ZIP dosyası oluşturulamadı!"
    exit 1
fi

