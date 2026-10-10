# Drive upload Apps Script (fork-local)

Backend for MarkText's "Upload to Google Docs" rail button. MarkText converts the
tab to `.docx` with pandoc and POSTs it here; this script imports it into Drive
as a native Google Doc, or re-imports into the same Doc on later clicks.

Never send this upstream.

## Deploy (once)

1. Create a new project at https://script.google.com.
2. Project Settings: tick "Show appsscript.json manifest file in editor".
3. Replace `Code.gs` and `appsscript.json` with the files in this folder.
4. Project Settings > Script Properties: add `API_KEY` with a random value,
   e.g. `openssl rand -hex 24`.
5. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
   Authorize when asked.
6. Write the web app URL and key where MarkText's main process reads them:

   ```bash
   mkdir -p ~/.config/marktext
   cat > ~/.config/marktext/drive-upload.json <<JSON
   { "webAppUrl": "https://script.google.com/macros/s/.../exec", "apiKey": "..." }
   JSON
   chmod 600 ~/.config/marktext/drive-upload.json
   ```

To change the code later, use Deploy > Manage deployments > edit the existing
deployment > New version. That keeps the URL. "New deployment" mints a new URL
and MarkText would keep calling the old one.

## Why "Anyone" and the full Drive scope

- A POST from Node carries no Google session cookie, so the web app must accept
  anonymous callers. The `API_KEY` script property plus a 5 minute timestamp
  window is the gate.
- The folder browser lists and writes into arbitrary existing folders.
  `drive.file` only sees files the script created itself, so the full
  `https://www.googleapis.com/auth/drive` scope is required.

## Smoke test

```bash
URL=...; KEY=...
now() { python3 -c 'import time; print(int(time.time()*1000))'; }
curl -sL -H 'Content-Type: text/plain' \
  -d "{\"apiKey\":\"$KEY\",\"timestamp\":$(now),\"action\":\"listFolders\",\"params\":{}}" "$URL"
```

For `upload`, `params` is `{ name, docxBase64, fileId?, folderId? }`; the
response `data` is `{ id, url, updated }`.
