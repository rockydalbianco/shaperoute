# TASK-081 — Preparare il passaggio a un server: API raggiungibile da fuori casa, protetta, con la guida

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-081-server-ready` · **ADR**: ADR-0076

## Obiettivo

L'API si può raggiungere da fuori casa (PC + Tailscale adesso; Cloudflare
Tunnel o un server più avanti) con una chiave e un limite di richieste, e
l'app sa usare un indirizzo e una chiave configurati. Gratis e senza carta.

## Cosa fare

1. Chiave (`SHAPEROUTE_API_KEY`, intestazione `X-API-Key`, 401
   `unauthorized`) e limite in memoria (`SHAPEROUTE_RATE_LIMIT` POST al
   minuto per client, default 30, 429 `too_many_requests`): modulo nuovo
   `access.py`, una riga in `app.py`. Senza variabile, tutto come oggi.
2. App: `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_API_KEY` in `apps/mobile/.env`.
3. `Dockerfile` + `.dockerignore`, job CI `docker` (build + /health, senza
   pubblicare).
4. `docs/DEPLOY.md` (Tailscale, Cloudflare Tunnel, Hetzner/Oracle), link da
   `SETUP.md`, errori in `API.md`.
5. Prova Tailscale in 5G, se l'utente la vuole fare.

## Criteri di accettazione

- [x] Con chiave: senza/sbagliata 401 `unauthorized`, /health aperto; senza
      chiave aperto (test `services/api/tests/test_access.py`).
- [x] Limite sui POST per client, 429 con Retry-After; i GET no (test).
- [x] Codici nuovi in `schemas.py`, `shared-types` (in fondo) e fixture.
- [x] L'app usa URL/chiave configurati e manda la chiave in percorsi (POST,
      GET, DELETE), GPX, letture AI, immagini (test); messaggi in
      `problems.ts` (test nuovo `accessProblems.test.ts`).
- [x] `Dockerfile`, `.dockerignore`, job CI `docker` scritti (da verificare
      in CI: job `docker` verde, amd64 con prova di /health e chiave, e
      arm64).
- [x] `docs/DEPLOY.md` (strade A–E), link in `SETUP.md`, errori in `API.md`.
- [x] ADR-0076 in `DECISIONS.md`, righe in `STATUS.md`.
- [x] Prova PC + Tailscale dall'iPhone in 5G, Wi-Fi spenta: funziona
      (l'utente, 2026-09-26).
- [x] PR #94 con CI verde (anche `docker`, amd64 e arm64).

## File toccati

```
services/api/shaperoute_api/access.py        (nuovo)
services/api/shaperoute_api/app.py           (import + protect(app))
services/api/shaperoute_api/__main__.py
services/api/shaperoute_api/schemas.py
services/api/tests/test_access.py            (nuovo)
packages/shared-types/src/index.ts           (solo API_ERROR_CODES, in fondo)
packages/shared-types/fixtures/api-error-codes.json
apps/mobile/src/api/apiUrl.ts, routes.ts, gpx.ts, shapeReadings.ts, imageOutlines.ts e i loro test
apps/mobile/src/route/problems.ts, problems.test.ts (messaggio «unreachable», ok del coordinatore)
apps/mobile/src/route/accessProblems.test.ts (nuovo)
apps/mobile/__tests__/App.test.tsx          (una riga, con l'ok del coordinatore; il file è anche di TASK-065)
Dockerfile, .dockerignore                    (nuovi)
.env.example
.github/workflows/ci.yml                     (solo il job docker)
docs/DEPLOY.md (nuovo), docs/SETUP.md, docs/API.md, docs/tasks/TASK-081.md
docs/STATUS.md, docs/DECISIONS.md            (solo righe nuove)
```

## Dove sono arrivato (2026-09-26)

Fatto e verificato in locale: test API 134 verdi; app typecheck, lint,
prettier verdi; jest 338/346 in blocco, le 3 suite rosse (LoadingBar,
MapView, RoutePanel) sono timeout per la RAM e passano da sole (26/26).

Scelte da scrivere in ADR-0076 (deciso dall'agente su delega dell'utente):
chiave solo da variabile d'ambiente, mai da riga di comando; almeno 16
caratteri, altrimenti l'API non parte; /health sempre aperto; confronto con
`hmac.compare_digest`; limite solo sui POST (il polling dei job è GET ogni
2 s), per indirizzo del client (dietro un tunnel tutti condividono lo
stesso); Docker con `python:3.12-slim`, pacchetti eseguiti dai sorgenti via
`PYTHONPATH` (`letters_block.json` non è in `package-data`), utente non
root, volume `/app/data/cache`; zone al primo avvio: scaricate alla prima
richiesta, o subito con `docker run --rm -v shaperoute-cache:/app/data/cache
shaperoute-api python -m route_engine --shape circle --distance 15000
--start LAT,LON`; Ollama fuori dall'immagine (`--ai-url`).

Da fare: `DEPLOY.md` (A Tailscale: `--lan`, IP 100.x del PC in
`EXPO_PUBLIC_API_URL`, firewall di Windows sulla rete Tailscale; B
`cloudflared tunnel --url http://localhost:8000` + chiave; C Docker su
Hetzner/Oracle), link in `SETUP.md` §10, due righe nella tabella errori di
`API.md`, ADR-0076, STATUS, PR. Il messaggio «unreachable» ora vale anche
per Tailscale e per un server (`problems.test.ts` aggiunto con l'ok del
coordinatore).

## Esito

Fatto. Con `SHAPEROUTE_API_KEY` l'API chiede la chiave `X-API-Key` e
limita i POST (401 `unauthorized`, 429 `too_many_requests`); senza, tutto
come prima. L'app usa `EXPO_PUBLIC_API_URL` ed `EXPO_PUBLIC_API_KEY` se ci
sono. L'immagine Docker si costruisce per amd64 e arm64. `DEPLOY.md` ha le
strade A–E; la A (PC + Tailscale, con `REACT_NATIVE_PACKAGER_HOSTNAME`)
funziona dall'iPhone in 5G senza le variabili nuove. Il messaggio «Cannot
reach the API» ora nomina Wi-Fi, Tailscale e server (una riga di
`App.test.tsx`, con l'ok del coordinatore). Prossimo: TASK-079.
