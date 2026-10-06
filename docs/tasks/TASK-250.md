# TASK-250 — Il Lago di Ledro, e i sette laghi scartati dall'elenco di «Paddle»

**Stato**: Done (2026-10-06) — l'acqua di Ledro è sul server; la
pubblicazione è del coordinatore.
**Fase**: 4 · **Branch**: `feat/TASK-250-ledro-lake`
**Dipende da**: TASK-233 (l'elenco dei laghi, `lake_catalog.py`), TASK-225
(l'acqua da un estratto)

## Obiettivo

Seguito di TASK-233, chiesto dall'utente il 2026-10-06: «il Lago di Ledro e
i sette laghi scartati dall'elenco di «Paddle»». Alla fine il Lago di Ledro
è nell'elenco dei laghi di «Explore» con «Paddle», e di ognuno dei sette
laghi che il motore aveva scartato si sa perché, e se si può recuperare.

## Confini dati dal coordinatore

- Ledro entra **senza toccare il motore**, se si può: un cambio di
  `route_engine` vuol dire un altro aggiornamento del server e il ridisegno
  degli esempi (`AGENTI.md`, punto 11).
- Dei sette scartati si dice all'utente quali si recuperano e quali no, e
  perché, **prima di cambiare una regola**.
- L'acqua dei laghi nuovi va sul server con l'ok dell'utente, come per le
  spiagge (TASK-245).

## Contesto da leggere

- `docs/tasks/TASK-233.md`, «Esito» (come è fatto l'elenco, i sette nomi)
- `docs/MAPS.md`, «L'acqua da un estratto» e «I laghi di Explore»
- `services/api/shaperoute_api/lake_catalog.py`
- `services/route-engine/route_engine/water.py`: `is_lake`, `build_area`
  (solo da leggere)

## Cosa fare

1. Capire perché Ledro è fuori e perché il motore scarta i sette, provando
   il motore sull'acqua vera di TASK-233 (`out/task233-lakes/`).
2. Far entrare Ledro nell'elenco senza cambiare il motore.
3. L'acqua di Ledro dall'estratto dell'Italia, provata con il motore sul
   Mac; i suoi punti in `lakes.json`.
4. Il comando dice di ogni lago lasciato fuori il motivo.
5. Con l'ok dell'utente e del coordinatore: il file d'acqua di Ledro sul
   server, poi la pubblicazione dell'app.

## Criteri di accettazione

- [x] Uno stagno con un nome da lago è un lago dell'elenco; uno stagno con
      un altro nome no (test).
- [x] Il motore pagaia su uno stagno dell'elenco solo dopo che il comando
      lo ha scritto come lago nel file d'acqua; il file dice ancora che
      cosa segna la mappa (test).
- [x] Rifatto due volte, il passo non cambia più niente; un file senza
      quello stagno non è riscritto (test).
- [x] Il comando dice perché un lago resta fuori (test).
- [x] `lakes.json` ha il Lago di Ledro, con i punti provati dal motore
      sull'acqua vera: cuore, cerchio e stella alla distanza scritta.
- [x] Gli altri laghi dell'elenco non cambiano; il motore non cambia;
      niente server, niente pubblicazione in questa PR.

## File toccati

- `services/api/shaperoute_api/lake_catalog.py`
- `services/api/tests/test_lake_catalog.py`
- `apps/mobile/src/paddle/lakes.json` (le righe del Lago di Ledro)
- `docs/tasks/TASK-250.md` (nuovo), `docs/MAPS.md` («I laghi di Explore»),
  `docs/DECISIONS.md` (l'ADR di questo task), `docs/STATUS.md` (solo le
  righe di questo task)

Il motore (`services/route-engine/`), `water_extract.py`, `waterSpots.ts` e
il resto dell'app non cambiano.

## Fuori scope

- Cambiare `water.is_lake` nel motore: sarebbe la regola più pulita (uno
  stagno con un nome da lago è un lago anche in un download), ma costa un
  aggiornamento del server con il ridisegno. Annotato nell'ADR come strada
  per dopo, insieme a un altro cambio del motore.
- Correggere OpenStreetMap (riportare Ledro a `water=lake`): è la cura
  vera, ma è una modifica pubblica fatta con un account di qualcuno. Da
  proporre all'utente.
- Le regole del motore che tengono fuori i sette (la riva a 40 m da una
  via, la forma a 300 m da quella riva) e quella dell'elenco (cuore,
  cerchio e stella tutti e tre).
- I laghi dell'elenco che la mappa segna `boat=no` o `access=private`
  (trovati guardando i dati, vedi «Esito»): toglierli è una scelta di
  prodotto.
- Rifare l'elenco intero: si aggiungono solo le righe di Ledro, dallo
  stesso estratto di TASK-233.

## Esito

### 2026-10-06

**Perché Ledro era fuori.** In OpenStreetMap il Lago di Ledro (relazione
1400447) è `water=pond` dal 2023 (versioni 17–19; dal 2016 al 2022 era
`water=lake`). Il motore pagaia solo su `natural=water` senza `water` o
con `lake`/`reservoir`, e su uno stagno risponde «there is no lake or sea
to paddle on». In Italia gli stagni sopra 10 ha sono 32, quasi tutti
stagni veri della Sardegna e della Sicilia; sei hanno un nome da lago, e
solo Ledro è largo abbastanza per una forma.

**Fatto** (ADR-0214), senza toccare il motore:

- `lake_catalog.py`: uno stagno con un nome da lago è un lago dell'elenco
  (`named_pond`); `--ponds` lo riscrive come `water=lake` nei file d'acqua
  di una cartella, tenendo `water:osm=pond`, solo dove c'è e una volta
  sola; di ogni lago lasciato fuori il comando dice il motivo del motore.
- L'acqua di Ledro dall'estratto dell'Italia di TASK-233 (lo stesso
  `cuts.py` di `out/task233-lakes/scripts/`): un file nuovo,
  `water_45.84170_10.69460_45.91630_10.81050.json`, 0,5 MB, 985 elementi.
- `lakes.json`: due punti del Lago di Ledro, a 2 km. Dai due punti **tutte
  e otto le forme** di «Explore» ci stanno (16 su 16, 0,3–2 s l'una).
  Campioni in `out/task250-ledro/samples-1.html`, fuori dal repository.
- Il file del Garda di TASK-233
  (`water_45.41050_10.46120_45.92020_10.91900.json`) contiene anche Ledro e
  serve le richieste da 3 a 5 km da Ledro: senza riscriverlo, da 3 km in
  su Ledro dice «no lake» (10 su 16 a 3 km). Riscritto con `--ponds`, 14
  su 16 a 3 km; e i percorsi del Garda vicino a Ledro restano gli stessi,
  punto per punto: 192 su 192 (12 punti del Garda entro 15 km, otto
  forme, 2 e 5 km).

I due file pronti per il server sono in `out/task250-ledro/cache-both/water/`
(sha256 di Ledro `9ddd02ce…2e99`, del Garda riscritto `e23dd41a…7e5`; il
Garda di prima era `528bc4ec…302e`).

**I sette laghi scartati da TASK-233.** Provati di nuovo, anche partendo
dai loro punti della riva raggiungibili a piedi:

| Lago | Dove | Perché resta fuori |
|---|---|---|
| Griessee | Passo del Gries, 2386 m, sul confine svizzero | nessuna via, spiaggia o scivolo a meno di 40 m dalla riva nei dati |
| Lago Salarno | Adamello, bacino a 2070 m | nessuna via, spiaggia o scivolo a meno di 40 m dalla riva nei dati |
| Lago Sciaguana | Sicilia, Enna | nessuna via, spiaggia o scivolo a meno di 40 m dalla riva nei dati |
| Lago dell'Esaro | Calabria, Cosenza | nessuna via, spiaggia o scivolo a meno di 40 m dalla riva nei dati |
| Lago di Castelnuovo | Toscana, Valdarno; `boat=no` | nessuna via, spiaggia o scivolo a meno di 40 m dalla riva nei dati |
| Lago di Sant'Anna | Calabria, Crotone | nessuna via, spiaggia o scivolo a meno di 40 m dalla riva nei dati |
| Lago di Gannano | Basilicata | la riva si raggiunge, ma a 1 km ci sta solo la stella: il cuore non ci sta (0,7 km), il cerchio resta a più di 300 m da una riva raggiungibile |

Recuperarli vuol dire cambiare una regola del motore (le vie a 40 m dalla
riva, la forma a 300 m da quella riva) o dell'elenco (cuore, cerchio e
stella tutti e tre): fuori scope, e per sei laghi su sette i dati non
hanno nemmeno un sentiero alla riva. Non proposto.

**Trovato guardando i dati**: cinque laghi dell'elenco sono segnati
`boat=no` o `access=private` in OpenStreetMap (Laghetto del Frassino, Lago
di Vico, Lago di Montimannu, Lago di Place Moulin: `boat=no`; Lago Grande:
`access=private`). Restano: se toglierli è una scelta dell'utente.

**L'acqua sul server** (2026-10-06, 10:22 ora del server; ok dell'utente
nella sessione del task, «via» del coordinatore): prima lo SHA del file del
Garda sul server, uguale a quello del Mac (`528bc4ec…`); poi il vecchio
copiato in `data/cache/water/before-task250/`, i due file nuovi caricati
come temporanei nascosti nella stessa cartella, controllati (SHA), 10001
e 644, e messi al loro posto con `mv`. Nessun riavvio. La cartella ha 248
file d'acqua. Provato dentro il container, dall'API: un cuore da 2 km in
canoa da Riva del Garda, 200 in 4,1 s (2006 m), e da Ledro
(`45.87763, 10.74626`), 200 in 1,1 s (2009 m).

**Seguiti**:

1. La pubblicazione dell'app, del coordinatore; la prova di Ledro
   sull'iPhone è dell'utente.
2. Proposta all'utente: riportare Ledro a `water=lake` in OpenStreetMap
   (una modifica pubblica, con un suo account).
