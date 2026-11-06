# TASK-400 — Nuoto in piscina: la vasca scelta prima di partire

**Stato**: In corso · proposta e scelte dell'utente in questa PR; il codice
dopo, una parte alla volta, ognuna con la sua lista dei file al Coordinatore
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

- [ ] Con lo sport «Swim», «Draw» offre «Open water» e «Pool»; «Open water»
      funziona come prima.
- [ ] In «Pool» si sceglie 25 m, 50 m o un valore da 10 a 100 m; un valore
      fuori resta non valido; l'ultima scelta torna la volta dopo.
- [ ] A fine nuotata si scrivono le vasche (con la stima proposta); metri =
      vasche × vasca; passo/100 m = tempo × 100 / metri.
- [ ] Il nuoto in piscina va in Apple Salute come nuoto in piscina con la
      vasca, e in Health Connect come `SWIMMING_POOL`.
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

Le parti A, B e C: lista dei file al Coordinatore prima del codice.
`settings/sport.ts` è condiviso con TASK-376 B3c e TASK-377 B;
`health/appleWorkout.ts` e `healthConnectWorkout.ts` con TASK-374 C, 345 C
e 397 C (1.0.2): dove basta, si passa dal profilo dello sport
(`sports/swimming.ts`).
