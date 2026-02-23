# 🖥️ NewsFlux Bare Metal Deployment: TrueNAS Home Server Analysis

**Hardware Target:** TrueNAS (Scale/Core)  
**CPU:** Intel Core i3-3210 (3rd Gen, 2 Cores / 4 Threads)  
**RAM:** 8 GB  
**Primary Storage:** 3x 500GB HDD (RAID Z1)  
**Secondary Storage:** 1x 250GB SSD  
**Networking:** Cloudflare Tunnel  

## 🟢 The Verdict: Can you run NewsFlux on this?
**YES.** This server is highly capable of running the NewsFlux MVP (handling 0 to ~10-15 localized agencies).

**FastAPI** is incredibly lightweight (a single worker uses around ~50MB RAM).
**A React PWA** is static; serving it takes virtually no CPU or memory.
The biggest resource hogs will be **ZFS itself** and **PostgreSQL**.

### ⚖️ Impact of Super Admin Add-ons (Phase 2)
The advanced enterprise features outlined in Phase 2 won't break this server, but require one specific consideration:
- **Logical Features (SaaS Billing, Templates, God Mode, Analytics):** These are simply extra database queries and FastAPI logic. The i3-3210 will handle these without breaking a sweat.
- **Live Telemetry & APM:** This is the only bottleneck. Self-hosting an APM stack (like Sentry, Datadog-agent, or Grafana) is incredibly RAM-heavy. With only 8GB total RAM (4GB locked by ZFS), you **cannot** safely self-host a full APM stack on this machine. You must use a *cloud-hosted* APM (like the hosted Sentry SaaS free tier) and just point your FastAPI container to it.

---

## 🏗️ Hardware Allocation Strategy (CRITICAL)

### 1. Storage Layout (The SSD is the MVP)
Your 3x 500GB HDDs in a RAID Z1 configuration will give you about 1TB of usable storage, but **Hard Drives have incredibly poor random I/O (IOPS)**. A database (like PostgreSQL) performs thousands of tiny random reads/writes. If you put PostgreSQL on the HDD pool, the application will feel sluggish and API responses will lag.

 **✅ Execution Plan:**
 - Use the **1x 250GB SSD** as a separate storage pool dedicated strictly to your TrueNAS Apps (Docker containers) and the **PostgreSQL database volumes**. Fast SSD IOPS are critical for a snappy database.
 - Use the **3x 500GB HDD RAID Z1** purely as a static file backup destination (e.g., configuring your daily automated Google Drive CSV exports or pg_dump `.sql.gz` files to land here first).

 ### 2. RAM Management (The 8GB Bottleneck)
TrueNAS uses the ZFS file system, which aggressively caches data in RAM (the ARC cache). By default, ZFS will consume up to 50% of your total RAM (4GB out of your 8GB), leaving only 4GB for the TrueNAS OS layer, Docker Engine, PostgreSQL, FastAPI, and Redis/Celery.

 **✅ Execution Plan:**
 - **Limit PostgreSQL Memory:** Set strict memory limits on your database container (e.g., `512MB` or `1GB` max limit in your Docker Compose).
- **Tune Postgres Config:** Modify the PostgreSQL `postgresql.conf` file to keep `shared_buffers` extremely low (e.g., `128MB`). Let the OS/ZFS manage the disk caching.
- Ensure the FastAPI container is strictly limited to prevent a memory leak from taking down your entire TrueNAS server.

### 3. CPU (i3-3210)
While this is an older 3rd Gen CPU (Ivy Bridge), it is absolutely fine for a B2B application where traffic isn't a chaotic spike of millions of users, but rather a slow, predictable trickle from workers logging their morning routes.

---

## 🌐 Networking Strategy: Cloudflare Tunnel
Using a **Cloudflare Tunnel (`cloudflared`)** instead of port-forwarding your home router is the best technical decision you can make for a self-hosted B2B application.

### Why it's perfect for NewsFlux:
1. **Zero Trust Security:** You expose **NO** open ports on your home router. The tunnel dials out from your TrueNAS server to Cloudflare.
2. **DDoS Protection:** Because traffic goes through Cloudflare's edge nodes natively, your little i3 processor won't get crippled by bot scanners randomly pinging IP addresses.
3. **Free HTTPS (SSL):** Cloudflare handles all the Let's Encrypt certificates automatically at the edge.
4. **Subdomain Routing:** The tunnel can natively route different domains to different Docker containers perfectly:
   - `admin.newsflux.in` -> Routes internally to React Admin Container (`localhost:3000`)
   - `worker.newsflux.in` -> Routes internally to React PWA Container (`localhost:3001`)
   - `api.newsflux.in` -> Routes internally to FastAPI backend (`localhost:8000`)
---
## 🚀 Summary Checklist for TrueNAS Deployment

1. **Storage Pool 1 (Fast):** Setup the 250GB SSD and install the `ix-applications` (Docker/K3s dataset) onto it.
2. **Storage Pool 2 (Slow):** Setup the 3x 500GB HDDs in RAID Z1 as an SMB network share / backup target.
3. **TrueNAS Apps vs Custom Docker Compose:**
   - If using TrueNAS Scale, you can use the "Custom App" to deploy your `docker-compose.yml`, allocating container memory caps easily.
   - Alternatively, spin up a lightweight Debian/Ubuntu VM (allocating exactly 2 CPU cores and 3GB of RAM), mount the SSD dataset via virtio, and run plain Docker Engine. (This is generally simpler than managing the TrueNAS Scale Kubernetes engine).
4. **Cloudflare Tunnel App:** Install the truecharts/official Cloudflare Tunnel app (or standalone docker container) and connect it to your Cloudflare dashboard using your tunnel token to route traffic freely to your apps.