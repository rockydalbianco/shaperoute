# TASK-217 — La voce confronta ogni km col precedente

**Stato**: Todo (chiesto e scelto dall'utente il 2026-10-03; il codice
dopo la #259 e dopo TASK-206 C)
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
6. **In bici** (scelta dell'utente del 2026-10-03): il confronto è in
   velocità, come la voce dei km in bici di TASK-216, e **senza numeri**:
   IT «Più veloce del chilometro precedente.» / «Più lento del chilometro
   precedente.»; EN «Faster than the last kilometre.» / «Slower than the
   last kilometre.» (scartati «1,5 km/h più veloce» e «km/h meglio»). Il
   caso «stessa velocità» non l'ha scelto l'utente: proposta dell'agente,
   **da confermare**, IT «Stessa velocità del chilometro precedente.» / EN
   «Same speed as the last kilometre.» entro 0,5 km/h. Serve che la
   navigazione sappia l'attività (TASK-216, punto 1): se TASK-217 entra
   prima, le frasi della bici le collega TASK-216.
7. Test deterministici: le tre frasi nelle cinque lingue, il primo km
   senza confronto, il limite dei 2 s, una pausa che non conta, la corsa
   che riprende.
8. `UI.md`, ADR-0180 se serve, `STATUS.md`.

## Criteri di accettazione

- [ ] Dal secondo km in poi, dopo la frase del km, la voce dice di quanti
      secondi il km è stato meglio o peggio del precedente, o «stesso
      passo» entro 2 s; al primo km niente.
- [ ] Le frasi italiane e inglesi sono quelle approvate; le altre tre
      lingue ci sono, segnate «da confermare».
- [ ] Vale con un percorso e senza.
- [ ] In bici il confronto è in velocità e senza numeri (con TASK-216).
- [ ] Le pause non contano nel tempo di un km.
- [ ] Test deterministici verdi; `typecheck`, `lint`, `format:check`
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

## Fuori scope

- Dire il tempo del singolo km (scartato dall'utente).
- Confronti con la corsa precedente o con un obiettivo di passo.
- La schermata della corsa: cambia solo la voce.

## Esito

*(da compilare)*
