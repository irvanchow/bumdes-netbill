#!/bin/bash

# Script Setup Database PostgreSQL untuk BumDes Billing (Fixed)

set -e

echo "=========================================="
echo "Setup Database PostgreSQL"
echo "=========================================="
echo ""

# Cek apakah PostgreSQL sudah terinstall
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL belum terinstall!"
    echo "Jalankan setup-vps.sh terlebih dahulu"
    exit 1
fi

# Cek status PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    echo "🔄 Starting PostgreSQL..."
    systemctl start postgresql
fi

# Prompt untuk password
read -sp "Masukkan password untuk user database 'bumdes': " DB_PASSWORD
echo ""

# Buat user dan database
echo "📦 Membuat user dan database..."
su - postgres -c "psql" << EOF
CREATE USER bumdes WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE bumdes OWNER bumdes;
GRANT ALL PRIVILEGES ON DATABASE bumdes TO bumdes;
ALTER DATABASE bumdes OWNER TO bumdes;
\q
EOF

echo "✅ User dan database berhasil dibuat"

# Update pg_hba.conf
echo "📦 Konfigurasi PostgreSQL..."
PG_VERSION=$(ls /etc/postgresql/ | head -n 1)
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Backup original
cp $PG_HBA ${PG_HBA}.backup

# Tambahkan konfigurasi jika belum ada
if ! grep -q "local.*bumdes.*md5" $PG_HBA; then
    echo "local   all             bumdes                                  md5" >> $PG_HBA
fi

if ! grep -q "host.*bumdes.*127.0.0.1.*md5" $PG_HBA; then
    echo "host    all             bumdes          127.0.0.1/32            md5" >> $PG_HBA
fi

# Restart PostgreSQL
systemctl restart postgresql
echo "✅ PostgreSQL dikonfigurasi dan direstart"

# Test koneksi
echo ""
echo "🧪 Test koneksi database..."
PGPASSWORD=$DB_PASSWORD psql -U bumdes -h localhost -d bumdes -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Koneksi database berhasil!"
else
    echo "❌ Koneksi database gagal. Cek konfigurasi."
fi

echo ""
echo "=========================================="
echo "✅ Setup database selesai!"
echo "=========================================="
echo ""
echo "Connection string:"
echo "postgresql://bumdes:$DB_PASSWORD@localhost:5432/bumdes"
echo ""
echo "⚠️  SIMPAN PASSWORD INI untuk .env.production"
echo ""
