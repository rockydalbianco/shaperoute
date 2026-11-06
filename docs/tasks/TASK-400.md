# TASK-400 — Nuoto in piscina: la vasca scelta prima di partire

**Stato**: In corso · proposta in `main` (#867); parte A (server) in
`main` (#871, cab53f51), server col sì dell'utente; parte B (app) in
`main` (#880, a178bb18; impronta iOS 6f8bba4c invariata); prossima la
parte C (post) da `feat/TASK-400-c-pool-post`;
ogni parte dopo la sua lista dei file al Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-400-pool-swim` (documenti); il codice
`feat/TASK-400-a-…`, `feat/TASK-400-b-…`
**Dipende da**: TASK-323 (nuoto in acque libere, chiuso #834), TASK-385
(palestra senza traccia: A #812, B0 #822, B #833), TASK-387 (`X-MuW-Reads`)
**ADR**: ADR-0334 (proposto) · numeri dal Coordinatore il 2026-11-05

## Obiettivo

Nello sport del nuoto si sceglie, prima di partire, **«Open water»** (come
oggi) o **«Pool»**. In piscina si sceglie la lunghezza della vasca, si avvia
il cronometro col telefono a bordo vasca, a fine nuotata si scrive quante
vasche si sono fatte: l'app mostra vasche, metri, tempo e passo/100 m, salva
in Apple Salute / Health Connect come nuoto in piscina e pubblica nel Feed un
post senza mappa, come la Palestra.

Richiesta dell'utente (2026-11-05): «Aggiungi la possibilità anche di
registrare in piscina, finché i metri della vasca prima di iniziare
l'attività». TASK-323 aveva lasciato fuori la piscina.

## Contesto da leggere

- `DECISIONS.md` ADR-0334 (questo task), ADR-0283 (nuoto in acque libere),
  ADR-0327 con le precisazioni A, B0, B, D (palestra senza traccia), ADR-0328
  (`X-MuW-Reads`), ADR-0281 (Salute)
- `apps/mobile/src/settings/sport.ts`, `apps/mobile/src/sports/swimming.ts`

## Com'è oggi (main `542a02b4`)

1. Lo sport 🏊 si chiama «Open water swim» (`settings/sport.ts`, id `swim`,
   attività `swimming`), con il percorso disegnato sull'acqua e la corsa col
   telefono nella boa (TASK-323 D).
2. In piscina il GPS non dà la distanza: servono la vasca e il numero di
   vasche.
3. Il server sa già tenere una corsa **senza traccia** (TASK-385 A:
   `runs.track` nullo, `drawings.trackless`) e l'app sa mostrarne il post
   (B0); le app che non lo sanno leggere non lo ricevono (`X-MuW-Reads`:
   `trackless`, più il valore dell'attività).
4. Le librerie in uso supportano la piscina: `@kingstinct/react-native-healthkit`
   16.2.0 (`HKMetadataKeySwimmingLocationType`, `HKMetadataKeyLapLength`) e
   `react-native-health-connect` 4.1.3 (`EXERCISE_TYPE_SWIMMING_POOL`).
   Nessuna dipendenza nuova.

## Scelte dell'utente (2026-11-05/06, una alla volta)

1. **Come si contano le vasche col solo telefono**: «Scritte alla fine». Il
   cronometro gira durante la nuotata; alla fine si scrive il numero di
   vasche, con una stima proposta dal tempo. Il conteggio automatico arriverà
   con l'Apple Watch (TASK-323 E). Scartati: un tocco grande per vasca, tutte
   e due, solo con l'orologio.
2. **Lunghezze**: «25 m, 50 m, Other». Due pulsanti e «Other» per un valore
   in metri (da 10 a 100, anche 33⅓). Niente yard per ora. L'app ricorda
   l'ultima scelta.
3. **Dove sta**: «Scelta dentro il nuoto». Resta un solo sport, che si chiama
   «Swim»; prima di partire si sceglie «Open water» o «Pool». Scartati: uno
   sport nuovo «Pool swim», uno sport nuovo senza Feed.
4. **Feed**: «Sì, come la Palestra». Post senza mappa con i numeri della
   nuotata e la solita scelta di visibilità, solo alle app che lo sanno
   leggere.
5. **Testi**: «Approvati così».

| English | it | de | fr | es |
|---|---|---|---|---|
| Swim | Nuoto | Schwimmen | Natation | Natación |
| Open water | Acque libere | Freiwasser | Eau libre | Aguas abiertas |
| Pool | Piscina | Becken | Piscine | Piscina |
| Pool length | Lunghezza vasca | Beckenlänge | Longueur du bassin | Longitud de la piscina |
| Other | Altro | Andere | Autre | Otra |
| Length in meters | Lunghezza in metri | Länge in Metern | Longueur en mètres | Longitud en metros |
| Start swim | Inizia a nuotare | Schwimmen starten | Commencer la nage | Empezar a nadar |
| How many lengths? | Quante vasche? | Wie viele Bahnen? | Combien de longueurs ? | ¿Cuántos largos? |
| Lengths | Vasche | Bahnen | Longueurs | Largos |
| Pool swim | Nuoto in piscina | Schwimmen im Becken | Nage en piscine | Natación en piscina |
| Pace /100 m | Passo /100 m | Tempo /100 m | Allure /100 m | Ritmo /100 m |

«Swim without a route» resta il pulsante delle acque libere.

## Cosa fare

Le parti e i loro confini sono in ADR-0334. Ogni parte parte dalla sua lista
dei file mandata al Coordinatore.

1. **Parte A — server e contratto.** `PUT /me/pool-swims/{key}`: una corsa
   `swimming` senza traccia, `distance_m` = vasche × vasca; tabella
   `pool_swims` (vasca, vasche) con il numero di migrazione libero al
   merge; valore `pool` in `X-MuW-Reads` (`reads.json`); i campi nei tipi di
   `shared-types`. Server col sì dell'utente.
2. **Parte B — l'app registra.** In «Draw», con lo sport «Swim», la scelta
   «Open water / Pool»; in piscina la vasca (25 m, 50 m, Other) e «Start
   swim»; la schermata con il tempo; a fine nuotata «How many lengths?» con
   la stima; vasche, metri, tempo e passo/100 m; salvataggio in «My
   activities» e in Salute come nuoto in piscina con la vasca. Il nome dello
   sport passa a «Swim».
3. **Parte C — il post.** Il post senza mappa con vasche, metri, tempo e
   passo/100 m, nel Feed e nell'immagine condivisa, come quello della
   Palestra (TASK-385 D).

## Criteri di accettazione

- [x] Con lo sport «Swim», «Draw» offre «Open water» e «Pool»; «Open water»
      funziona come prima. (B, `pool/PoolDraw.test.tsx`)
- [x] In «Pool» si sceglie 25 m, 50 m o un valore da 10 a 100 m; un valore
      fuori resta non valido; l'ultima scelta torna la volta dopo. (B)
- [x] A fine nuotata si scrivono le vasche (con la stima proposta); metri =
      vasche × vasca; passo/100 m = tempo × 100 / metri. (B,
      `pool/poolSwim.test.ts`, `pool/PoolSwimHost.test.tsx`)
- [x] Il nuoto in piscina va in Apple Salute come nuoto in piscina con la
      vasca, e in Health Connect come `SWIMMING_POOL`. (B) **Limite**: in
      Apple Salute va come nuoto in piscina con i metri ma **senza la
      lunghezza della vasca**: `HKMetadataKeyLapLength` vuole un
      `HKQuantity`, che `@kingstinct/react-native-healthkit` 16.2.0 non
      sa passare nei metadati (arriverebbe un dizionario e il salvataggio
      fallirebbe). ADR-0334, precisazione B, punto 5; accettato dal
      Coordinatore il 2026-11-06.
- [ ] Il post senza mappa arriva solo alle app che mandano `pool` e
      `trackless` in `X-MuW-Reads`.
- [ ] Test deterministici per il calcolo, la scelta della vasca, l'header e
      l'endpoint; tsc, lint, Prettier verdi.

## File toccati

Questa PR (documenti):

```
docs/tasks/TASK-400.md
docs/DECISIONS.md
docs/STATUS.md
```

Parte A (approvata dal Coordinatore il 2026-11-06; `reads.py`,
`reads.json` e `test_reads.py` solo dopo TASK-378 A):

```
services/api/migrations/0053_pool_swims.sql
services/api/shaperoute_api/pool_swims.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/reads.py
services/api/tests/test_pool_swims.py
services/api/tests/test_reads.py
packages/shared-types/src/poolSwim.ts
packages/shared-types/src/index.ts
packages/shared-types/fixtures/pool-swim.json
packages/shared-types/fixtures/reads.json
packages/shared-types/test/poolSwim.test.ts
docs/API.md
docs/DATABASE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-400.md
```

Parte B (approvata dal Coordinatore il 2026-11-06; gli ultimi tre test
segnalati dopo, perché cambiano col nome o con `pool` in `this_app`):

```
apps/mobile/App.tsx
apps/mobile/src/pool/*.ts, *.tsx (nuovi: poolSwim, poolChoice, poolStore,
  usePoolSwim, poolOutbox, usePoolOutbox, poolHealth, PoolDraw,
  PoolSwimScreen, PoolSwimEnd, PoolSwimHost, PoolTile e i loro test)
apps/mobile/src/api/poolSwims.ts, poolSwims.test.ts (nuovi)
apps/mobile/src/api/reads.ts, reads.test.ts
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/sports/swimming.ts
apps/mobile/src/health/workout.ts, appleWorkout.ts, healthConnectWorkout.ts
apps/mobile/src/i18n/it.ts, de.ts, fr.ts, es.ts
apps/mobile/src/settings/sport.test.ts, SportButton.test.tsx,
  sportRows.test.ts, SportSetting.test.tsx, SportStoreBuild.test.tsx,
  SportVoiceItalian.test.tsx
apps/mobile/src/navigation/swim.test.ts
apps/mobile/src/sports/sportProfiles.test.ts, activityName.test.ts
packages/shared-types/fixtures/reads.json
services/api/tests/test_reads.py, test_pool_swims.py
apps/mobile/src/api/accounts.test.ts
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json
  (solo da scripts/watch-sports.sh; file di TASK-370)
apps/mobile/targets/watch/{en,it,de,fr,es}.lproj/Localizable.strings
  (solo da scripts/watch-texts.sh; file di TASK-370)
docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-400.md
```

**Per la parte C** (il post): il nuoto si salva con `usePoolOutbox`
(`pool/usePoolOutbox.ts`), che oggi non manda un disegno; il post va come
quello della palestra (`gym/useGymOutbox.ts`, `drawing` nel file dei nuoti
in attesa e `keepForDrawing` dopo il `PUT`), con `activity: "swimming"` e
`GET /drawings/{id}/pool-swim` per vasca e vasche. La tessera 🏊 di «My
activities» è `pool/PoolTile.tsx`; un nuoto in piscina si riconosce con
`isPoolSwimRun`. La riga mostra la distanza in km come ogni corsa.

La parte C: lista dei file al Coordinatore prima del codice. Nella
lista della B (indicazione del Coordinatore, 2026-11-06) entrano anche
`packages/shared-types/fixtures/reads.json` (`pool` in `this_app`, con
`apps/mobile/src/api/reads.ts` e il suo test) e `apps/mobile/src/i18n/`
per i testi approvati qui sopra. Per la B: l'API è `PUT
/me/pool-swims/{key}` (`shared-types/src/poolSwim.ts`), il disegno si
pubblica con `activity: "swimming"`, e oltre 2,5 m/s l'API risponde
`422`, quindi il telefono lo controlla prima.
`settings/sport.ts` è condiviso con TASK-376 B3c e TASK-377 B;
`health/appleWorkout.ts` e `healthConnectWorkout.ts` con TASK-374 C, 345 C
e 397 C (1.0.2): dove basta, si passa dal profilo dello sport
(`sports/swimming.ts`).
