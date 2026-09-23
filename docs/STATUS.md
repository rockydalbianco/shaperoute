# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-09-23 · **Fase corrente**: 1 — Route Engine

---

## In una riga

La CLI ruota, scala e sposta la forma finché le strade la seguono e scrive
un GPX chiuso: a Trento e Milano cuori e cerchi riconoscibili alla distanza
giusta, a Levico quasi; dove la rete è troppo rada la forma è dichiarata
non disponibile.

## Prossimo passo

**TASK-016 — Validazione: distanza, ripercorrenza, percorribilità.**
Il file del task è scritto (`docs/tasks/TASK-016.md`); il primo passo è
confermare soglie e categorie, e se togliere anche le "punte" su strade
parallele (passo 6).

## In lavorazione

### TASK-016 — Ripresa (sessione interrotta il 2026-09-23: batteria)

Branch `feat/TASK-016-validation`, nato da `docs/TASK-016-task-file` (il
file del task: se la sua PR non è ancora mergiata, mergiarla prima). Scelte
dell'utente già nel file del task: soglie come proposte, e le punte si
tolgono (passo 6).

**Fatto** (commit "work in progress" sul branch, 128 test verdi):
- `validation.py`: `measure` (ripercorrenza esatta e visiva, metri su
  scale, strade principali, gallerie), `validate` (warning sopra soglia),
  `check_closed` (errore se il percorso non è chiuso o la partenza è a più
  di 500 m); chiamati da `plan_route`, valori in `Plan.checks`, colonne in
  `tests/measure_optimizer.py`; test in `tests/test_validation.py`.
- Ripercorrenza visiva: distanza lungo il percorso minima **60 m**, non
  200 come nel file del task (a 200 m le punte corte non si vedevano).
- `prune_parallel_spurs` in `network.py`: toglie le andate e ritorno su
  strade parallele (non verso le punte della forma); in `snap_to_network`
  le due potature si ripetono finché il percorso non cambia (così il cerchio
  5 km di Levico passa da 59% ripercorso a 2%).
- Ricerca: `MAX_TRACES` 20 (limite di tempo 40 s accettato dall'utente);
  nuova strategia "screening" (primo piazzamento con le correzioni di
  scala, gli altri tracciati una volta sola, `TOP_PLACEMENTS` 12,
  `RESERVED_TRACES` 4). **In `optimizer.py` c'è un interruttore
  temporaneo `SCREEN_ONCE`** per confrontarla con la vecchia strategia:
  va tolto dopo il confronto.

**Problema aperto**: dopo la nuova potatura il cuore da 15 km a Trento è
peggiorato (0,94 → 0,85–0,89) perché la ricerca non ritrova il piazzamento
della v3 (rotazione 60°, fase 0, scala 51%), che con lo snapping attuale dà
ancora 0,94. Il confronto delle due strategie sui 16 casi era in corso:
`python ../../_compare.py A` e `... B` (in `services/route-engine/`,
script non versionato alla radice); se è andato perso, rilanciarlo.

**Confronto fatto** (14 casi disegnabili, budget 20):
- A, screening (`SCREEN_ONCE = True`): somiglianza media 0,845, 6 casi
  convergenti; meglio sul cuore 5 km Trento (0,91, converge);
- B, correzioni su ogni piazzamento (`SCREEN_ONCE = False`,
  `TOP_PLACEMENTS` 6, `RESERVED_TRACES` 0): media **0,862**, 5 convergenti;
  meglio sui 15 km di Trento (0,89 e 0,82), sui cerchi di Levico e sul
  cerchio 15 km Valsugana;
- nessuna delle due ritrova lo 0,94 del cuore 15 km Trento; Milano uguale.

**Da fare, in ordine:**
1. Scegliere la strategia (proposta: B, media più alta, differenze piccole)
   e togliere `SCREEN_ONCE`.
2. Rigenerare i campioni `TASK-016_*_v1.gpx` (quelli sul disco, non
   versionati, sono di un codice precedente: cancellarli), righe in
   `samples/LOG.md`, far giudicare all'utente.
3. Documentazione: ADR-0026 (soglie, 60 m, potatura delle punte parallele,
   ricerca), `ROUTE_ENGINE.md` §4 e §6 (allineare ad ADR-0025), `MAPS.md`
   con le misure, criteri ed esito in `docs/tasks/TASK-016.md`.
4. Chiudere TASK-016.

**File temporanei alla radice** (non versionati): `_png.py`,
`_samples016.py` (genera campioni e immagine), `_samples016.png`,
`_samples016.txt`, `_compare.py`, `_compare.txt`.

## Completato

- **TASK-015** — Ottimizzatore: 17 partenze (fino a 500 m) × 24 rotazioni ×
  4 fasi contate sulle strade, tracciamento delle migliori, scala per
  secante; somiglianza = copertura nei due sensi meno le punte mancate
  (ADR-0023, ADR-0025). Trento e Levico: distanza entro ±10% in 8 casi su
  8; Milano perfetta; Valsugana in parte non disponibile. 7–32 s per caso.
- **TASK-019** — `python tools/preview_samples.py "samples/TASK-015_*_v3.gpx"`
  scrive `out/preview.html`: tutti i campioni su una mappa OSM (ADR-0024).
- **TASK-018** — README allineato alla fase 1 (stato, «Provarlo»); CI senza
  impalcatura, con cache di pip.
- **TASK-017** — Zone di nodi e corridoio attorno al contorno (ADR-0022);
  rete a piedi con le ciclopedonali, nei due sensi.
- **TASK-010–014** — Pacchetto e CLI, forme circle e heart, proiezione,
  export GPX, snapping su OSMnx con cache e potatura degli speroni.
- **TASK-001** — Repository pubblico, `main` protetto da PR obbligatoria.

## Bloccato

Niente.

## Note per la prossima sessione

- Setup locale del route-engine: in `services/route-engine/`,
  `python -m venv .venv` e `pip install -e ".[dev]"`.
- In cache ci sono i grafi `foot` di zona di trento, levico, valsugana e
  milano (ADR-0023): tutti i casi girano offline. Da questo PC un indirizzo
  di `overpass-api.de` non risponde: prima di scaricare, leggere `MAPS.md`,
  "Overpass: come si scarica".
- Per misurare sui casi di riferimento (in `services/route-engine/`):
  `python tests/measure_optimizer.py` (ottimizzatore, `--no-optimize` per
  TASK-017) e `python tests/measure_snapping.py` (solo snapping).
- Difetto noto, non ancora in un task: **punte** di andata e ritorno su
  strade parallele (marciapiede e strada) che la potatura non riconosce
  (`MAPS.md`). Candidato per TASK-016 o per un task di snapping.
- In sospeso, piccoli: dichiarare `numpy` in `pyproject.toml` (lo usa già il
  motore, arriva con osmnx: nulla da installare); in fase 2, far scegliere
  all'utente fra più percorsi alternativi (la ricerca li ha già).
- La Valsugana è sospesa su richiesta dell'utente: un cuore da 15 km e un
  cerchio da 5 km lì non sono disponibili (ADR-0025).
- matplotlib non è una dipendenza: per guardare le forme basta uno script
  usa-e-getta fuori dal repository.
- Con latitudine negativa serve la forma `--start=-33.9,18.4`: argparse
  scambia `-33.9,...` per un'opzione.
- Le cartelle `apps/` e `packages/` restano vuote fino alla fase 2. È
  voluto, non è un file mancante.
- Le partenze delle tre zone sono in `docs/TESTING.md`.
- Nella versione app la partenza sarà la posizione GPS del dispositivo
  (fase 2); le zone fisse servono solo a confrontare le prove.
- Il repository è pubblico: nessun segreto nei file, mai. Le chiavi stanno
  solo in `.env`, che non entra nel repository.

---

## Come si aggiorna

A fine task, in un solo commit dentro la stessa PR:

1. Sposta il task da **In lavorazione** a **Completato**, con una riga di
   esito: cosa funziona adesso che prima non funzionava.
2. Riscrivi **Prossimo passo** con un solo task.
3. Aggiorna **In una riga**.
4. Svuota o aggiorna **Note per la prossima sessione**.

Tenere breve questo file è parte del lavoro: è quello che si paga in ogni
sessione. Lo storico sta nei commit e nelle PR, non qui. Se **Completato**
supera una decina di righe, si condensa per fase.
