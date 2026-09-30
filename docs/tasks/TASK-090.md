# TASK-090 — L'API registra le richieste di percorso, per rifarle uguali

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-090-request-log`

Approvato dall'utente il 2026-09-30: «vuole questa funzione; serve a
correggere i difetti e non si vede nell'app». Era fra le idee non approvate
di `PASSAGGIO.md` e `AGENTI.md`. Numeri presi senza coordinatore: 084–088
occupati, 089 del branch `docs/TASK-089-social-plan`; ADR-0079…0083 presi,
0084 lasciato a TASK-089.

## Obiettivo

Una richiesta di percorso fatta dall'app resta scritta in un file sul
computer dell'API, e da quel file si può ripetere contro il motore
ottenendo lo stesso percorso.

## Contesto da leggere

- `docs/tasks/TASK-075.md`, «Esito»: perché non si è potuto rifare il cuore
- `docs/API.md`, «Avvio» e «Richieste in due tempi»
- `services/api/shaperoute_api/jobs.py`, `app.py`, `__main__.py`

## Cosa fare

1. Modulo nuovo `request_log.py`: una riga JSON per richiesta finita (ora,
   tipo, id del job, corpo, esito), con un tetto alla grandezza.
2. Agganciarlo ai job (`on_end` in `RouteJobs`, il corpo nel `Job`) e a
   `POST /routes`, senza che un errore di scrittura tocchi la richiesta.
3. `--request-log`, `--request-log-dir` e `SHAPEROUTE_REQUEST_LOG`
   all'avvio. Spento per default: acceso per default è una scelta
   dell'utente.
4. `python -m shaperoute_api.replay`: rifare una riga e dire se il percorso
   è lo stesso.
5. Riservatezza: niente chiave, intestazioni, foto; file fuori dal
   repository; `UI.md` («Cosa esce dal telefono») e `DEPLOY.md` aggiornati.
6. Test deterministici e una prova vera.

## Criteri di accettazione

- [x] Una riga per forma, parola (con lo stile) e immagine (con `outline` e
      `strokes`), con l'esito o il codice dell'errore (test).
- [x] Nel file non ci sono la chiave dell'API, le intestazioni né la foto
      (test); il file non è tracciato da git (`.gitignore`).
- [x] Una richiesta rifatta dal file dà al motore la stessa richiesta
      (test, per i tre tipi).
- [x] Un file non scrivibile non ferma la richiesta; l'avviso nel log non
      contiene la partenza (test).
- [x] Il file non supera il tetto: a 5 MB ruota, una copia vecchia (test).
- [x] Spento per default, acceso da opzione o variabile (test).
- [x] Prova vera: richiesta con curl, rifatta dal file, stesso percorso
      punto per punto.

## File toccati

```
services/api/shaperoute_api/request_log.py   (nuovo)
services/api/shaperoute_api/replay.py        (nuovo)
services/api/tests/test_request_log.py       (nuovo)
services/api/shaperoute_api/jobs.py          (on_end, il corpo nel Job)
services/api/shaperoute_api/app.py           (request_log in create_app)
services/api/shaperoute_api/__main__.py      (--request-log)
.gitignore, .env.example
docs/API.md, docs/UI.md («Cosa esce dal telefono»), docs/DEPLOY.md
docs/DECISIONS.md (ADR-0085), docs/STATUS.md, docs/tasks/TASK-090.md
```

## Fuori scope

- Qualunque cosa nell'app: la funzione non si vede.
- `schemas.py`, `images.py` (TASK-084), `graphs.py` (TASK-087).
- Registrare `/shape-readings`, `/image-outlines`, `/gpx`.
- Accendere il registro per default, o sul Mac dell'utente: scelta sua.
- Togliere le partenze dal log a schermo dell'API (le scrive il motore da
  TASK-076, `nearby_starts.py`): emerso qui, non corretto.

## Esito

Fatto. Con `--request-log` l'API scrive le richieste in
`data/requests/requests.jsonl`; `python -m shaperoute_api.replay` le rifà.
Prova vera (2026-09-30, API del worktree su una porta a parte, cache del
Mac): cuore 10 km da Caldonazzo (45.9934, 11.2580), 11 842 m, somiglianza
0,86, e «CIAO» squadrato 12 km da Levico, 12 118 m, 0,89; rifatti dal file:
467 e 626 punti, differenza 0 su ogni punto. L'immagine è coperta dai test,
non dalla prova vera. 18 test nuovi; l'API dell'utente sulla porta 8000 non
è stata toccata.

Emerso: `UI.md` diceva che l'API non scrive la partenza nel log, ma da
TASK-076 il motore la scrive a schermo («start 0 (45.9934, 11.258)»):
`UI.md` ora lo dice; toglierla sarebbe un altro task. Da decidere con
l'utente: se tenere il registro sempre acceso sul suo Mac.
