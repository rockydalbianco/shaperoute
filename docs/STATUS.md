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

**TASK-016** sul branch `feat/TASK-016-validation`: codice, campioni
`TASK-016_*_v1` e documentazione pronti; manca il giudizio a occhio
dell'utente sui campioni (righe in `samples/LOG.md`, "da guardare"), poi si
chiude con la seconda PR (la prima, #17, è già su `main` come "work in
progress").

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
