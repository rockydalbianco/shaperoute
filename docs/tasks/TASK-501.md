# TASK-501 — Server più leggero: anteprime delle corse, coordinate a 6 decimali, attesa in coda misurata

**Stato**: Parte B · 2026-11-26 · A in main (#1638, migrazione 0088); il
suo passo sul server («passo 25») è del Coordinatore, col sì dell'utente.
B in lavorazione, poi C
**Fase**: 5 · **ADR**: nessuno nuovo (le anteprime seguono ADR-0249) ·
numero dal Coordinatore (fork 3, 2026-11-23 sera) · voci O10, O11 e O13
di `out/prova-app-2026-11-23/PROPOSTE.md` (proposta «F»)

## Obiettivo

Dalla lettura del codice del 2026-11-23, approvata dall'utente con «Sì,
tutte». Tre lavori piccoli, quasi tutti sul server, che l'utente non vede:
liste più rapide, risposte più leggere e un numero che oggi manca.

- **O10.** `GET /me/activities` legge dal database la traccia e il percorso
  interi di ogni corsa della pagina, per ricavarne in Python 64 punti
  (`activities.py`, `_listed` → `recommended.preview`). I disegni hanno già
  un'anteprima calcolata da PostgreSQL (migrazione 0022, ADR-0249: da 23 s
  a 0,8 s). Coach chiede fino a 29 pagine una dopo l'altra
  (`coach/coachData.ts`, i cicli `for … await` su mesi, sessioni e corse).
- **O11.** Le coordinate escono con 15 cifre decimali (`ST_AsGeoJSON(…, 15)`);
  6 bastano (circa 10 cm) e pesano quasi la metà. Aprendo un post l'app
  scarica il disegno per i numeri (`feed/usePostStats.ts`) e lo riscarica
  toccando la mappa (`social/drawingsDoor.ts`).
- **O13.** Sul server girano 2 percorsi alla volta (`jobs.py`, `WORKERS = 2`);
  quanto una richiesta aspetta in coda non è in nessun numero
  (`job_times.py`). Prima di cambiare il 2 serve il dato.

## Domande all'utente

Nessuna: nessuna delle tre cambia quello che l'utente vede o quello che si
promette, e le ha già approvate tutte (2026-11-23). Le scelte qui sotto sono
**dell'agente su delega dell'utente**.

## Scelte tecniche (dell'agente)

- **Anteprime delle corse come quelle dei disegni**: due colonne generate su
  `runs`, `track_preview` e `route_preview`, fatte da `drawing_preview`
  (migrazione 0022) sulla traccia in 2D e sul percorso. La lista legge solo
  quelle; il dettaglio di una corsa resta intero. Le colonne si scrivono da
  sole a ogni salvataggio: niente codice di scrittura nuovo.
- **La migrazione riscrive `runs`** (una colonna `STORED` nuova): prima del
  passo sul server si misura quanto dura su una copia della tabella di
  produzione; se è lunga si sceglie un'altra strada (colonna normale
  riempita a pezzi) prima del merge.
- **6 decimali solo nelle risposte** all'app: le query che rileggono una
  geometria per riscriverla nel database (`drawing_retrack.py`) restano a
  15. I numeri e le distanze si calcolano prima, sulle geometrie intere.
- **`queued_s`**: il tempo fra la richiesta accettata e l'inizio del
  lavoro, nella riga di `job_times` e negli eventi che già la registrano.
  Il numero dei lavoratori non cambia: se ne parla coi dati di qualche
  settimana.
- **Coach in parallelo, con un tetto** (4 richieste insieme), per non
  inondare il server; stessi risultati, stesso ordine.
- **Un post scarica il disegno una volta**: i numeri e la mappa usano la
  stessa risposta, tenuta per l'id del disegno finché il post è aperto.

## Parti

- **A — anteprime delle corse (O10, server, migrazione)**: la migrazione,
  la lista che legge le anteprime, i test con una corsa lunga e una senza
  percorso. Passo sul server col sì dell'utente (Coordinatore).
- **B — risposte più leggere e coda misurata (O11 + O13, server)**: 6
  decimali dove si risponde all'app, `queued_s`. Nessuna migrazione.
- **C — l'app (O10 + O11, app, OTA)**: Coach in parallelo, il post che
  scarica una volta.

Ordine: A, B, C. A e B toccano tutte e due `activities.py`: una dopo
l'altra, mai insieme.

## Criteri di accettazione

- [x] `GET /me/activities` non legge più `track` e `route` interi: la lista
      dà le stesse anteprime di prima (test che confronta le due strade su
      corse vere della fixture). — parte A, `test_activity_previews.py`.
- [ ] Le risposte all'app hanno coordinate a 6 decimali; i test che
      leggono coordinate passano; nessuna scrittura nel database cambia.
- [ ] `queued_s` compare nella riga di `job_times` e nei suoi test, anche
      con due lavori che si aspettano.
- [ ] Coach mostra gli stessi dati con le richieste in parallelo (test con
      fetcher finti, l'ordine controllato); al massimo 4 insieme.
- [ ] Aprire un post e toccare la mappa fa una richiesta del disegno, non
      due (test).
- [x] `docs/DATABASE.md` dice le due colonne nuove; misura della migrazione
      su una copia di produzione scritta nel task file prima del passo. —
      niente copia dei dati veri (scelta del Coordinatore): tabella gonfiata
      in locale e numeri di produzione in sola lettura, in «Misure».
- [ ] Prova: tempi di `/me/activities` prima e dopo sul database di prova;
      la prova sul telefono dopo l'OTA della parte C.

## Misure

Script e risultati in `out/TASK-501/` (non nel repository):
`measure_activities.py`, `time_migration.py`, i JSON.

### Parte A — la lista delle corse (2026-11-26)

Database di prova sul Mac (PostGIS 16-3.4, immagine x86_64 emulata), 60
corse da 3600 punti, metà con un percorso da 2000; mediana di 15 richieste
con il client in-process dei test. **Non sono numeri di produzione.**

| | prima | dopo |
|---|---|---|
| `GET /me/activities`, 20 corse | 237 ms | 160 ms |
| `GET /me/activities?limit=50` | 380 ms | 166 ms |
| la sola query della lista, 20 corse | 44 ms | 2,0 ms |
| la sola query della lista, 50 corse | 105 ms | 3,3 ms |
| GeoJSON da PostgreSQL all'API, 20 corse | 3 808 227 caratteri | 80 533 |
| GeoJSON da PostgreSQL all'API, 50 corse | 9 193 557 caratteri | 193 921 |
| corpo della risposta, 20 corse | 44 001 byte (9 984 gzip) | gli stessi byte |

Circa 155 ms di ogni richiesta non sono la lista (uguali prima e dopo in
questo client: controllo dell'accesso, pydantic, il client stesso): non
misurati a parte. Non misurati: i tempi sul server vero, il telefono.

### Parte A — la migrazione 0088

Riscrive `runs` e i suoi 5 indici una volta, tenendo il lock esclusivo
sulla tabella. Su copie delle stesse corse, in locale:

| righe | tabella prima | durata | a corsa | tabella dopo |
|---|---|---|---|---|
| 1 000 | 107,7 MB | 11,4 s | 11,4 ms | 110,6 MB (+2,7%) |
| 4 000 | 430,4 MB | 46,7 s | 11,7 ms | 442,2 MB (+2,7%) |

Lineare: circa 11,5 ms per una corsa da 4 600 punti fra traccia e
percorso (circa 2,5 µs a punto), circa 107 s per GB.

**Produzione** (letta dal Coordinatore in sola lettura, 2026-11-26): 13
righe, 11 con traccia e 6 con percorso; 15 398 punti di traccia (media
1 400, massimo 3 913) e 3 853 di percorso; 745 472 byte in tutto, 5
indici; PostgreSQL 16.4, PostGIS 3.4.3. **Stima: circa 0,05 s** (19 251
punti × 2,5 µs), comunque sotto il secondo: la colonna generata resta
com'è (parola del Coordinatore). La misura sulla tabella gonfiata vale
come stima futura: a 1 000 corse da un'ora la stessa migrazione terrebbe
la tabella chiusa una decina di secondi. La durata vera sul server non è
stata cronometrata.

## File toccati

Da confermare col Coordinatore prima di qualsiasi codice.

```
# Parte A
services/api/migrations/0088_run_previews.sql       (nuovo; 0088 riservata dal Coordinatore, 26-11)
services/api/shaperoute_api/activities.py
services/api/tests/test_activities.py
services/api/tests/test_activity_previews.py        (nuovo)
docs/DATABASE.md

# Parte B
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/favorites.py
services/api/shaperoute_api/group_runs.py
services/api/shaperoute_api/post_links.py
services/api/shaperoute_api/jobs.py
services/api/shaperoute_api/job_times.py
services/api/tests/test_coordinate_decimals.py      (nuovo)
services/api/tests/test_job_times.py
services/api/tests/test_jobs.py

# Parte C
apps/mobile/src/coach/coachData.ts
apps/mobile/src/coach/coachData.test.ts
apps/mobile/src/feed/usePostStats.ts
apps/mobile/src/feed/usePostStats.test.tsx           (nuovo)
apps/mobile/src/social/drawingsDoor.ts
apps/mobile/src/social/drawingsDoor.test.tsx

docs/tasks/TASK-501.md                              (nuovo)
```

`messages.py` (anche lui a 15 decimali, riga della `d.preview`) resta fuori
dalla B (Coordinatore, 2026-11-26): è libero dopo 498 A, ma quella riga è
un'anteprima che Python arrotonda già a 5 decimali, la risposta all'app non
cambierebbe. Lo stesso vale per le anteprime delle altre liste: il guadagno
della B è nelle linee intere. Se `schemas.py` dovesse cambiare, è dentro
`engine.zip`: si dice prima al Coordinatore.

## Fuori scope

- Cambiare il numero dei lavoratori del motore (dopo i dati di `queued_s`).
- Una chiamata unica per i bollini, le foto come indirizzo nelle liste
  (idee di TASK-499).
- `messages.py`: la sua riga è già un'anteprima a 5 decimali.
