# TASK-217 — La voce confronta ogni km col precedente

**Stato**: Done (2026-10-05) — PR #308, merge `f811e3a`. Solo app: esce
con la prossima pubblicazione. Le frasi in tedesco, spagnolo e francese
e, in bici, «stessa velocità» confermate dall'utente il 2026-10-05.
**Fase**: 4 · **Branch**: `feat/TASK-217-km-compare-voice`
**Dipende da**: TASK-209 (la voce in cinque lingue, `src/voice/`, PR
#259), TASK-206 C (tocca gli stessi file della voce)

## Obiettivo

A ogni km la voce dice anche se quel km è andato meglio o peggio del km
precedente, e di quanti secondi. Chiesto dall'utente il 2026-10-03: «ad
ogni km di' anche se ha fatto meglio o peggio rispetto al km precedente».

## Scelta dell'utente (2026-10-03)

Proposta scelta fra tre (le altre: dire anche il tempo del singolo km;
«più veloce / più lento» senza i secondi). Dopo la frase di ogni km che
c'è già («Un chilometro. Tempo: … Passo medio: … al chilometro.»):

| Caso | Italiano | Inglese |
|---|---|---|
| più veloce | «Questo chilometro: 12 secondi meglio del precedente.» | «12 seconds faster than the last kilometre.» |
| più lento | «Questo chilometro: 8 secondi peggio del precedente.» | «8 seconds slower than the last kilometre.» |
| entro 2 s | «Stesso passo del chilometro precedente.» | «Same pace as the last kilometre.» |

Al **primo km niente**: non c'è un km prima. Un secondo solo: «1
secondo» / «1 second» (le forme di `seconds` del `Phrasebook`).

## Contesto da leggere

- `docs/UI.md`, «La navigazione» e «Correre senza percorso» (la voce dei
  km), «La voce della corsa» (TASK-209)
- `docs/tasks/TASK-209.md` (`Phrasebook`, `voiceWords`, le tabelle)
- `docs/tasks/TASK-182.md` (km o miglia)
- `apps/mobile/src/navigation/runMetrics.ts` (`kmTimesMs`, `splits`,
  `changeLabel`: i tempi dei km e la differenza, già usati a fine corsa),
  `freeRun.ts` (`wholeKm`, la voce dei km), `useNavigation.ts`,
  `useFreeRun.ts`

## Cosa fare

1. Il tempo di ogni km dalla traccia, pause escluse, come a fine corsa
   (`kmTimesMs`): la differenza fra l'ultimo km e quello prima, in secondi
   interi. Con lo stesso calcolo della fine corsa la voce e la schermata
   finale dicono la stessa cosa.
2. **Entro 2 secondi** (compresi) «stesso passo»; oltre, meglio o peggio
   di quei secondi.
3. Le tre frasi nel `Phrasebook` e nelle **cinque tabelle** di
   `src/voice/`: inglese e italiano come sopra (approvati dall'utente),
   tedesco, spagnolo e francese scritti dall'agente, **«da confermare»**.
4. Dette subito dopo la frase del km, in **tutte e due** le corse: con un
   percorso (`useNavigation.ts`) e senza (`useFreeRun.ts`). Una corsa che
   riprende non ridice i km già detti (come oggi).
5. **Le miglia** (TASK-182): quando l'utente sceglie le miglia la voce
   parla a ogni miglio; le frasi hanno anche la forma con «miglio» /
   «mile» («Questo miglio: 12 secondi meglio del precedente.», «12 seconds
   faster than the last mile.», «Stesso passo del miglio precedente.»,
   «Same pace as the last mile.»). Se TASK-217 entra prima di TASK-182,
   le forme con le miglia le aggiunge TASK-182 insieme al resto della voce
   in miglia: scriverlo nell'esito.
6. **In bici** (scelte dell'utente del 2026-10-03, corrette subito
   dopo: prima «a ogni km, in velocità, senza numeri», poi «ogni 10
   km»): il confronto arriva **ogni 10 km**, gli ultimi 10 km contro i 10
   prima, quindi a 20 e 30 km (a 10 km non c'è niente prima); in
   velocità e **senza numeri**: IT «Ultimi 10 km più veloci dei 10
   precedenti.» / «Ultimi 10 km più lenti dei 10 precedenti.»; EN «The
   last 10 km were faster than the 10 before.» / «… slower …». Anche la
   frase dei km in bici passa a ogni 10 km (TASK-216). Il caso «stessa
   velocità» l'utente non l'ha chiesto: proposta dell'agente, **da
   confermare**, entro 0,5 km/h, IT «Ultimi 10 km alla stessa velocità dei
   10 precedenti.» / EN «The last 10 km were at the same speed as the 10
   before.» Serve che la navigazione sappia l'attività (TASK-216, punto
   1): se TASK-217 entra prima, la parte della bici la collega TASK-216.
   In miglia (TASK-182) l'intervallo della bici è da decidere lì.
7. Test deterministici: le tre frasi nelle cinque lingue, il primo km
   senza confronto, il limite dei 2 s, una pausa che non conta, la corsa
   che riprende.
8. `UI.md`, ADR-0180 se serve, `STATUS.md`.

## Criteri di accettazione

- [x] Dal secondo km in poi, dopo la frase del km, la voce dice di quanti
      secondi il km è stato meglio o peggio del precedente, o «stesso
      passo» entro 2 s; al primo km niente.
- [x] Le frasi italiane e inglesi sono quelle approvate; le altre tre
      lingue ci sono, segnate «da confermare».
- [x] Vale con un percorso e senza.
- [x] In bici il confronto arriva ogni 10 km (a 20 e 30 km), in velocità
      e senza numeri (con TASK-216).
- [x] Le pause non contano nel tempo di un km.
- [x] Test deterministici verdi; `typecheck`, `lint`, `format:check`
      puliti.

## File toccati

Previsti:

```
apps/mobile/src/voice/{phrasebook,en,it,de,es,fr}.ts
apps/mobile/src/voice/words.test.ts
apps/mobile/src/navigation/freeRun.ts
apps/mobile/src/navigation/freeRun.test.ts
apps/mobile/src/navigation/runMetrics.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/useFreeRun.test.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-217.md
```

Toccati davvero (2026-10-05, con l'ok del coordinatore per quelli non
previsti):

```
apps/mobile/src/navigation/kmCompare.ts          (nuovo: tutto il confronto)
apps/mobile/src/navigation/kmCompare.test.ts     (nuovo)
apps/mobile/src/voice/kmWords.test.ts            (nuovo: le frasi nelle cinque lingue)
apps/mobile/src/voice/{phrasebook,en,it,de,es,fr}.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/useFreeRun.test.ts
apps/mobile/src/navigation/rideRun.test.ts       (TASK-216, chiusa: la riga nuova a 20 km
                                                  e «Same pace…» al secondo km della corsa)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-217.md
```

Non toccati, benché previsti: `freeRun.ts`, `freeRun.test.ts`,
`runMetrics.ts` (il confronto usa `splits` così com'è) e `words.test.ts`
(le frasi nuove hanno il loro file di test, come `rideWords.test.ts`).

## Fuori scope

- Dire il tempo del singolo km (scartato dall'utente).
- Confronti con la corsa precedente o con un obiettivo di passo.
- La schermata della corsa: cambia solo la voce.

## Esito

### 2026-10-05

Fatto come «Cosa fare», con l'ADR-0180.

- **Il calcolo** è in `src/navigation/kmCompare.ts`, un file nuovo:
  `kmChangeS` prende la differenza da `splits` (`runMetrics.ts`), la
  stessa della colonna «Change» di «Data» e della fine corsa, arrotondata
  al secondo; `kmComparison` sceglie la frase («stesso passo» entro
  `SAME_PACE_S` = 2 s, compresi, sul numero arrotondato). Al primo km
  niente.
- **Le frasi** nel `Phrasebook` e nelle cinque tabelle: `kmFaster`,
  `kmSlower`, `kmSamePace`, e per la bici `rideFaster`, `rideSlower`,
  `rideSameSpeed`. Inglese e italiano come approvati; tedesco, spagnolo e
  francese scritti dall'agente, **da confermare** (in `UI.md`, «Correre
  senza percorso»). Da un minuto in su la differenza è detta come un
  tempo («1 minute 15 seconds faster…»).
- **Dette subito dopo la frase del km**, come frase a parte, con un
  percorso (`useNavigation.ts`) e senza (`useFreeRun.ts`), nella lingua
  della voce di quel momento. La frase del km non cambia; al quinto km il
  confronto viene dopo l'incitamento. Una corsa che riprende non ridice
  niente.
- **In bici** (`rideComparison`): ogni 10 km da 20 km, gli ultimi 10
  contro i 10 prima, in velocità e senza numeri; «stessa velocità» entro
  0,5 km/h (`SAME_SPEED_KMH`), frase e soglia **da confermare**. «km» è
  detto per intero («Ultimi 10 chilometri più veloci dei 10
  precedenti.»): la voce del telefono può leggere male le sigle.
- **Le miglia**: TASK-182 non è ancora in `main`, quindi le forme con
  «miglio» / «mile» le aggiunge TASK-182 insieme al resto della voce in
  miglia, e lì si decide l'intervallo della bici.
- **Test**: le frasi nelle cinque lingue (`kmWords.test.ts`); il primo km
  senza confronto, più veloce, più lento, il limite dei 2 s (2 s «stesso
  passo», 3 s no, e l'arrotondamento), la pausa che non conta, gli stessi
  secondi di `changeLabel`, la bici a 10, 20 e 30 km e il limite di 0,5
  km/h (`kmCompare.test.ts`); le due corse dal vero, la lingua della
  voce e la corsa che riprende (`useFreeRun.test.ts`,
  `useNavigation.test.ts`, `rideRun.test.ts`). 210 file di test, 1778
  test verdi; `typecheck`, `lint`, `format:check` puliti.

**Confermato dall'utente** (2026-10-05, «confermo le frasi e la stessa
velocità in bici»): le frasi in tedesco, spagnolo e francese; in bici
«stessa velocità» (frase e 0,5 km/h). In «Esito» qui sopra «da
confermare» è com'era alla PR #308. **Da provare** correndo con l'iPhone,
dopo la prossima pubblicazione.
