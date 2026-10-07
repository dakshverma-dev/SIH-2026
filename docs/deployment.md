# Split deployment

Frontend runs on Vercel. Backend runs on EC2.

## Frontend: Vercel

Set these Vercel environment variables:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
VITE_BACKEND_URL=https://<backend-domain>
```

Use the default Vercel command from `vercel.json`:

```bash
npm ci
npm run build
```

`VITE_BACKEND_URL` is read by the settings page and should point at the EC2 API origin, not at `/api` on Vercel.

## Backend: EC2

Copy the repository to EC2, then run:

```bash
cd ~/sih-seeker
bash backend/scripts/bootstrap_ec2.sh
```

Edit `backend/.env` before exposing the service:

```env
DATABASE_URL=sqlite:///./plan2reality.db
NVIDIA_API_KEY=nvapi-...
JWT_SECRET=<long-random-secret>
CORS_ORIGINS=https://<your-vercel-app>.vercel.app
ONTOLOGY_XLSX=../data/ontology.xlsx
```

The default database is SQLite in `backend/plan2reality.db`, so the deploy does not touch system Postgres or other database services. Override `DATABASE_URL` if you want managed Postgres later.

Run manually:

```bash
cd ~/sih-seeker/backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8107
```

Systemd template:

```bash
sudo cp backend/deploy/plan2reality-backend.service.example /etc/systemd/system/plan2reality-backend.service
sudo sed -i "s#/home/ubuntu/sih-seeker#$(pwd)#g" /etc/systemd/system/plan2reality-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now plan2reality-backend
```

Health check:

```bash
curl http://127.0.0.1:8107/api/v1/health
```

Expose with your reverse proxy, load balancer or Cloudflare Tunnel to the local target:

```txt
http://127.0.0.1:8107
```

Do not expose the service before setting `JWT_SECRET`, `NVIDIA_API_KEY` and `CORS_ORIGINS`.
