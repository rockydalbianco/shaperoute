# TASK-133 — La cache delle zone a prova di interruzione

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-133-safe-cache-writes`

Task di miglioramento generale scelto dall'agente su delega dell'utente
(«inizia una task per conto tuo di miglioramento generale», 2026-10-01).

## Obiettivo

Un file della cache delle zone (GraphML, pickle, vie con nome) si trova
sotto il suo nome solo quando è scritto per intero: un'API o uno script
fermati a metà scrittura non lasciano un file rotto che fa fallire ogni
percorso della zona.

## Contesto da leggere

- `docs/MAPS.md`, «Cache» (il GraphML è il formato di riferimento, il
  pickle una copia che fa solo risparmiare tempo).
- `services/route-engine/route_engine/network.py`: `OsmnxSource.load`,
  `read_graph`, `_write_graph`, `write_named_roads`.

## Il problema

Oggi `_write_graph`, `read_graph` e `write_named_roads` scrivono
direttamente sul nome definitivo. Un GraphML di zona pesa 50–120 MB e si
scrive in secondi: un Ctrl+C sull'API, un riavvio o un processo ucciso in
quel momento lasciano un file a metà.

- **GraphML a metà**: `covering_path` lo trova (il nome è giusto),
  `ox.load_graphml` fallisce, e ogni richiesta che cade in quella zona
  fallisce, finché qualcuno non cancella il file a mano.
- **Pickle a metà**: è più recente del GraphML, quindi `read_graph` lo
  legge, `pickle.load` fallisce, e la zona è persa allo stesso modo, anche
  se il GraphML accanto è buono.
- **Vie con nome a metà**: `json.loads` fallisce dentro
  `ZoneGraphs.named_roads`, e il percorso finisce in `engine_error`.

Lo stesso succede se due processi (l'API e lo script del catalogo)
scrivono lo stesso pickle insieme.

## Cosa fare

1. Test deterministici che riproducono le tre interruzioni (una scrittura
   che si ferma a metà) e un pickle rotto accanto a un GraphML buono:
   devono fallire su `main`.
2. In `network.py`, ogni file della cache si scrive su un nome temporaneo
   accanto (che nessuna ricerca della cache trova) e prende il suo nome con
   `os.replace` solo quando è completo. Un'interruzione toglie il file
   temporaneo.
3. Un pickle che non si legge non ferma la zona: si legge il GraphML e si
   riscrive il pickle. Un pickle che non si riesce a scrivere (disco pieno,
   cartella in sola lettura) non fa fallire il caricamento: è solo una
   copia veloce.
4. ADR, `MAPS.md` (cache), `STATUS.md`.

## Criteri di accettazione

- [x] Un GraphML, un pickle o un file di vie con nome interrotti a metà
      non lasciano nulla sotto il nome della cache, né file temporanei.
- [x] Un file temporaneo rimasto da un processo ucciso (che non può fare
      pulizia) non è trovato da `covering_path` né dalla ricerca dei file
      delle vie con nome.
- [x] Un pickle rotto e più recente del GraphML: `read_graph` dà il grafo
      del GraphML e riscrive un pickle buono.
- [x] Un pickle che non si scrive: `read_graph` dà comunque il grafo.
- [x] I test esistenti di motore e API restano verdi; ruff e black puliti.

## File toccati

```
services/route-engine/route_engine/network.py
services/route-engine/tests/test_cache_writes.py   (nuovo)
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-133.md
```

## Fuori scope

- Riparare o riscaricare da solo un GraphML già rotto prima di questo
  task: il GraphML è il formato di riferimento, e cancellarlo è una scelta
  che spetta a chi guarda la cache.
- La dimensione della cache (36 GB su questo Mac, soprattutto ritagli
  salvati dallo script del catalogo) e una pulizia dei ritagli.
- Le scritture fuori dalla cache (GPX della CLI, campioni del catalogo,
  log delle richieste).

## Esito

Fatto (ADR-0104): `_whole` in `network.py` scrive GraphML, pickle e vie
con nome su un `.<nome>.<cifre>.part` accanto e li rinomina solo quando
sono interi; un pickle illeggibile cede al GraphML, uno che non si scrive
non ferma il caricamento. 6 test nuovi in `test_cache_writes.py`, tutti
rossi su `main` prima della correzione; motore 902 e API 261 test verdi.
Sul Mac nessuno dei 355 GraphML in cache era rotto: è prevenzione.
Rimandati (in «Fuori scope»): riparare un GraphML già rotto e la
dimensione della cache, 36 GB sul Mac.
