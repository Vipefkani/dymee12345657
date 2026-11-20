# Dymee

Dymee is a responsive Django starter for a photo/video-sharing community. It uses Django sessions and the built-in user model, SQLite for local development, and local media files for development uploads.

## Run locally

Requires Python 3.12 or newer.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open `http://127.0.0.1:8000/`. Sign up with an email, username, and password. Sign in with either the username or email address. Django admin is available at `/admin/`.

## Included MVP

- Email/username and password signup/sign-in, profile editing, avatar, bio, and live follower/following counts.
- Follow/unfollow, a followed-user home feed with progressive infinite loading, Explore search, hashtag text search, and profile grids.
- Photo/video posts, location and caption, basic display filters, likes, nested comments/replies, and stories that expire after 24 hours.
- A video Reels feed, one-to-one text messages, and an activity inbox for likes, comments, and follows.
- Chat file attachments (images, video, PDF, UTF-8 text, and Office documents; up to 20 MB), an emoji picker, and a private collection of user-uploaded Bitmoji-style stickers.
- Live in-page updates for likes, comments/replies, follows, new feed posts, and messages (using short polling for new feed and chat content).
- Account settings for updating username/email, editing profile details, changing the password, managing blocked users, and signing out.
- A persistent desktop navigation sidebar (with a compact icon rail on tablet widths), while mobile retains its bottom navigation; chat supports one-to-one audio/video calls using browser WebRTC with in-app incoming-call ringing and answer/decline controls.
- User/post reports, block/unblock management, configurable blocked-term checks, Django CSRF protection, authenticated write actions, upload size/type checks, and relational uniqueness constraints.
- Responsive light/dark styling and bottom navigation on narrow screens.

## Configuration and production safety

Set `DJANGO_SECRET_KEY` to a unique secret, `DJANGO_DEBUG=False`, and `DJANGO_ALLOWED_HOSTS` to the deployment hostnames before deploying. `SOCIAL_BLOCKED_TERMS` accepts a comma-separated list of terms for the basic text moderation check (for example, `term-a,term-b`). This is not a substitute for human review or a dedicated moderation service; reports are available in Django admin.

`DEBUG` is off by default. WhiteNoise serves compressed static assets; run `python manage.py collectstatic --noinput` after changing static files. Local media URLs are served by default outside production; set `DJANGO_SERVE_MEDIA=False` to disable them. Local uploads are stored under `media/`. For Vercel, the configured private Blob store handles uploads; the browser transfers files directly to Blob, and Django serves media through authenticated URLs (including participant checks for chat files). Chat attachments are limited by extension, file signatures, and a 20 MB cap; sticker images are limited to supported image formats and 3 MB. The custom stickers are user uploads, not an integration with Snap's Bitmoji service. Validate media with a dedicated scanning/transcoding service, and set HTTPS, secure cookie flags, email verification, rate limiting, backups, and monitoring at deployment.

Password recovery emails use Django's SMTP backend when `EMAIL_HOST` is set. Configure `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` (default `True`), `EMAIL_USE_SSL` (default `False`), and `DEFAULT_FROM_EMAIL` in the deployment environment. Without SMTP configuration, development prints reset emails to the server console.

Audio/video calls use authenticated WebSockets for immediate ringing and WebRTC signaling, with HTTP polling as a reconnect fallback. The development server uses an in-memory Channels layer; production deployments with multiple workers should configure a shared Redis channel layer. Browsers require a secure context (HTTPS, or localhost) for device access. STUN servers help peers connect across common networks; production deployments should configure a TURN relay for restrictive firewalls and NATs. Recipients need Dymee open to receive an in-site call ring; browser push for closed tabs requires a separate push-service setup.

This starter does not ship Google/Apple OAuth, browser push notifications, or automated image/video moderation. Those services require project credentials and deployment-specific configuration; the current account and messaging flows are functional without them.

See [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) for the Vercel, Neon, Redis, ASGI, and private Blob deployment setup.

## Data model

The `social` app defines `Profile`, `Post`, `Story`, `Follow`, `Like`, `Comment` (with nested replies), `CommentLike`, `Message`, `Notification`, `Block`, and `Report`. Relationships use foreign keys and database-level uniqueness/check constraints where appropriate. SQLite is the local default; a production database can be selected through Django's `DATABASES` setting.

## Tests

```powershell
python manage.py test social
```
