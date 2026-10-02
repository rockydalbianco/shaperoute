# TASK-122 — L'API e il database sempre accesi

**Stato**: In corso
**Fase**: 4 · **Branch**: `chore/TASK-122-hosting`
**Dipende da**: TASK-110, TASK-114 · **Serve prima di** invitare altre persone

## Obiettivo

API e database girano dove ha scelto l'utente in TASK-110, raggiungibili
da qualunque telefono con HTTPS, anche a Mac spento.

## Contesto da leggere

- `docs/DEPLOY.md`
- `docs/DECISIONS.md`, ADR di TASK-110 su hosting e database
- `docs/MAPS.md` «Overpass: come si scarica»

## Cosa fare

Creare account su servizi esterni, pagare e inserire chiavi lo fa
**l'utente**: l'agente prepara i file e la guida passo per passo.

1. Configurazione per il servizio scelto (il pacchetto Docker c'è già),
   con il database, le migrazioni all'avvio e i segreti fuori dal
   repository.
2. La cache delle zone sul server: quali zone caricare, quanto spazio.
3. HTTPS, chiave dell'API, limite alle richieste per indirizzo: l'API non
   è più dietro Tailscale.
4. Copia di sicurezza del database, e come si ripristina (provato una volta).
5. `EXPO_PUBLIC_API_URL` verso il server e app ripubblicata con EAS Update.
6. `DEPLOY.md`: una strada nuova, completa; `.env.example`.

## Criteri di accettazione

- [x] `GET /health` risponde in HTTPS da una rete diversa da quella di casa.
- [x] Un cuore da 5 km a Trento si genera dal server nei tempi di `API.md`.
- [ ] Iscrizione ed entrata funzionano dall'iPhone senza Tailscale
      (sull'indirizzo pubblico sì, provato con `curl`; dall'iPhone, con
      le schermate di TASK-115, è la prova dell'utente).
- [x] Un ripristino della copia di sicurezza è stato provato e annotato.
- [x] Nessun segreto nel repository.
- [ ] Le copie arrivano nello Storage Box (aggiunto il 2026-10-02, scelta
      dell'utente): dopo che l'utente lo ha creato.

### Dove si è fermato (2026-10-02)

PR #157 (in `main`): il database e la copia notturna in
`deploy/compose.yaml` e `deploy/backup.sh`, la CI (job `docker`:
iscrizione, copia, ripristino con un account), `DEPLOY.md` F.12 e F.13, la
correzione del `.dockerignore` che lasciava fuori le migrazioni.

**Il server è spostato** (2026-10-02, 07:27Z), da `main` 609a647: sul
server mancava `docker compose`, installato da Ubuntu
(`docker-compose-v2`, senza riavviare Docker); `deploy/.env` dal vecchio
`shaperoute.env` più `POSTGRES_PASSWORD`, generata lì; `cache`,
`insights` e `requests` spostate in `/root/shaperoute/data/`
(`/srv/shaperoute/extracts` di TASK-137 lasciata com'era); l'immagine di
prima tenuta come `shaperoute-api:before-task122`. API ferma 18 s.

**Lo Storage Box** (scelta dell'utente, ADR-0123, aggiornamento del
2026-10-02), PR nuova `chore/TASK-122-offsite`: un servizio `offsite`
(Alpine) manda copie ed eventi ogni notte alle 02:30 UTC; `deploy/mac/` è
tolto. La chiave SSH dedicata c'è già sul server
(`/root/.ssh/storagebox/`). Manca: l'utente crea lo Storage Box e incolla
la chiave pubblica (`DEPLOY.md` F.13, punto 2); poi, sul server, il
punto 3 (`known_hosts`, le due variabili, `push`), e il criterio qui
sopra.

## File toccati

```
docs/DEPLOY.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-122.md
.env.example
deploy/
docs/DATABASE.md            (aggiunto: le copie non sono più su Oracle)
deploy/offsite/Dockerfile   (nuovo: l'immagine del servizio offsite)
tools/test_backup_push.py   (nuovo: l'invio allo Storage Box, provato senza rete)
.gitignore                  (aggiunto: data/backups/, le copie fuori da git)
.github/workflows/ci.yml    (aggiunto: database, iscrizione e copia nel job docker)
tools/test_pull_backups.py  (tolto con deploy/mac/, il 2026-10-02)
.dockerignore               (aggiunto: le migrazioni nell'immagine, mancavano da TASK-114)
```

Le copie fuori dal server vanno in uno Storage Box Hetzner (scelta
dell'utente, 2026-10-02, ADR-0123 e il suo aggiornamento): prima erano sul
Mac, in `deploy/mac/`, tolto. Lo spostamento del server su `compose.yaml`
(`DEPLOY.md` F.12) è parte di questo task, deciso col coordinatore.

## Fuori scope

- Build propria per l'App Store (account Apple Developer): task a parte.
- Rendere più veloce il motore.

## Esito

Il server con il database, dal vivo (2026-10-02, dopo lo spostamento):
`/health` in HTTPS dal Mac 200 in 0,14 s; un cuore da 5 km a Trento
dall'indirizzo pubblico in 18,0 s, 4,9 km, somiglianza 0,92; un account di
prova sull'indirizzo pubblico: iscrizione 201, `/me` 200, entrata 200,
`DELETE /me` 204, poi `not_signed_in`, e nel database 0 utenti e 0
sessioni; la prima copia (modo 600) si ripristina con `backup.sh check`.
All'avvio l'API scrive la chiave, Geoapify, 159 percorsi consigliati e
«Accounts in PostgreSQL; migrations: 0001_users_sessions». Il ripristino
vero di F.13 è provato in locale, con Colima: dopo, l'account della copia
entra, quello creato dopo la copia no. Restano lo Storage Box (dell'utente)
e la prova dall'iPhone.
