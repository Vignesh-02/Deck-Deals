# Deploy Deck Deals on AWS EC2 with deckdeals.in (minimal cost)

Host the app on a single **EC2 t2.micro** (free tier for 12 months, then ~\$8–10/month). Use your domain **deckdeals.in** from Hostinger and free SSL (Let's Encrypt).

---

## 1. Prerequisites

- You need an AWS account
- Domain **deckdeals.in** on Hostinger (you have this)
- MongoDB (e.g. Atlas free tier) and Redis (e.g. Redis Cloud free tier) – keep using your current URLs
- Git repo of this code (e.g. GitHub)

---

## 2. Launch EC2 (minimal cost)

1. In **AWS Console** → **EC2** → **Launch Instance**.
2. **Name:** `deckdeals` (or any).
3. **AMI:** Ubuntu Server 24.04 LTS or 22.04 LTS (both work; 24.04 is fine).
4. **Instance type:** **t2.micro** (1 vCPU, 1 GB RAM – free tier eligible).
5. **Key pair:** Create or select an existing one; download the `.pem` and keep it safe.
6. **Network / Security group:** Create or edit:
   - **SSH (22)** – your IP only (or 0.0.0.0/0 only if you accept the risk).
   - **HTTP (80)** – 0.0.0.0/0.
   - **HTTPS (443)** – 0.0.0.0/0.
7. **Storage:** 8 GB default is enough.
8. Launch and note the **public IP** (e.g. `3.110.xxx.xxx`).

---

## 3. Point deckdeals.in to EC2 (Hostinger DNS)

1. Log in to **Hostinger** → **Domains** → **deckdeals.in** → **DNS / Nameservers** (or **Manage DNS**).
2. Add/Edit **A** record:
   - **Type:** A  
   - **Name:** `@` (for root: deckdeals.in) and optionally `www` if you want www.deckdeals.in  
   - **Value / Points to:** your EC2 **public IP**  
   - **TTL:** 300 or default  
3. Save. Propagation can take 5–30 minutes.

(Optional) For **www.deckdeals.in**: add another A record with Name `www` and same IP, or a CNAME `www` → `deckdeals.in`.)

---

## 4. Connect to EC2 and install stack

Replace `YOUR_KEY.pem` and `YOUR_EC2_IP` with your key path and EC2 public IP.

```bash
chmod 400 YOUR_KEY.pem
ssh -i YOUR_KEY.pem ubuntu@YOUR_EC2_IP
```

On the server (Ubuntu):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Node 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 (keep app running)
sudo npm install -g pm2

# (Optional) Nginx – for reverse proxy and SSL with Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

You will **not** install Redis or MongoDB on EC2 if you use Atlas + Redis Cloud (recommended for minimal cost).

---

## 5. Clone app and set env

```bash
# Clone (use your repo URL; or upload code via scp/rsync)
git clone https://github.com/YOUR_USERNAME/deck-deals.git
cd deck-deals

# Install dependencies
npm ci --omit=dev

# Create .env (use your real values)
sudo nano .env
```

**.env** (example – replace with your real values):

```env
NODE_ENV=production
PORT=4001

MONGODB_URL=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/magic?retryWrites=true
REDIS_URL=rediss://default:xxxx@redis-xxxxx.redis.cloud.com:12345
SESSION_SECRET=use-a-long-random-string-here

LOG_LEVEL=info
```

Save (Ctrl+O, Enter, Ctrl+X).

---

## 6. Run app with PM2

```bash
# Start (using ecosystem file for a clean setup)
pm2 start ecosystem.config.cjs

# Or start directly:
# pm2 start app.js --name deckdeals

# Auto-start on reboot
pm2 startup
# Run the command it prints (sudo ...)
pm2 save

# Logs
pm2 logs deckdeals
pm2 status
```

App is now running on **port 4001** (or whatever `PORT` you set). Next: expose it on 80/443 and add SSL.

---

## 7. Nginx + SSL (HTTPS for deckdeals.in)

Use Nginx as reverse proxy and Certbot for free SSL.

**7.1 – Nginx config**

```bash
sudo nano /etc/nginx/sites-available/deckdeals
```

Paste (replace `deckdeals.in` with your domain if different):

```nginx
server {
    listen 80;
    server_name deckdeals.in www.deckdeals.in;
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/deckdeals /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**7.2 – Get SSL certificate (Let's Encrypt)**

```bash
sudo certbot --nginx -d deckdeals.in -d www.deckdeals.in
```

Follow prompts (email, agree). Certbot will configure HTTPS and redirect HTTP → HTTPS.

**7.3 – Auto-renew SSL**

```bash
sudo certbot renew --dry-run
```

(Cron is usually added by Certbot.)

Your app will be served at **https://deckdeals.in** with a valid certificate.

---

## 8. Cost summary (minimal)

| Item            | Cost |
|-----------------|------|
| EC2 t2.micro    | Free (12 months) then ~\$8–10/month |
| Domain (Hostinger) | Already paid |
| MongoDB Atlas   | Free tier |
| Redis Cloud     | Free tier |
| SSL (Certbot)   | Free |
| **Total**       | **\$0** in year 1 (if within free tier), then ~\$8–10/month for EC2 |

---

## 9. Useful commands

```bash
# SSH
ssh -i YOUR_KEY.pem ubuntu@YOUR_EC2_IP

# App
pm2 restart deckdeals
pm2 logs deckdeals --lines 100

# Nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## 10. After code changes

```bash
cd /home/ubuntu/Deck-Deals
git pull
npm ci --omit=dev
pm2 restart deckdeals
```

---

## 11. Auto-deploy with GitHub Actions

A workflow (`.github/workflows/deploy-ec2.yml`) runs on every **push to `main`**: it SSHs into EC2, pulls the repo, runs `npm ci --omit=dev`, and restarts PM2.

### 11.1 – GitHub Secrets

In your GitHub repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add:

| Secret        | Value |
|---------------|--------|
| **EC2_HOST**  | EC2 public IP |
| **EC2_SSH_KEY** | **Full contents** of your `.pem` file (copy-paste the entire file, including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`) |
| **EC2_USER**  | (optional) SSH user; default is `ubuntu` |

### 11.2 – Repo path and branch

The workflow assumes the app on EC2 is in **`/home/ubuntu/Deck-Deals`** and pulls **`main`**. If your branch is `master`, edit `.github/workflows/deploy-ec2.yml` and change `branches: [main]` and `git pull origin main` to `master`.

### 11.3 – Private repo: deploy key on EC2

For a **private** repo, EC2 must be able to `git pull` without a password:

1. **On EC2** (SSH in), generate a deploy key (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "ec2-deploy" -f ~/.ssh/deploy_key -N ""
   cat ~/.ssh/deploy_key.pub
   ```
2. In **GitHub** → repo → **Settings** → **Deploy keys** → **Add deploy key**: paste the **public** key, allow read access.
3. On EC2, use that key for this repo:
   ```bash
   cd /home/ubuntu/Deck-Deals
   git remote set-url origin git@github.com:YOUR_USERNAME/deck-deals.git
   eval $(ssh-agent)
   ssh-add ~/.ssh/deploy_key
   # Test: git pull
   ```
4. So the key is used for git on EC2, add to `~/.ssh/config` on EC2:
   ```text
   Host github.com
     HostName github.com
     User git
     IdentityFile ~/.ssh/deploy_key
     IdentitiesOnly yes
   ```
   Then `git pull` from `/home/ubuntu/Deck-Deals` will use the deploy key.

For a **public** repo, no deploy key is needed; the workflow's SSH step only needs **EC2_HOST** and **EC2_SSH_KEY** (and optionally **EC2_USER**).

---

## 12. Stopping the instance to save costs

EC2 instances cannot "sleep," but you can **stop** the instance when you don't need the site. While stopped you are **not** charged for compute (instance hours). You **are** still charged for the EBS volume (disk) and, depending on region/setup, possibly for an Elastic IP if it's not attached to a running instance.

**Stop / Start**

- **Console:** EC2 → Instances → select instance → **Instance state** → **Stop instance** (or **Start instance**).
- **CLI:** `aws ec2 stop-instances --instance-ids i-xxxxxxxxx` and `aws ec2 start-instances --instance-ids i-xxxxxxxxx`.

**Important:** Stop/start usually gives the instance a **new public IP**. If you don't use an **Elastic IP** attached to this instance, update your domain's A record (e.g. deckdeals.in at Hostinger) to the new public IP after each start. If you use an Elastic IP and keep it attached, the same IP is used after start and no DNS change is needed.


---


You’re done: the site is hosted on EC2, domain **deckdeals.in** points to it, HTTPS is handled by Nginx + Let's Encrypt, and pushes to `main` auto-deploy via GitHub Actions.
