# Deployment Guide

## Happy Little Learners - Production Deployment

---

## 1. Prerequisites

### 1.1 System Requirements

**Minimum Production Server**:
- CPU: 4 vCPUs
- RAM: 8 GB
- Storage: 100 GB SSD
- OS: Ubuntu 22.04 LTS or Amazon Linux 2

**Recommended Production Server**:
- CPU: 8 vCPUs
- RAM: 16 GB
- Storage: 200 GB SSD
- OS: Ubuntu 22.04 LTS

### 1.2 External Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| MySQL 8.x | Primary database | Managed (RDS/CloudSQL) or self-hosted |
| Redis 7 | Caching, sessions | Managed (ElastiCache) or self-hosted |
| S3/MinIO | Media storage | S3-compatible bucket |
| SMTP | Email delivery | SES, SendGrid, or self-hosted |
| CDN | Static assets | Cloudflare, CloudFront |
| DNS | Domain management | Route53, Cloudflare |

---

## 2. Environment Configuration

### 2.1 Required Environment Variables

Create `.env` file in project root:

```bash
# Application
APP_NAME="Happy Little Learners"
APP_ENV=production
DEBUG=false
FRONTEND_URL=https://happylittlelearners.in
BACKEND_URL=https://api.happylittlelearners.in
SECRET_KEY=your-64-char-random-string-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database (MySQL)
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=happy_little_learners
DB_USER=hll_user
DB_PASSWORD=secure-db-password
DB_CHARSET=utf8mb4

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password

# CORS
CORS_ORIGINS=["https://happylittlelearners.in","https://www.happylittlelearners.in"]

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@happylittlelearners.in
SMTP_PASSWORD=smtp-password
SMTP_FROM_EMAIL=noreply@happylittlelearners.in
SMTP_FROM_NAME="Happy Little Learners"
EMAIL_VERIFICATION_ENABLED=true

# SMS (Optional - Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
OTP_ENABLED=false

# File Storage (S3)
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=hll-media
AWS_S3_REGION=ap-south-1
MAX_FILE_SIZE_MB=10

# Rate Limiting
RATE_LIMIT_LOGIN_ATTEMPTS=5
RATE_LIMIT_LOGIN_WINDOW_MINUTES=15
RATE_LIMIT_API_REQUESTS=200
RATE_LIMIT_API_WINDOW_MINUTES=1

# Frontend
VITE_API_URL=https://api.happylittlelearners.in/api/v1
VITE_APP_NAME="Happy Little Learners"
```

### 2.2 Generate Secure Secrets

```bash
# Generate SECRET_KEY (64 chars)
openssl rand -hex 32

# Generate DB password
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 24
```

---

## 3. Docker Deployment

### 3.1 Development

```bash
# Clone repository
git clone https://github.com/yourorg/happy-little-learners.git
cd happy-little-learners

# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Seed initial data
docker-compose exec backend python -m app.scripts.seed_data

# Create admin user
docker-compose exec backend python -m app.scripts.create_admin
```

### 3.2 Production

```bash
# Clone repository
git clone https://github.com/yourorg/happy-little-learners.git
cd happy-little-learners

# Configure production environment
cp .env.example .env
# Edit .env with production values (CRITICAL: set secure passwords!)

# Build and start production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed initial data (first deployment only)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python -m app.scripts.seed_data

# Create admin user
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python -m app.scripts.create_admin
```

### 3.3 Production Docker Commands

```bash
# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f nginx

# Restart services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart backend

# Scale backend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=3

# Backup database
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec mysql \
  mysqldump -u root -p${DB_PASSWORD} ${DB_NAME} > backup_$(date +%Y%m%d).sql

# Update application
git pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 4. Manual Deployment (Without Docker)

### 4.1 Backend Setup

```bash
# System dependencies (Ubuntu)
sudo apt-get update && sudo apt-get install -y \
    python3.11 python3.11-venv python3.11-dev \
    libmariadb-dev pkg-config \
    nginx redis-server

# Create virtual environment
cd backend
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with production values

# Run migrations
alembic upgrade head

# Seed data
python -m app.scripts.seed_data

# Create admin
python -m app.scripts.create_admin

# Test run
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Production: Run with Gunicorn
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
```

### 4.2 Frontend Setup

```bash
cd frontend

# Install dependencies
npm ci

# Configure environment
cp ../.env.example .env
# Edit .env (VITE_API_URL)

# Build for production
npm run build

# Serve with nginx (see nginx config below)
```

### 4.3 Nginx Configuration

**Backend proxy** (`/etc/nginx/sites-available/hll-api`):
```nginx
server {
    listen 80;
    server_name api.happylittlelearners.in;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

**Frontend** (`/etc/nginx/sites-available/hll-frontend`):
```nginx
server {
    listen 80;
    server_name happylittlelearners.in www.happylittlelearners.in;
    root /var/www/happy-little-learners;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable sites:
```bash
sudo ln -s /etc/nginx/sites-available/hll-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/hll-frontend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4.4 SSL/TLS with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.happylittlelearners.in -d happylittlelearners.in -d www.happylittlelearners.in

# Auto-renewal
sudo certbot renew --dry-run
```

### 4.5 Systemd Services

**Backend** (`/etc/systemd/system/hll-backend.service`):
```ini
[Unit]
Description=Happy Little Learners Backend
After=network.target mysql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/happy-little-learners/backend
Environment=PATH=/opt/happy-little-learners/backend/venv/bin
ExecStart=/opt/happy-little-learners/backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable hll-backend
sudo systemctl start hll-backend
sudo systemctl status hll-backend
```

---

## 5. Database Setup

### 5.1 MySQL Configuration

```sql
-- Create database and user
CREATE DATABASE happy_little_learners 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

CREATE USER 'hll_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON happy_little_learners.* TO 'hll_user'@'%';
FLUSH PRIVILEGES;

-- Recommended settings (my.cnf)
[mysqld]
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT
max_connections = 200
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

### 5.2 Run Migrations

```bash
cd backend
alembic upgrade head
```

### 5.3 Verify Setup

```bash
# Check tables
mysql -u hll_user -p happy_little_learners -e "SHOW TABLES;"

# Check seed data
mysql -u hll_user -p happy_little_learners -e "SELECT code, name FROM learning_stages;"
```

---

## 6. Monitoring & Maintenance

### 6.1 Health Checks

```bash
# API health
curl https://api.happylittlelearners.in/api/v1/health

# Database health
curl https://api.happylittlelearners.in/api/v1/health/db

# Readiness
curl https://api.happylittlelearners.in/api/v1/health/ready
```

### 6.2 Log Management

```bash
# Application logs (Docker)
docker-compose logs -f backend --tail=100

# Application logs (systemd)
journalctl -u hll-backend -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MySQL slow query log
tail -f /var/log/mysql/slow.log
```

### 6.3 Backup Strategy

```bash
#!/bin/bash
# backup.sh - Run daily via cron

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="happy_little_learners"

# Database backup
mysqldump -u hll_user -p${DB_PASSWORD} \
    --single-transaction \
    --routines \
    --triggers \
    ${DB_NAME} | gzip > ${BACKUP_DIR}/db_${DATE}.sql.gz

# Media backup (if local storage)
tar -czf ${BACKUP_DIR}/media_${DATE}.tar.gz /app/uploads

# Keep last 30 days
find ${BACKUP_DIR} -name "*.gz" -mtime +30 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 sync ${BACKUP_DIR} s3://your-backup-bucket/hll/
```

Schedule:
```bash
# Crontab
0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### 6.4 Restore Procedure

```bash
# Restore database
gunzip -c backup_20240115_020000.sql.gz | mysql -u hll_user -p happy_little_learners

# Restore media
tar -xzf media_20240115_020000.tar.gz -C /app/uploads
```

---

## 7. Scaling Considerations

### 7.1 Horizontal Scaling

**Backend**:
- Stateless design allows multiple replicas
- Session stored in Redis (shared)
- Load balancer distributes traffic

**Frontend**:
- Static files served via CDN
- Multiple nginx instances behind load balancer

**Database**:
- Read replicas for read-heavy queries
- Connection pooling (PgBouncer equivalent for MySQL)

### 7.2 Caching Strategy

```python
# Redis caching for:
# - User sessions
- API response caching (TTL: 5 min)
- Curriculum content (TTL: 1 hour)
- Analytics aggregates (TTL: 15 min)
```

### 7.3 CDN Configuration

- Static assets: 1 year cache
- API responses: No cache (or short TTL)
- Media files: 1 year cache with versioning

---

## 8. Disaster Recovery

### 8.1 RTO/RPO Targets

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 1 hour |

### 8.2 Recovery Procedures

1. **Database Failure**: Restore from latest backup + binary logs
2. **Application Failure**: Redeploy from Docker images
3. **Data Center Failure**: Failover to secondary region
4. **Data Corruption**: Point-in-time recovery

---

## 9. Security Hardening

### 9.1 Server Hardening

```bash
# Disable root SSH
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Fail2ban
apt-get install fail2ban
systemctl enable fail2ban

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Automatic updates
apt-get install unattended-upgrades
```

### 9.2 Application Security

- Rotate SECRET_KEY quarterly
- Rotate DB passwords quarterly
- Monitor failed login attempts
- Regular security scans

---

## 10. Rollback Procedures

```bash
# Quick rollback (Docker)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
git checkout previous-stable-tag
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Database rollback (if migration issue)
alembic downgrade -1

# Full rollback (database + code)
gunzip -c backup_20240115.sql.gz | mysql -u hll_user -p happy_little_learners
git checkout previous-stable-tag
docker-compose up -d --build
```

---

## 11. Checklist for Production Launch

- [ ] All environment variables configured
- [ ] SSL certificates installed and auto-renewal tested
- [ ] Database backups configured and tested
- [ ] Monitoring alerts configured
- [ ] Log aggregation working
- [ ] Rate limiting tested
- [ ] CSRF protection verified
- [ ] CORS origins configured
- [ ] Email/SMS delivery tested
- [ ] Media upload/download tested
- [ ] Admin user created
- [ ] Smoke tests pass
- [ ] Load test completed
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Runbook distributed to team

---

*Document Version: 1.0*
*Last Updated: 2026-10-09*