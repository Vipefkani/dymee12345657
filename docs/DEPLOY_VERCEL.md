# Deploying Dymee with Vercel

The project is Django/ASGI. Vercel detects the Django app from `manage.py` and collects static assets during its build. No local SQLite database or uploaded media is included in deployments.

## Required services

- **Vercel** for the Django HTTP app and static assets.
- **Neon PostgreSQL** for persistent application data.
- **Redis** for the shared Django Channels layer.
- **A persistent ASGI host** for reliable call WebSockets. Deploy this same Django project there, using the same database, Redis, and `DJANGO_SECRET_KEY`.
- **A private Vercel Blob store** for uploads. Dymee uses its client-upload flow to avoid Vercel Function's 4.5 MB request-body limit and serves private media through authenticated Django routes.

## Configure Vercel environment variables

Add these variables to the Vercel project for every environment you will use. Use exact hostnames/origins instead of a wildcard:

| Variable | Value |
| --- | --- |
| `DJANGO_SECRET_KEY` | A newly generated, private Django secret. Do not reuse the development fallback. |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string with SSL enabled. |
| `REDIS_URL` | TLS Redis connection URL from the selected Redis provider. |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated exact Vercel and custom-domain hostnames, plus the calls host if separate (no scheme). |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Comma-separated exact HTTPS origins, for example `https://dymee.example.com`. |
| `DJANGO_DEBUG` | `False`. |
| `BLOB_READ_WRITE_TOKEN` | Read/write token for the private Vercel Blob store. |
| `BLOB_STORE_ID` | ID of that Blob store. |
| `BLOB_UPLOAD_SIGNING_SECRET` | A new random secret shared by Django and the Vercel Node upload function. |
| `BLOB_APP_ORIGIN` | Exact HTTPS origin of the Dymee Vercel deployment, used to verify completed uploads. |

For a separate calls host, also configure:

| Variable | Value |
| --- | --- |
| `CALLS_WEBSOCKET_URL` | Full secure URL, for example `wss://calls.example.com/ws/calls/`. |
| `DJANGO_SESSION_COOKIE_DOMAIN` | Shared custom-domain suffix, for example `.example.com`. |

Create the Blob store with **Private** access and connect it to Vercel. Set its read/write token and store ID on both Vercel and the ASGI host. Use a fresh `BLOB_UPLOAD_SIGNING_SECRET` and configure the same value on both services. The web app and calls host must use HTTPS and share a parent domain for the browser to send the Django session cookie to the calls host. Configure the same `DJANGO_SESSION_COOKIE_DOMAIN`, `DJANGO_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, and Blob settings on the ASGI host. Include both hosts in its `DJANGO_ALLOWED_HOSTS`. Vercel deployments require the database, Redis, and Blob variables; the local SQLite and in-memory Redis-layer fallbacks are development-only.

On the ASGI host, also set `DJANGO_ENVIRONMENT=production` so Django requires production secrets, database, Redis, Blob, and exact host/origin allowlists.

Generate a secret locally without putting it in source control:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Deploy and initialize the database

1. Import the project into Vercel and add the environment variables above. `vercel.json` builds the Vercel Blob browser client and collects static assets.
2. Deploy the project. Vercel detects Django from `manage.py`; `config.asgi.application` handles Django's HTTP and WebSocket routing.
3. Configure the same Django project on the ASGI host, then set `CALLS_WEBSOCKET_URL` in Vercel to that host's `/ws/calls/` endpoint. A typical ASGI start command is `daphne -b 0.0.0.0 -p $PORT config.asgi:application`.
4. Run `python manage.py migrate` once against the production `DATABASE_URL` before opening the site to users. Use a protected local environment or the ASGI host's one-off command; do not put production credentials in a committed file.
5. Configure a custom HTTPS domain and shared cookie domain, then verify registration, login, static assets, database persistence, post/media uploads above 4.5 MB, private chat attachment access from both participants, rejection for a third account, and incoming-call signaling from two signed-in users.

Vercel Blob uploads require the generated static client module and the Node function in `api/blob-upload.js`. The browser receives a short-lived, signed, path-scoped upload authorization; the Blob store remains private. Django verifies each completed file and serves it only after checking the relevant profile/post/story owner or chat participants.

References: [Vercel Django](https://vercel.com/docs/frameworks/backend/django), [Blob private storage](https://vercel.com/docs/vercel-blob/private-storage), [Blob client uploads](https://vercel.com/docs/vercel-blob/client-upload), and [Function limitations](https://vercel.com/docs/functions/limitations).
