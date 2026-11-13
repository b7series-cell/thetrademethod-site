# Deploying thetrademethod.com

Push to `main` and GitHub Actions uploads the site to SiteGround
(`.github/workflows/deploy.yml`), then tries to flush the SiteGround cache.
Watch it under the repo's **Actions** tab.

- Upload-only: nothing on the server is deleted. Retired pages have to be
  removed from `public_html` by hand.
- Never uploaded: `_docs/`, `.github/`, this file.
- Never touched on the server: `api/config.php` (Massive key), `api/cache/`
  (chart cache, contact log, notes), `.well-known/`.
- To preview without changing anything: Actions > Deploy to SiteGround >
  Run workflow > tick "Only list what would upload".
