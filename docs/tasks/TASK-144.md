# TASK-144 — Un server a pagamento: la guida e la configurazione pronta

**Stato**: Done
**Fase**: 4 · **Branch**: `chore/TASK-144-server-guide`

Chiesto dall'utente il 2026-10-01: «le istruzioni per inserire la nostra
applicazione in un server, così da usarla in remoto senza avere il
computer aperto, e per poterla un giorno pubblicare; e le migliori scelte
di server a pagamento, qualità prezzo». Il numero è il primo libero fra
`main`, i branch remoti e i worktree (TASK-143 è preso).

## Obiettivo

Chi segue `DEPLOY.md` porta l'API su un server a pagamento con pochi
comandi già scritti e la raggiunge dall'iPhone a Mac spento; sa quale
server prendere, quanto costa oggi, e cosa manca per pubblicare l'app.

## Il problema, oggi

- La strada C di `DEPLOY.md` ha prezzi vecchi: Hetzner li ha alzati il
  1° aprile e il 15 giugno 2026 (un CX33 da 6,49 a 8,49 €/mese, IVA
  esclusa).
- Il pacchetto Docker da solo non basta più: l'immagine non contiene
  `catalog/` («Explore» resta vuoto), gli eventi di TASK-130
  (`data/insights/`) spariscono a ogni container nuovo, e non c'è niente
  per HTTPS, per l'AI o per copiare le zone dal Mac (19 GB).
- Dietro un proxy HTTPS l'API vedrebbe tutti i telefoni con un indirizzo
  solo, e il limite di 30 POST al minuto varrebbe per tutti insieme.
- Durante il task l'utente ha scelto il server, **Hetzner CX33**, e
  un'altra sessione l'ha messo su a mano (`docker run`, Caddy da apt,
  `sslip.io`), con l'app pubblicata che lo usa già: la guida lo descrive
  e dice come portarlo sulla configurazione nuova (F.12).

## Contesto da leggere

- `docs/DEPLOY.md` (tutto: è il documento che si cambia)
- `docs/DECISIONS.md` ADR-0076 (strade A–E, Docker), ADR-0013
- `docs/tasks/TASK-122.md` (il seguito, con il database)
- `Dockerfile`, `services/api/shaperoute_api/__main__.py` (opzioni)

## Cosa fare

1. `deploy/compose.yaml`: l'API dal `Dockerfile`, con zone, eventi e
   registro in `data/` del checkout (cartelle normali, da riempire con
   `rsync` dal Mac), `catalog/` montato in sola lettura, porta 8000 solo
   su `127.0.0.1`, log di Docker limitati. Due profili facoltativi: `ai`
   (Ollama con `qwen3:4b`) e `public` (Caddy con HTTPS automatico).
2. `deploy/Caddyfile`: il dominio da `SHAPEROUTE_DOMAIN`, verso l'API.
3. L'indirizzo vero del client dietro Caddy o `tailscale serve`
   (`FORWARDED_ALLOW_IPS` di uvicorn), così il limite resta per telefono.
4. `DEPLOY.md`, strada nuova **F**: scegliere il server (confronto con i
   prezzi di oggi), crearlo, Docker, Tailscale con HTTPS
   (`tailscale serve`), copiare le zone, l'app verso il server; poi
   l'indirizzo pubblico con dominio e Caddy; poi cosa manca per
   pubblicare l'app. Strada C aggiornata con un rimando.
5. `.env.example`: `SHAPEROUTE_DOMAIN`.
6. CI: il job `docker` avvia anche la configurazione di `deploy/` e
   controlla `/health`, la chiave e il `Caddyfile`.
7. ADR nuovo: il confronto dei server e le scelte della configurazione.

Creare account, pagare, comprare un dominio e inserire chiavi lo fa
**l'utente**; la scelta del server è sua.

## Criteri di accettazione

- [x] La CI avvia `deploy/compose.yaml` e `/health` risponde; senza
      chiave `/docs` dà 401, con la chiave 200.
- [x] La CI convalida il `Caddyfile` e la configurazione con i profili
      `ai` e `public`.
- [x] `DEPLOY.md` ha la strada F completa, dal server comprato all'app
      sull'iPhone, e i prezzi con la data della verifica.
- [x] Nessun segreto nel repository.

## File toccati

```
deploy/compose.yaml
deploy/Caddyfile
docs/DEPLOY.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-144.md
.env.example
.github/workflows/ci.yml
```

## Fuori scope

- Il database, gli account e la loro copia di sicurezza: TASK-114 e
  TASK-122, che partono da `deploy/`.
- Comprare il server o il dominio, creare account: lo fa l'utente.
- Spostare il server di oggi su `deploy/compose.yaml`: a fine coda dei
  merge, come dice il coordinatore (F.12 dice come).
- L'AI su CPU sul server: da provare dopo lo spostamento.
- Cambiare il `Dockerfile` o il codice dell'API.
- La build propria per App Store e Play Store (account Apple Developer).

## Esito

La strada F di `DEPLOY.md` e `deploy/` (compose con API, AI e Caddy a
scelta) ci sono, con i prezzi del 2026-10-01; la CI avvia la
configurazione e controlla `/health`, la chiave, `data/cache`, «Explore» a
Trento e il `Caddyfile`. Il server scelto dall'utente, Hetzner CX33, è
acceso ma fatto a mano: spostarlo con F.12 e provare l'AI su CPU restano
da fare, a fine coda dei merge.
