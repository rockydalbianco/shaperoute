# TASK-230 — L'acqua da Overpass con i laghi multipoligono

**Stato**: In corso (PR aperta, aspetta la CI)
**Fase**: 4 · **Branch**: `fix/TASK-230-water-relations`
**Dipende da**: TASK-191 (l'acqua nel motore), TASK-225 (dove è stato
trovato), TASK-214 B (lo zip del motore nell'app, #282)

## Obiettivo

Un lago disegnato in OpenStreetMap come multipoligono deve arrivare
intero anche quando l'acqua si scarica da Overpass. Oggi `WATER_QUERY`
chiede `out tags geom`, e a quel livello Overpass scrive di una relazione
solo l'id e i tag, non i membri: il Garda, il Lago di Como, l'Idroscalo
non hanno forma, e una partenza lì risponde «there is no lake or sea».

## Il problema (trovato da TASK-225, 2026-10-04)

Overpass ha di nuovo risposto al server: un cuore a Milano ha scaricato
l'acqua in 184 s, ed era la prima risposta vera alla query. Il confronto
sullo stesso riquadro con `water_extract`, che legge un estratto osmium:

- estratto: 1931 elementi;
- Overpass: 1932 elementi, 1921 identici;
- in più su Overpass una via `residential` più nuova dell'estratto;
- le 10 differenze sono tutte relazioni (`natural=water`: laghi, stagni,
  canali, una vasca), che Overpass dà con `members` vuoti.

I quattro luoghi della canoa non ne soffrono: i loro file vengono
dall'estratto (TASK-225, ADR-0187).

## Contesto da leggere

- `services/route-engine/route_engine/water.py` (`WATER_QUERY`,
  `compact`, `OverpassWaterSource`)
- `docs/tasks/TASK-225.md`, «Esito», «Overpass ha risposto al server»
- `docs/DECISIONS.md` ADR-0154, ADR-0187
- `tools/phone_engine/phone_engine.py` (lo zip del motore)

## Cosa fare

1. La query con `out body geom`, che scrive i membri delle relazioni con
   la loro geometria.
2. Un test deterministico con una risposta finta di Overpass che contiene
   un multipoligono.
3. Corsa, bici e forme identiche, con le impronte qui sotto.
4. Rifare lo zip del motore del telefono (`python
   tools/phone_engine/phone_engine.py engine`) e committarlo.

## Criteri di accettazione

- [x] Un lago multipoligono scaricato da Overpass arriva con i suoi
      membri, e un percorso sopra è quello di prima (test).
- [x] Con la query di prima il lago si perdeva: il test lo mostra.
- [x] Corsa, bici e forme identiche: le impronte fissate dai test non
      cambiano.
- [x] Lo zip del motore dell'app è quello del codice
      (`tools/phone_engine/test_phone_engine.py` verde).

## File toccati

- `services/route-engine/route_engine/water.py`
- `services/route-engine/tests/test_water.py` (la riga che leggeva `out
  tags geom`)
- `services/route-engine/tests/test_water_relations.py` (nuovo)
- `services/api/shaperoute_api/water_extract.py` (solo la docstring)
- `apps/mobile/assets/engine/engine.zip` (rifatto)
- `docs/tasks/TASK-230.md` (nuovo)
- `docs/MAPS.md` (la voce dell'acqua in «Cache»)
- `docs/DECISIONS.md` (ADR-0192, solo aggiunta)
- `docs/STATUS.md` (solo le righe di questo task)

## Fuori scope

- Il server: nessun aggiornamento qui. I file d'acqua che ha già vengono
  dall'estratto e restano buoni.
- La query delle vie con nome (`network.py`, anche lei `out tags geom`):
  chiede solo vie, che a quel livello hanno già la geometria.

## Esito

### 2026-10-04

**Fatto** (ADR-0192):

- `water.py`: `WATER_QUERY` finisce con `out body geom;`. Overpass scrive
  così di ogni relazione i membri con la loro geometria, e di ogni via
  anche gli id dei nodi, che `compact` non tiene. I file della cache
  restano nel formato di prima: tipo, id, tag e geometria.
- `tests/test_water_relations.py`, 4 test, senza rete. Un Overpass finto
  risponde come quello vero al livello che la query chiede: con `tags` le
  relazioni non hanno membri, da `body` in su sì. Il lago delle fixture
  è una relazione di due vie esterne e una interna.
  - Scaricato, il lago arriva con i tre membri e la loro geometria.
  - Il cuore da 2 km sul lago scaricato è quello sul file della fixture,
    `1aff621a6cf076da`, l'impronta fissata prima.
  - Con la query di prima la relazione arriva senza membri, e la
    richiesta risponde `NoWaterError`.
- `test_water.py`: la query finisce con `out body geom;`.
- Lo zip del motore dell'app rifatto: 0,6 MB, il test dello zip è verde.
- Test: motore 1227 verdi (`-m "not network"`); API `test_paddling.py` e
  `test_water_extract.py` 39 verdi; `tools/phone_engine` 9 verdi; `ruff`
  e `black` puliti.

**Corsa, bici e forme identiche.** `WATER_QUERY` la usa solo
`OverpassWaterSource` quando manca un file d'acqua, cioè solo la canoa.
I test che fissano i percorsi passano senza modifiche:

- corsa, `test_kept_per_graph.py`: griglia cuore 5 km `3df8155c69e599f7`;
  Levico cuore 2 km `fe1ece7d303c7430` e `c252f402c7b05d09`; città CIAO 12 km
  `ab7b0837f088a672`, a penna alzata `8faf66cd46b5c9c9`; cerchio 10 km
  `96eb22388f95078e`; cuore 8 km `c067fe3f0daeb6e4`; stella 5 km
  `6cd503112eada568`;
- canoa, `test_bike_on_foot.py`: costa cuore `6f7628cc8ed91f7e`, cerchio
  `692bedbb0dc0e5ce`, stella `d601df8505be23a0`; lago cuore
  `1aff621a6cf076da`, cerchio `239047fc75b4f66b`, stella
  `6c4fa0766c572559`.

La bici non ha un'impronta fissata, ma non arriva mai a `WATER_QUERY`:
fra i moduli del motore importano `water.py` solo `paddling.py`,
`water_fit.py`, `validation.py` (i controlli sull'acqua) e la riga di
comando.

**L'impronta del motore cambia**: da `eedd1acfe61b` (`main` a `e54cb1e`) a
`255b41f9fd7a`.

## Note per il deploy

- L'impronta del motore cambia, quindi dopo l'aggiornamento del server
  gli esempi tenuti non valgono più: va rilanciato `draw_examples`
  (`AGENTI.md` regola 11), con l'ok dell'utente. Ci vorrebbe comunque, per
  gli altri cambi del motore in `main` dopo `7098cb9`.
- Niente da migrare e nessuna variabile nuova.
- I file di `data/cache/water/` sul server vengono dall'estratto (TASK-225)
  e hanno già i membri: restano buoni. Un file scritto da Overpass con la
  query di prima perderebbe i laghi multipoligono, ma sul server non ce
  n'è nessuno: quello di Milano è già stato sostituito.
- Lo zip del motore va con la prossima pubblicazione dell'app. Se la #284
  (TASK-223 A) entra dopo, rifà lei lo zip.
