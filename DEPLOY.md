# Putting the WaitLess backend on AWS EC2

This guide sets up the Django API on an Ubuntu server on AWS EC2, so the app
works without `runserver` on a laptop. It takes about an hour the first time.

When it's done, the setup looks like this:

```
phone app  ──http://YOUR_IP──▶  nginx (port 80)  ──▶  gunicorn (127.0.0.1:8000)  ──▶  Django + SQLite
```

- **nginx** answers on the normal web port (80) and passes each request to
  gunicorn. It also serves the admin site's CSS.
- **gunicorn** runs Django. A systemd service keeps it running and restarts it
  after a crash or a reboot.
- **SQLite** stays the database. The file lives on the server's disk, so data
  survives restarts.

Everywhere below, replace **`YOUR_IP`** with your server's Elastic IP (step 2),
for example `13.245.12.34`. Commands in grey boxes go in the **server's**
terminal unless they say "on your laptop".

> **Cost.** A small instance plus its public IP address costs roughly US$10–15 a
> month without free tier. New AWS accounts get free-tier credits that cover
> this for a while; check **Billing and Cost Management → Free Tier** for
> yours, and set a budget alert (step 13). A university AWS Academy lab account
> usually stops its instances when the lab session ends, so it won't stay up.

---

## 1. Launch the instance

In the AWS console, open **EC2 → Instances → Launch instances**.

1. **Region** (top right): **Africa (Cape Town)** is closest to South Africa.
   It's switched off on new accounts: to use it, open your account menu →
   **Account → AWS Regions**, enable Africa (Cape Town), and wait a few minutes.
   Otherwise pick **Europe (Ireland)**; it works the same, just a bit slower.
2. **Name:** `waitless-server`
3. **Application and OS image:** **Ubuntu Server 24.04 LTS**, 64-bit (x86).
4. **Instance type:** **t3.micro**, or whichever type the list marks
   **Free tier eligible**.
5. **Key pair:** **Create new key pair** → name `waitless-key`, type ED25519,
   format `.pem` → **Create**. Your browser downloads `waitless-key.pem`. Keep
   it safe: AWS can't give it to you again, and anyone with it can log in.
6. **Network settings:** keep **Create security group**, then
   - **Allow SSH traffic from:** **My IP**
   - tick **Allow HTTP traffic from the internet**
7. **Storage:** the default 8 GiB is enough.
8. **Launch instance.**

Don't open port 8000. Only nginx (port 80) should face the internet.

## 2. Give it a fixed address (Elastic IP)

A normal public IP changes every time the instance is stopped and started, and
the address is built into the APK. An Elastic IP never changes.

1. **EC2 → Network & Security → Elastic IPs → Allocate Elastic IP address →
   Allocate.**
2. Select the new address → **Actions → Associate Elastic IP address** →
   choose `waitless-server` → **Associate**.

This address is **`YOUR_IP`** from now on.

## 3. Connect to the server

On your laptop, in PowerShell:

```powershell
ssh -i "$HOME\Downloads\waitless-key.pem" ubuntu@YOUR_IP
```

Type `yes` when it asks about the fingerprint. The prompt changes to
`ubuntu@ip-…:~$`: you're on the server. If it says "Connection timed out" right
after launching, wait a minute for the instance to finish starting.

## 4. Install the system packages

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx git
```

If a purple "Daemons using outdated libraries" screen appears, press Enter.

## 5. Put the code on the server

The code goes in `/home/ubuntu/waitless`, with the backend in
`/home/ubuntu/waitless/backend`. The service files in step 9 and 10 expect
exactly that.

**Option A, from GitHub** (if your latest code is pushed):

```bash
git clone https://github.com/OWNER/REPO.git ~/waitless
```

For a private repository, GitHub asks for your username and a personal access
token (GitHub → Settings → Developer settings → Personal access tokens) instead
of your password.

**Option B, from your laptop** (exactly what's on your laptop, pushed or not).
On your laptop, in PowerShell, in the project folder (the one that contains
`backend` and `requirements_backend.txt`):

```powershell
tar -czf waitless.tgz --exclude=venv --exclude=.venv --exclude=env --exclude=__pycache__ --exclude=db.sqlite3 --exclude=migrations --exclude=staticfiles --exclude=.env --exclude=settings.py backend requirements_backend.txt
scp -i "$HOME\Downloads\waitless-key.pem" waitless.tgz ubuntu@YOUR_IP:~
```

Then on the server:

```bash
mkdir -p ~/waitless && tar -xzf ~/waitless.tgz -C ~/waitless
```

The archive leaves out your laptop's virtual environment, database, migrations,
`settings.py` and `.env`: the server makes its own.

## 6. Create the Python environment

```bash
python3 -m venv ~/venv
source ~/venv/bin/activate
cd ~/waitless/backend
pip install -r requirements-server.txt
```

`(venv)` at the start of the prompt means the environment is on. After you
reconnect, run `source ~/venv/bin/activate` again before any `python manage.py`
command.

## 7. Settings and secrets

`settings.py` is the same file you use on your laptop. What's different on the
server goes in `backend/.env`, which never goes into git.

```bash
cd ~/waitless/backend
cp backend/settings.example.py backend/settings.py
IP=YOUR_IP
cat > .env <<EOF
DJANGO_DEBUG=0
DJANGO_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
DJANGO_ALLOWED_HOSTS=$IP,localhost,127.0.0.1
EOF
chmod 600 .env
cat .env
```

`cat .env` should show your IP and a long random key.

- `DJANGO_DEBUG=0` hides error details and code from visitors.
- `DJANGO_ALLOWED_HOSTS` lists the addresses Django answers to. Anything else
  gets "400 Bad Request".

## 8. Database, admin files and accounts

```bash
python manage.py makemigrations accounts appointments appointment_backend
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_test_data
```

- `seed_test_data` creates the test accounts (patient@test.com and the rest,
  see TESTING.md) and some open slots. Their passwords are written in our
  documents, so change or delete these accounts if the server stays up after
  the showcase.
- Only if you use the Django admin at `/admin/`:
  `python manage.py createsuperuser`.
- Optional check: `python manage.py test` should end with "OK" here too
  (about two minutes).

## 9. Keep the API running (gunicorn)

```bash
sudo cp deploy/waitless.service /etc/systemd/system/waitless.service
sudo systemctl daemon-reload
sudo systemctl enable --now waitless
systemctl status waitless --no-pager
curl http://127.0.0.1:8000/account/hello/
```

The status should say **active (running)** in green, and `curl` should print
`{"message":"Hello World"}`.

## 10. Put nginx in front

```bash
sudo cp deploy/nginx-waitless.conf /etc/nginx/sites-available/waitless
sudo ln -sf /etc/nginx/sites-available/waitless /etc/nginx/sites-enabled/waitless
sudo rm -f /etc/nginx/sites-enabled/default
sudo chmod o+x /home/ubuntu
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` should say "syntax is ok" and "test is successful". The `chmod`
lets nginx reach the admin CSS inside your home folder; Ubuntu blocks other
users from it by default.

## 11. Check it from your phone

On your phone's browser, mobile data or any Wi-Fi, open:

```
http://YOUR_IP/account/hello/
```

You should see `{"message":"Hello World"}`. Your laptop can be switched off now.

## 12. Point the app at the server

The app no longer needs `:8000`, because nginx answers on the normal port.

1. **APK:** in `frontend/eas.json`, set the preview profile's
   `"EXPO_PUBLIC_API_URL": "http://YOUR_IP"`, then build once more:
   `eas build -p android --profile preview`. Install the new APK on each device
   (it installs as an update). Because the Elastic IP never changes, this is
   the last rebuild needed for the address.
2. **Expo Go** (optional): in `frontend/.env`, set
   `EXPO_PUBLIC_API_URL=http://YOUR_IP` and restart with `npx expo start -c`.
   Remove the line to go back to the backend on your laptop.
3. **Every other build** (optional): set `DEPLOYED_API_URL` in
   `frontend/src/shared/apiUrl.ts` to `"http://YOUR_IP"`. A build without
   `EXPO_PUBLIC_API_URL` then uses your server instead of `13.246.11.197`.

Keep `usesCleartextTraffic` in `app.json`: the server uses plain `http://`.

## 13. Set a budget alert

**Billing and Cost Management → Budgets → Create budget → Use a template →
Monthly cost budget**, amount US$5, your email → **Create budget**. AWS emails
you before spending gets near it.

---

## Updating the server after code changes

Connect (step 3), then get the new code with the option you used in step 5.

Option A: `cd ~/waitless && git pull`

Option B: make and copy `waitless.tgz` again from your laptop (step 5), then
`tar -xzf ~/waitless.tgz -C ~/waitless` on the server. Your `.env`, database
and migrations stay, because the archive leaves them out.

Then:

```bash
source ~/venv/bin/activate
cd ~/waitless/backend
cp backend/settings.example.py backend/settings.py
pip install -r requirements-server.txt
python manage.py makemigrations accounts appointments appointment_backend
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart waitless
```

## Logs

```bash
sudo journalctl -u waitless -n 50 --no-pager     # Django and gunicorn
sudo journalctl -u waitless -f                    # live; Ctrl+C to stop
sudo tail -n 20 /var/log/nginx/error.log
```

## Troubleshooting

| What you see | What to do |
| --- | --- |
| The browser keeps loading, then times out | The security group must allow **HTTP (80) from 0.0.0.0/0**: EC2 → the instance → Security → the security group → Edit inbound rules. Also check the instance is running. |
| **502 Bad Gateway** | gunicorn isn't running. `systemctl status waitless --no-pager`, then read the log. Often a typo in `.env` or a missing `pip install`. |
| **400 Bad Request** | The address you used isn't in `DJANGO_ALLOWED_HOSTS`. Fix `.env`, then `sudo systemctl restart waitless`. |
| **413 Request Entity Too Large** on a photo | `client_max_body_size` is missing from the nginx file. Repeat step 10. |
| The admin site has no styling | Run `collectstatic` and the `chmod` in step 10. |
| "no such table" in the log | Run `makemigrations` and `migrate` (step 8), then restart. |
| `ssh` times out | You're on a different network than when you set **My IP**. Edit the security group's SSH rule and choose **My IP** again. |
| `Permission denied (publickey)` | The user must be `ubuntu`, and the key must be `waitless-key.pem`. |
| `UNPROTECTED PRIVATE KEY FILE` on Windows | In PowerShell: `icacls "$HOME\Downloads\waitless-key.pem" /inheritance:r` then `icacls "$HOME\Downloads\waitless-key.pem" /grant:r "$($env:USERNAME):(R)"` |

## Turning it off

- **Stop** the instance (Instance state → Stop) to pause it. The Elastic IP and
  the disk still cost a little while it's stopped, and the app can't reach it.
- When the project is over: **Terminate** the instance, then **EC2 → Elastic
  IPs → Release** the address. An Elastic IP that's kept keeps costing money.

## Security notes

- Plain `http://` isn't encrypted: passwords and appointment details cross the
  network as readable text. That's acceptable for a student demo with test
  data, not for real patients. Real use needs HTTPS: a domain name pointed at
  `YOUR_IP`, a free Let's Encrypt certificate (`sudo apt install certbot
  python3-certbot-nginx`, then `sudo certbot --nginx -d your.domain`), and
  `https://` in the app.
- Keep `waitless-key.pem` and `backend/.env` private, and never commit them.
- `DEBUG` is off on the server, and port 8000 is only reachable from the
  server itself.
