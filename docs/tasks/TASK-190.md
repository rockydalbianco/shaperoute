# TASK-190 — Percorsi in bici

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-190-bike-routes`
**Dipende da**: TASK-189 («Sport» in «Settings»: la riga «Bike» da
accendere), TASK-177 (la pagina «Settings»)

## Obiettivo

Chi sceglie «Bike» riceve un percorso che disegna la forma su strade da
bici, fra 10 e 30 km. Chiesto dall'utente il 2026-10-02: «inizia un'altra
task per cominciare anche per la bici, che non è difficilissimo».

## Scelte dell'utente (2026-10-02)

- **Distanze: 10–30 km**, come primo passo. Distanze più lunghe sono un
  task successivo (zone di mappa più grandi, attese più lunghe).
- In «Settings» la riga «Bike» resta «Soon» finché questo task non è
  finito (ADR-0152).

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §4 (la rete filtrata per l'attività), §6
- `docs/MAPS.md` «Sorgente», «Cache», «Area scaricata», «Zone scaricate
  prima»
- `docs/DECISIONS.md` ADR-0008, ADR-0022 (la rete `foot`), ADR-0023,
  ADR-0119 (le zone), ADR-0152
- `docs/API.md`: la richiesta di percorso e il campo `activity`
- `services/route-engine/route_engine/network.py` (`FOOT_FILTER`),
  `models.py` (`SUPPORTED_ACTIVITIES`, `check_activity`), `validation.py`
- `packages/shared-types/src/index.ts` (`ACTIVITIES`)
- `apps/mobile/src/settings/sport.ts`

## Cosa fare

Il contratto ha già il posto: la richiesta porta `activity`, che oggi
vale solo `"running"`. **Non si aggiunge un campo `sport`**: si aggiunge
il valore `"cycling"` ad `activity`, e l'app traduce «Bike» in
`"cycling"`.

Il task è da fare in tre PR, in quest'ordine (se il coordinatore
preferisce, tre task: i numeri li dà lui).

**A. Route Engine**

1. Una rete per la bici accanto a `FOOT_FILTER`: strade dove si pedala
   (ciclabili, strade minori e secondarie), senza scale, sentieri e
   marciapiedi, senza strade vietate alle bici e senza `trunk` e
   autostrade. Il filtro esatto va deciso sui dati e scritto in un ADR
   (ADR-0153), con le misure di due zone (una città, una valle).
2. I sensi unici: a piedi non valgono (`network_type="walk"`), in bici
   sì, tranne dove OSM dice il contrario (`oneway:bicycle=no`,
   `cycleway=opposite`). Decidere e scrivere nell'ADR: un percorso
   contromano non è accettabile.
3. La rete della bici ha la sua cache, separata da quella a piedi
   (un grafo `foot` non serve una richiesta `cycling`, né il contrario).
4. `SUPPORTED_ACTIVITIES` con `"cycling"`; i limiti di distanza per
   attività (10–30 km per la bici); la validazione di §6 rivista per la
   bici (cosa è un avviso in bici: strade principali, sterrato; le scale
   non devono esserci).
5. La CLI accetta `--activity cycling`. Campioni in `samples/` per il
   giudizio a occhio: cuore, cerchio e stella a 10, 20 e 30 km a Trento e
   in una città di pianura.

**B. API**

6. `activity: "cycling"` nelle richieste di percorso (`/route-jobs`,
   `/routes`) e in `shared-types`; l'errore per una distanza fuori dai
   limiti dell'attività; i percorsi tenuti (`route_store.py`) distinguono
   già per `activity`: controllarlo con un test.
7. Le zone scaricate prima (`prefetch_zones.py`): quali città hanno la
   rete della bici, e quanto è grande il riquadro che serve a 30 km.
   **Da misurare prima di promettere i tempi**: se il riquadro di oggi
   (17 × 17 km) non basta, dirlo al coordinatore prima di scaricare.

**C. App**

8. `ready: true` per «Bike» in `sport.ts`; «Draw» manda `activity` secondo
   lo sport scelto e propone le distanze della bici; i testi che dicono
   «run» dove lo sport è la bici.
9. Cosa cambia in «Explore», «Feed» e nella schermata della corsa con la
   bici scelta **è una scelta di prodotto**: proporla all'utente prima di
   toccarle (vedi «Domande aperte»).

## Criteri di accettazione

- [ ] Dalla CLI, senza rete e senza chiavi, sulle fixture: un percorso
      `cycling` chiuso, che non passa su scale né su vie vietate alle
      bici e rispetta i sensi unici.
- [ ] Una richiesta `cycling` sotto 10 km o sopra 30 km è un errore che
      dice i limiti; una `running` si comporta come prima (i test di oggi
      restano verdi senza modifiche ai valori attesi).
- [ ] La cache a piedi di una zona non viene usata per la bici.
- [ ] Campioni in `samples/` giudicati dall'utente.
- [ ] Nell'app, con «Bike» scelto, «Draw» chiede un percorso `cycling`
      fra 10 e 30 km; con «Run» tutto è come prima.
- [ ] Test deterministici per motore, API e app.

## File toccati

Elenco previsto; ogni PR dichiara i suoi.

```
services/route-engine/route_engine/network.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/validation.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/prefetch_zones.py
services/api/tests/
packages/shared-types/src/index.ts
apps/mobile/src/settings/sport.ts
apps/mobile/App.tsx
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-190.md
```

## Fuori scope

- Distanze oltre i 30 km.
- Dislivello e superficie (bici da corsa contro mountain bike): una rete
  sola, per ora.
- La voce che guida e il punteggio a fine giro pensati per la bici
  (velocità diverse): restano quelli della corsa finché l'utente non
  chiede altro.
- La canoa: TASK-191.
- Nessuna dipendenza nuova: OSMnx fa già tutto quello che serve.

## Domande aperte per l'utente

Una per volta, con una proposta, quando si arriva alla parte C:

1. Con «Bike» scelto, «Explore» e «Feed» mostrano solo percorsi da bici,
   o tutti con un segno dello sport? (Oggi il catalogo ha solo corse.)
2. Durante un giro in bici, la schermata della corsa resta uguale (ritmo
   al km) o mostra la velocità in km/h?

## Esito

*(si compila a fine task)*
