# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-09-22 · **Fase corrente**: 1 — Route Engine

---

## In una riga

La CLI genera circle e heart attorno alla partenza, li aggancia alla rete a
piedi reale (con le ciclopedonali) seguendo il contorno e scrive un GPX
chiuso; a scala e rotazione iniziali la distanza su strada è 1,5–3,7× il
target, perché parte della forma cade dove non ci sono strade.

## Prossimo passo

**TASK-015 — Ottimizzatore iterativo (e metrica di somiglianza).**
Il file del task non esiste ancora: va scritto e confermato prima di
iniziare. L'idea concordata: contare le strade vicine al contorno per molte
rotazioni attorno alla partenza (costa poco, niente routing), tracciare con
`snap_to_network` solo le migliori, correggere la scala in base alla
distanza reale e ripetere finché forma (copertura) e distanza (es. ±10%)
vanno bene, o restituire il migliore con un warning.

## In lavorazione

Niente.

## Completato

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
- `optimizer.py` e `metrics.py` sono vuoti apposta: si riempiono in
  TASK-015.
- Grafi `foot` in cache: solo 4 dei 12 casi (i tre cuori da 5 km e il
  cuore da 15 km a Trento). Gli altri 8 si scaricano **uno alla volta**,
  quando Overpass torna a rispondere (`MAPS.md`, "Overpass: come si
  scarica"). I 12 grafi `walk` di TASK-014 restano per i confronti.
- Per misurare una modifica allo snapping sui 12 casi:
  `python tests/measure_snapping.py` (in `services/route-engine/`);
  `--network walk` usa i grafi di TASK-014.
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
