# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-09-22 · **Fase corrente**: 1 — Route Engine

---

## In una riga

La CLI cerca rotazione, punto di ingresso e scala in cui le strade seguono
la forma, poi scrive il GPX: a Trento e Milano cuori e cerchi si
riconoscono alla distanza giusta, a Levico in parte, in Valsugana non con 5 km.

## Prossimo passo

Riprendere **TASK-015** dal punto "Ripresa" qui sotto: rimisurare, generare
i campioni v2, farli giudicare, allineare la documentazione, chiudere.

## In lavorazione

### TASK-015 — Ripresa (sessione interrotta il 2026-09-23 per limite d'uso)

Branch `feat/TASK-015-iterative-optimizer`. Una prima parte è già su `main`
(PR #13, mergiata come "work in progress"); il resto va in una seconda PR
dallo stesso branch. 116 test verdi, ruff e black puliti.

**Fatto e funzionante** (codice su branch):
- ottimizzatore in `optimizer.py`: conteggio delle strade per 17 partenze ×
  24 rotazioni × 4 fasi, tracciamento delle migliori, scala per secante,
  rifinitura, budget di 20 tracciamenti;
- **partenza spostabile fino a 500 m** (anelli a 250 e 500 m, 8 direzioni),
  chiesta dall'utente per non tagliare vicino alla partenza; spostarla vale
  5 punti di copertura; la CLI stampa la nuova partenza;
- **forma non disponibile** sotto somiglianza 0,60: `ShapeNotDrawableError`,
  niente GPX (per la Valsugana a 5 km);
- **metrica passata da copertura a `fit`** (soglia 0,90): i giudizi
  dell'utente (Milano `sì` con fit ≥ 0,91; Trento e Levico `quasi` con
  fit 0,71–0,85 ma copertura ≥ 0,90) mostrano che la copertura non vede il
  "pezzo tagliato";
- velocità: conteggio vettorizzato, tracciamento sul grafo di zona intero
  (niente ritaglio), campioni degli archi in cache, distanze esatte solo
  entro 1 km dalla forma;
- grafi di zona riscaricati più grandi (+500 m per la partenza spostabile)
  per trento, levico, valsugana e milano, tutti in `data/cache/`.

**Da fare, in ordine:**
1. Rimisurare i 16 casi (12 + Milano): `python tests/measure_optimizer.py`
   in `services/route-engine/`. Con il vecchio codice un caso di Trento
   durava 28 s: verificare che ora stia sotto i 30 s.
2. Campioni `TASK-015_*_v2.gpx` (`--out-dir ../../samples --tag v2`),
   righe in `samples/LOG.md`, far giudicare all'utente. Giudizi v1 già
   registrati: Milano `sì`, Trento e Levico `quasi` ("un pezzo tagliato"),
   Valsugana sospesa.
3. Documentazione da allineare: ADR-0023 e `ROUTE_ENGINE.md` §5 dicono
   ancora "copertura tenuta" (ora è `fit`); scrivere **ADR-0025**
   (partenza spostabile + forma non disponibile); `MAPS.md` con le nuove
   misure e i nuovi grafi di zona; criteri in `docs/tasks/TASK-015.md`
   (Valsugana fuori dai criteri, su richiesta dell'utente).
4. Chiudere TASK-015, seconda PR.

**Decisioni aperte per l'utente:**
- il tratto dalla posizione alla partenza spostata non entra nel GPX né
  nella distanza: confermare o chiedere di includerlo;
- dichiarare `numpy` in `pyproject.toml` (già usato direttamente, arriva
  con osmnx): serve un sì;
- PR di TASK-019 (`feat/TASK-019-sample-preview`) da mergiare; al merge,
  conflitto in `DECISIONS.md` fra ADR-0023 e ADR-0024: tenerle entrambe.

**File temporanei** (non tracciati, da cancellare a fine task):
`_samples015.png`, `_zones.py` (script di download con l'indirizzo di
Overpass raggiungibile, vedi `MAPS.md`), `_zones.log`, la cartella vuota
`.claude/worktrees/`.

### Altro

- **TASK-019** (anteprima dei campioni su mappa) implementato sul branch
  `feat/TASK-019-sample-preview`, PR da aprire e mergiare.

## Completato

- **TASK-018** — README allineato alla fase 1: stato reale e sezione
  «Provarlo» con setup e comando della CLI; CI senza impalcatura, con cache di pip.
- **TASK-017** — Zone di nodi al posto del nodo più vicino e corridoio
  attorno al contorno (ADR-0022): più corto di TASK-014 in 11 casi su 12 a
  parità di copertura. Rete a piedi con le ciclopedonali, nei due sensi:
  cuore 5 km Levico da 2,21× a 1,47×. Resta un rientro in basso al centro
  del cuore, su campi senza strade: lo risolve la rotazione (TASK-015).
- **TASK-014** — GPX sulla rete reale: grafo OSMnx con cache in
  `data/cache/`, snapping al nodo, routing con penalità, potatura degli
  speroni (ADR-0020, ADR-0021); warning di rete rada; `MAPS.md` scritto.
  Il percorso taglia ancora per l'interno invece di seguire il bordo
  (cuore 5 km Levico: tagli interni e doppio anello nel lobo destro).
- **TASK-013** — `--out` scrive un GPX 1.1 (ADR-0019); 12 campioni teorici
  (heart/circle, 5 e 15 km, tre zone) guardati in gpx.studio: tutti `sì`.
- **TASK-012** — `project_shape` mette la forma sulla mappa passando esattamente
  per la partenza; perimetro in metri entro lo 0,05% del target fino a
  50 km; formula locale al posto di `pyproj` (ADR-0018).
- **TASK-011** — `get_shape("heart")(64)` dà 64 vertici equispaziati (±0.5%)
  più la chiusura, con entrambe le punte del cuore; `n_points` conta i
  vertici (ADR-0017).
- **TASK-010** — `python -m route_engine --shape circle --distance 5000
  --start 46.0122,11.2986` stampa la richiesta; input assurdi danno un
  errore di una riga (exit 2), non un traceback.
- **TASK-001** — Repository **pubblico** su GitHub
  (`rockydalbianco/shaperoute`), `main` protetto da ruleset con Pull
  Request obbligatoria; push diretto su `main` provato e rifiutato;
  prima PR mergiata con CI verde.

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
