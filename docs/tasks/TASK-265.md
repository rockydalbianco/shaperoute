# TASK-265 — Il dominio getmuw.app per l'API

**Stato**: Done — 2026-10-08: l'API risponde su `api.getmuw.app` e
l'app di `preview` la chiama lì (gruppo `a39c9509`); il sito su
`getmuw.app` resta a TASK-237 B
**Fase**: 4 · **Branch**: `docs/TASK-265-domain`
**ADR**: ADR-0234

## Obiettivo

L'API risponde anche su `https://api.getmuw.app`, un nome dell'utente che
resta uguale se un giorno cambia il server, mentre
`https://188-245-9-220.sslip.io` continua a funzionare per le app già
installate.

## La richiesta dell'utente (2026-10-08)

Prima «voglio spostare il sito da quel server ai server di Zeda Server,
un'azienda tedesca». Saputo che il sito non è ancora online, che sul
server gira l'API e che Hetzner è già un'azienda tedesca: «ok teniamo
questo server, come faccio a comprare un dominio?». Fra i nomi liberi ha
scelto **`getmuw.app`** e l'ha comprato lui su Porkbun (registrato il
2026-10-08 alle 17:45Z, fino al 2027-10-08, server DNS di Porkbun).

## Contesto da leggere

- `docs/DEPLOY.md`, F.8 «Un indirizzo pubblico», F.12 (il Caddy di apt) e
  F.14 (questo task)
- `docs/DECISIONS.md`, ADR-0234

## Cosa fare

Divisione decisa dal Coordinatore (2026-10-08):

1. **Questo task** (documentazione, una PR): il task file, ADR-0234, la
   sezione F.14 di `DEPLOY.md` con il cambio esatto del Caddyfile, i
   controlli e come tornare indietro, le righe in `STATUS.md`. Sul server
   solo lettura: Caddy è quello di apt, in systemd (`caddy.service`,
   2.6.2), con `/etc/caddy/Caddyfile`; l'API ascolta su
   `127.0.0.1:8000`; `ufw` apre 22, 80 e 443 anche in IPv6.
2. **Il Coordinatore** applica il Caddyfile sul server quando
   `api.getmuw.app` risponde con l'IPv4 del server e l'utente dà l'ok per
   quel passo.
3. **Il Coordinatore** cambia `EXPO_PUBLIC_API_URL` di `preview` in
   `https://api.getmuw.app` e pubblica, dopo che il certificato è valido
   e con l'ok dell'utente.
4. **Il sito** su `getmuw.app` e `www.getmuw.app` è di TASK-237 (parte B,
   sessione «SITO WEB»), dopo il merge della #443 e con il sì
   dell'utente sulla pubblicazione, sullo stesso Caddy. Proposta, chiesta
   dal Coordinatore e scritta in `DEPLOY.md`, F.14, «Il sito su
   `getmuw.app`»: Caddy serve `/srv/getmuw-site`, una copia dei soli file
   che la pagina carica (`index.html`, `styles.css`, `main.js`,
   `render.js`, `content.js`, `config.js`, `data/`, `assets/`; controllati
   sugli `src`, `href` e `import` della #443), presa da `origin/main` con
   `git fetch` e `git archive` senza toccare i file dell'API, e rifatta
   con gli stessi comandi dopo ogni merge del sito; `www` rimanda a
   `getmuw.app`.

I record DNS li scrive l'utente nel pannello di Porkbun: tolti i due
record di parcheggio verso `pixie.porkbun.com`, tre record `A` (`@`,
`www`, `api`) con `188.245.9.220`.

## Criteri di accettazione

- [x] `docs/DEPLOY.md`, F.14: il cambio del Caddyfile riga per riga, i
      controlli con i risultati attesi, il ritorno indietro.
- [x] ADR-0234 in `DECISIONS.md`.
- [x] `dig +short api.getmuw.app` risponde `188.245.9.220` (8.8.8.8,
      9.9.9.9, i server di Porkbun e il server stesso; 1.1.1.1 aveva in
      cache per mezz'ora la risposta vuota di prima del record).
- [x] `curl -s https://api.getmuw.app/health` risponde `{"status":"ok"}`
      con un certificato valido, e `/docs` senza chiave risponde `401`.
- [x] `https://188-245-9-220.sslip.io/health` risponde ancora `200`.

Gli ultimi tre provati dal Mac il 2026-10-08, dopo che il Coordinatore ha
applicato il passo 2 con l'ok dell'utente: certificato Let's Encrypt
(`YE1`) per `api.getmuw.app`, valido fino al 2027-01-06.

## File toccati

```
docs/tasks/TASK-265.md
docs/DEPLOY.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Spostare il server da Hetzner a un altro provider: l'utente ha scelto di
  restare.
- Il sito su `getmuw.app` e `www`: TASK-237 B.
- Il ritorno da Strava (`SHAPEROUTE_DOMAIN`, la «Authorization Callback
  Domain» dell'applicazione Strava dell'utente): resta su `sslip.io`.
  Spostarlo vuol dire cambiare anche la pagina di Strava, e le app che
  usano ancora il vecchio indirizzo non ne guadagnano niente.
- Un record `AAAA`: il server ha l'IPv6 `2a01:4f8:c016:7ef0::1`, ma senza
  il record l'app funziona uguale (le reti solo IPv6 dei telefoni passano
  da NAT64).
- Passare al Caddy di `deploy/compose.yaml` (F.12, punto 4).
- Email su `getmuw.app`.

## Esito

1. **Documentazione** (questa PR): task file, ADR-0234, `DEPLOY.md` F.14
   (l'API e, su richiesta del Coordinatore, come Caddy servirà il sito),
   la riga in `STATUS.md`. Il DNS l'ha scritto l'utente su Porkbun il
   2026-10-08: tre record `A` verso `188.245.9.220`, tolti i due di
   parcheggio.
2. **Il Caddyfile sul server**, applicato dal Coordinatore il
   2026-10-08 con l'ok dell'utente («ok server dominio»): la riga del
   sito è diventata `188-245-9-220.sslip.io, api.getmuw.app {`, copia in
   `/etc/caddy/Caddyfile.before-task265`, `caddy validate` senza errori,
   `systemctl reload caddy`, Caddy attivo. Certificato Let's Encrypt
   `CN=api.getmuw.app` (`YE1`), valido fino al 2027-01-06. `/health`
   risponde 200 su `api.getmuw.app` e su `sslip.io`, `/docs` senza chiave
   401 (prove dal Mac).
3. **L'app**, dal Coordinatore il 2026-10-08 con l'ok dell'utente («ok,
   passa l'app su api.getmuw.app»): `EXPO_PUBLIC_API_URL` di `preview`
   → `https://api.getmuw.app`, la chiave non toccata, poi `main`
   `08793f41` pubblicato come gruppo `a39c9509`. Le app ancora su gruppi
   più vecchi continuano su `sslip.io`, che resta nel Caddyfile.
4. **Fuori da questo task**: il sito su `getmuw.app` e `www`, dopo il
   merge della #443 e il sì dell'utente sulla pubblicazione (TASK-237 B,
   `DEPLOY.md` F.14, «Il sito su `getmuw.app`»); il ritorno da Strava
   ancora su `sslip.io` (vedi «Fuori scope»).
