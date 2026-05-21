# Panduan Deployment BumDes Billing ke VPS

## Informasi Server
- **IP VPS**: 38.47.176.110
- **Domain**: netbill.matadewa.my.id
- **Aplikasi**: Next.js 16 + PostgreSQL

---

## Langkah 1: Setup DNS Domain

1. Login ke panel domain Anda (matadewa.my.id)
2. Tambahkan A Record:
   ```
   Type: A
   Name: netbill
   Value: 38.47.176.110
   TTL: 3600 (atau default)
   ```
3. Tunggu propagasi DNS (5-30 menit)
4. Verifikasi dengan: `ping netbill.matadewa.my.id`

---

## Langkah 2: Persiapan VPS (Ubuntu 22.04/24.04)

### 2.1 Login ke VPS
```bash
ssh root@38.47.176.110
```

### 2.2 Update sistem
```bash
apt update && apt upgrade -y
```

### 2.3 Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Verifikasi
npm --version
```

### 2.4 Install PostgreSQL 16
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 2.5 Install Nginx
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 2.6 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 2.7 Install Certbot (untuk SSL)
```bash
apt install -y certbot python3-certbot-nginx
```

---

## Langkah 3: Setup Database PostgreSQL

### 3.1 Buat user dan database
```bash
sudo -u postgres psql
```

Di dalam PostgreSQL prompt:
```sql
CREATE USER bumdes WITH PASSWORD 'password_aman_anda';
CREATE DATABASE bumdes OWNER bumdes;
GRANT ALL PRIVILEGES ON DATABASE bumdes TO bumdes;
\q
```

### 3.2 Konfigurasi PostgreSQL untuk koneksi lokal
Edit file `/etc/postgresql/16/main/pg_hba.conf`:
```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Pastikan ada baris ini:
```
local   all             bumdes                                  md5
host    all             bumdes          127.0.0.1/32            md5
```

Restart PostgreSQL:
```bash
systemctl restart postgresql
```

---

## Langkah 4: Upload Aplikasi ke VPS

### 4.1 Buat direktori aplikasi
```bash
mkdir -p /var/www/bumdes
cd /var/www/bumdes
```

### 4.2 Upload file (dari komputer lokal)

**Opsi A: Menggunakan Git (Recommended)**
```bash
# Di VPS
cd /var/www/bumdes
git clone <repository-url> .
npm install
```

**Opsi B: Menggunakan SCP (dari komputer Windows)**
```bash
# Compress dulu di Windows
# Buka PowerShell di folder project
tar -czf bumdes.tar.gz --exclude=node_modules --exclude=.next --exclude=.git .

# Upload ke VPS
scp bumdes.tar.gz root@38.47.176.110:/var/www/bumdes/

# Di VPS, extract
cd /var/www/bumdes
tar -xzf bumdes.tar.gz
npm install
```

### 4.3 Setup environment variables
```bash
cd /var/www/bumdes
nano .env.production
```

Isi dengan:
```env
DATABASE_URL=postgresql://bumdes:password_aman_anda@localhost:5432/bumdes
NEXTAUTH_URL=https://netbill.matadewa.my.id
NEXTAUTH_SECRET=generate_random_string_32_characters_here
CRON_SECRET=generate_another_random_string_here
NODE_ENV=production
```

Generate secret dengan:
```bash
openssl rand -base64 32
```

---

## Langkah 5: Migrate Database

```bash
cd /var/www/bumdes
npm run db:push
# atau jika ada migration script:
# npm run db:migrate
```

### 5.1 Buat user admin (jalankan script)
```bash
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://bumdes:password_aman_anda@localhost:5432/bumdes'
});

async function createAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    ['Admin', 'admin@bumdes.id', hash, 'admin']
  );
  console.log('Admin user created!');
  await pool.end();
}

createAdmin();
"
```

---

## Langkah 6: Build Aplikasi

```bash
cd /var/www/bumdes
npm run build
```

---

## Langkah 7: Setup PM2

### 7.1 Buat file ecosystem
```bash
cd /var/www/bumdes
nano ecosystem.config.js
```

Isi dengan:
```javascript
module.exports = {
  apps: [{
    name: 'bumdes-billing',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/bumdes',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 7.2 Start aplikasi dengan PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Jalankan command yang diberikan oleh `pm2 startup`.

### 7.3 Monitoring
```bash
pm2 status
pm2 logs bumdes-billing
pm2 monit
```

---

## Langkah 8: Setup Nginx sebagai Reverse Proxy

### 8.1 Buat konfigurasi Nginx
```bash
nano /etc/nginx/sites-available/bumdes
```

Isi dengan:
```nginx
server {
    listen 80;
    server_name netbill.matadewa.my.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.2 Aktifkan konfigurasi
```bash
ln -s /etc/nginx/sites-available/bumdes /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Langkah 9: Setup SSL dengan Let's Encrypt

```bash
certbot --nginx -d netbill.matadewa.my.id
```

Ikuti instruksi:
- Masukkan email Anda
- Setuju terms of service
- Pilih redirect HTTP ke HTTPS (option 2)

Certbot akan otomatis:
- Generate SSL certificate
- Update konfigurasi Nginx
- Setup auto-renewal

### 9.1 Test auto-renewal
```bash
certbot renew --dry-run
```

---

## Langkah 10: Firewall (UFW)

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
ufw status
```

---

## Verifikasi Deployment

1. **Cek aplikasi berjalan**:
   ```bash
   pm2 status
   curl http://localhost:3000
   ```

2. **Cek Nginx**:
   ```bash
   systemctl status nginx
   curl http://netbill.matadewa.my.id
   ```

3. **Cek SSL**:
   ```bash
   curl https://netbill.matadewa.my.id
   ```

4. **Akses dari browser**:
   - Buka: https://netbill.matadewa.my.id
   - Login dengan: admin@bumdes.id / admin123

---

## Maintenance

### Update aplikasi
```bash
cd /var/www/bumdes
git pull  # atau upload file baru
npm install
npm run build
pm2 restart bumdes-billing
```

### Backup database
```bash
pg_dump -U bumdes bumdes > backup_$(date +%Y%m%d).sql
```

### Restore database
```bash
psql -U bumdes bumdes < backup_20260520.sql
```

### Monitoring logs
```bash
pm2 logs bumdes-billing
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Aplikasi tidak bisa diakses
```bash
pm2 status
pm2 logs bumdes-billing --lines 50
```

### Database connection error
```bash
sudo -u postgres psql -c "\l"
sudo -u postgres psql -c "\du"
```

### Nginx error
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### SSL certificate error
```bash
certbot certificates
certbot renew
```

---

## Security Checklist

- [ ] Ganti password PostgreSQL default
- [ ] Ganti NEXTAUTH_SECRET dengan random string
- [ ] Setup firewall (UFW)
- [ ] Disable root SSH login (edit /etc/ssh/sshd_config)
- [ ] Setup fail2ban untuk proteksi brute force
- [ ] Regular backup database
- [ ] Update sistem secara berkala

---

## Contact & Support

Jika ada masalah, cek:
1. PM2 logs: `pm2 logs bumdes-billing`
2. Nginx logs: `/var/log/nginx/error.log`
3. PostgreSQL logs: `/var/log/postgresql/postgresql-16-main.log`
