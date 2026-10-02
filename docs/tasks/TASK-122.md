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

- [ ] `GET /health` risponde in HTTPS da una rete diversa da quella di casa.
- [ ] Un cuore da 5 km a Trento si genera dal server nei tempi di `API.md`.
- [ ] Iscrizione ed entrata funzionano dall'iPhone senza Tailscale.
- [ ] Un ripristino della copia di sicurezza è stato provato e annotato.
- [x] Nessun segreto nel repository.

### Dove si è fermato (2026-10-02)

Fatto, nella PR #157: il database e la copia notturna in
`deploy/compose.yaml` e `deploy/backup.sh`, le copie sul Mac in
`deploy/mac/`, la CI (job `docker`: iscrizione, copia, ripristino con un
account), `DEPLOY.md` F.12 e F.13, la correzione del `.dockerignore` che
lasciava fuori le migrazioni. Provati in locale, con Colima: la stessa
sequenza della CI e il ripristino vero di F.13 (dopo, l'account della
copia entra, quello creato dopo la copia no).

Fermo per scelta dell'utente: **lo spostamento del server** (F.12) e
**dove vanno le copie** fuori dal server. L'utente pensa di lavorare da un
server di sviluppo; in quel caso le copie andrebbero lì e non sul Mac
(ADR-0123 dice il Mac). Nessuna delle due cose è stata fatta: il server
gira ancora col `docker run` a mano, senza database.

Per riprendere, dopo la scelta:
1. Se cambia la destinazione delle copie, adattare `deploy/mac/` (o
   uno script gemello per il server di sviluppo) e scriverlo in ADR-0123.
2. Sul server, da `main`: F.12 passi 1–6. Prima e dopo avvisare la
   sessione di TASK-137, che usa la stessa cartella della cache e il
   container `shaperoute-prefetch` (da non toccare, con
   `/srv/shaperoute/extracts`).
3. I quattro criteri qui sopra, annotati in «Esito»: HTTPS da fuori, il
   cuore da 5 km a Trento, un'iscrizione di prova sull'indirizzo pubblico
   (poi `DELETE /me`; dall'iPhone serve TASK-115), `backup.sh now` e
   `check` sul server e un ripristino della copia arrivata a destinazione.
4. L'`eas update` lo fa il coordinatore, non questo task.

## File toccati

```
docs/DEPLOY.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-122.md
.env.example
deploy/
docs/DATABASE.md            (aggiunto: le copie non sono più su Oracle)
.gitignore                  (aggiunto: data/backups/, le copie fuori da git)
.github/workflows/ci.yml    (aggiunto: database, iscrizione e copia nel job docker)
tools/test_pull_backups.py  (nuovo: la copia sul Mac, provata senza rete)
.dockerignore               (aggiunto: le migrazioni nell'immagine, mancavano da TASK-114)
```

Le copie fuori dal server vanno sul Mac (scelta dell'utente, 2026-10-02,
ADR-0123): `deploy/mac/`. Lo spostamento del server su `compose.yaml`
(`DEPLOY.md` F.12) è parte di questo task, deciso col coordinatore; sul
server si lavora solo dopo il sì dell'utente.

## Fuori scope

- Build propria per l'App Store (account Apple Developer): task a parte.
- Rendere più veloce il motore.

## Esito
