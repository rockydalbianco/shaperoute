# TASK-216 — La navigazione in bici

**Stato**: In lavorazione (2026-10-03): codice, test e documenti fatti nel
branch, PR in attesa del merge
**Fase**: 4 · **Branch**: `feat/TASK-216-bike-navigation`
**Dipende da**: TASK-190 (la bici), TASK-206 C (la voce dei tratti a
mano), TASK-209 (la voce in cinque lingue, `src/voice/`)

## Obiettivo

Un percorso in bici si segue con una navigazione da bici: la velocità al
posto del ritmo, gli avvisi in tempo per chi pedala, e le parole giuste
fra le lettere di una parola a penna alzata. Oggi «Start» su un percorso in
bici apre la navigazione della corsa (TASK-190, «Seguiti» e domanda 2).

## Scelte dell'utente (2026-10-03)

Chieste dalla sessione di TASK-206 C (`tasks/TASK-206.md`, «Le domande
della parte C», 4 e 5), con la proposta:

- **«Start» in bici: un task a parte**, questo. Velocità in **km/h** sulla
  schermata e nella voce dei km (al posto del «passo medio» al km), avvisi
  di svolta più in anticipo. Scartati «va bene così» e «dentro TASK-206 C».
- **La penna alzata in bici, qui**: fra le lettere si va in bici, non a
  piedi. La scheda del percorso dice EN «… km of letters + … km riding
  between them» · IT «… km di lettere + … km in bici fra una lettera e
  l'altra»; la voce EN «Letter done. Ride to the U: the drawing is
  paused.» · IT «Lettera finita. Pedala fino alla U: il disegno è in
  pausa.» (con «the next letter» / «la lettera successiva» quando la
  lettera non ha nome, come oggi).

- **La voce dei km in bici ogni 10 km** (scelta dell'utente del
  2026-10-03, con TASK-217): a 10, 20 e 30 km, IT «Dieci chilometri.
  Tempo: 25 minuti. Velocità media: 24 km/h.», non a ogni km (in bici un
  km dura 2–3 minuti). Da 20 km, subito dopo, il confronto di TASK-217:
  «Ultimi 10 km più veloci dei 10 precedenti.» / «… più lenti …», senza
  numeri. L'inglese della frase dei km e le altre tre lingue da scrivere e
  far approvare (inglese) o segnare «da confermare».

## Contesto da leggere

- `docs/UI.md`, «La navigazione» e «Il risultato»
- `docs/tasks/TASK-190.md`, «Fuori scope», «Domande aperte», «Seguiti»
- `docs/tasks/TASK-198.md` (la penna alzata nella corsa)
- `docs/tasks/TASK-209.md` (le tabelle della voce, `Phrasebook`)
- `apps/mobile/src/navigation/navigator.ts` (`ANNOUNCE_M`, `PASS_M`),
  `runStats.ts`, `penUp.ts`; `src/screens/RunPanel.tsx`

## Cosa fare

1. L'attività del percorso seguito arriva alla navigazione (oggi
   `useNavigation` non la conosce): da «Draw» con «Bike», da un preferito
   in bici, da un esempio di «Explore» in bici.
2. **La velocità**: in bici la schermata della corsa mostra km/h dove oggi
   mostra il ritmo al km; la voce, **ogni 10 km** (scelta dell'utente),
   dice tempo e velocità media (`Phrasebook`, nelle cinque tabelle:
   inglese e italiano da far approvare all'utente, le altre «da
   confermare»). La corsa non cambia.
3. **Gli avvisi di svolta**: in bici più lontano di `ANNOUNCE_M` (50 m); di
   quanto lo decide l'agente misurando (a 20 km/h 50 m sono 9 s), in
   `DECISIONS.md`. Anche l'avviso dei tratti a mano di TASK-206 C, che oggi
   è a 50 m come le svolte.
4. **La penna alzata in bici**: i testi qui sopra nella scheda del
   percorso (`RoutePanel.tsx`, `PenSplit`) e nella voce (`penUp`, nelle
   cinque tabelle).
5. Test deterministici: la corsa byte per byte come prima, la bici con
   km/h, gli avvisi più lontani e le frasi nuove.
6. `UI.md`, ADR-0179 se la scelta della distanza degli avvisi lo chiede,
   `STATUS.md`.

## Criteri di accettazione

- [x] Con un percorso in bici la schermata della corsa mostra km/h e la
      voce, ogni 10 km, dice tempo e velocità media; con la corsa tutto
      come prima.
- [x] In bici gli avvisi di svolta (e dei tratti a mano) arrivano prima che
      nella corsa, alla distanza scritta in `DECISIONS.md`.
- [x] Con una parola a penna alzata in bici la scheda e la voce dicono
      «riding» / «Ride to» (e in italiano «in bici» / «Pedala fino»).
- [x] Test deterministici dell'app verdi; `typecheck`, `lint`,
      `format:check` puliti.

## File toccati

Previsti (da confermare col coordinatore quando si parte: `RoutePanel.tsx`
è anche della #255, in pausa), poi quelli toccati davvero. In più dei
previsti, chiesti al coordinatore il 2026-10-03: `NavigateScreen.tsx` e
`RunDashboard.tsx` (l'attività fino ai numeri, la colonna dei km di
«Data»), `onFootVoice.ts` (punto 3), le tabelle di `src/i18n/` (solo
aggiunte, i testi nuovi con `t()`) e i file nuovi. `runStats.ts` e
`RunPanel.test.tsx` non sono serviti: i numeri della bici sono in
`ride.ts`, i loro test in file nuovi.

```
apps/mobile/App.tsx
apps/mobile/__tests__/AppBikeNavigation.test.tsx    (nuovo)
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/navigator.ts
apps/mobile/src/navigation/navigator.test.ts
apps/mobile/src/navigation/onFootVoice.ts
apps/mobile/src/navigation/onFootVoice.test.ts
apps/mobile/src/navigation/onFootRun.test.ts
apps/mobile/src/navigation/penUp.ts
apps/mobile/src/navigation/penUp.test.ts
apps/mobile/src/navigation/ride.ts                   (nuovo)
apps/mobile/src/navigation/ride.test.ts              (nuovo)
apps/mobile/src/navigation/rideRun.test.ts           (nuovo)
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunBike.test.tsx             (nuovo)
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanelBike.test.tsx
apps/mobile/src/voice/{phrasebook,en,it,de,es,fr}.ts
apps/mobile/src/voice/rideWords.test.ts              (nuovo)
apps/mobile/src/i18n/{it,de,es,fr}.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-216.md
```

## Fuori scope

- Il punteggio a fine giro pensato per la bici (TASK-190, «Fuori scope»).
- La corsa senza percorso in bici («Ride without a route»): la stessa
  domanda della velocità, da chiedere all'utente se la vuole qui.
- La canoa e il paddle (TASK-191).
- «Explore» e «Feed» con «Bike» (TASK-190, domanda 1, ancora aperta).

## Esito

### 2026-10-03

Fatto come «Cosa fare», con le scelte dell'utente e l'ADR-0179.

- **L'attività** del percorso seguito arriva a `useNavigation` e alla
  scheda della corsa: da «Draw» quella della richiesta, da un preferito
  quella con cui è stato tenuto (anche con «Run» in «Settings»), da
  «Explore» quella dell'esempio, oggi sempre la corsa. Solo `cycling` è
  una bici (`src/navigation/ride.ts`).
- **La velocità**: in bici «Speed now», «Avg speed», «Last km» in km/h a un
  decimale, e su «Data» la colonna «Speed» con la differenza in km/h
  («-4.0»); in italiano «Vel. ora», «Vel. media», «Ultimo km»,
  «Velocità». La voce ogni 10 km: «10 kilometres. Time: 25 minutes 10
  seconds. Average speed: 24 kilometres per hour.» · «10 chilometri.
  Tempo: 25 minuti e 10 secondi. Velocità media: 24 chilometri orari.»
  (`rideKilometres` nel `Phrasebook`). Testi e frasi inglesi e italiani
  **approvati dall'utente** il 2026-10-03 (con la velocità detta a parole
  e i secondi, come nella corsa); tedesco, spagnolo e francese **da
  confermare**.
- **Gli avvisi**: in bici svolte e tratti a mano **100 m prima**
  (`RIDE_ANNOUNCE_M`, `ON_FOOT_AHEAD_M`), misurato su 21 percorsi in bici e
  40 di corsa a Trento (ADR-0179): a 20 km/h la svolta arriva in mediana
  16,1 s dopo l'inizio della frase, come nella corsa a 5:30 /km con 50 m
  (16,5 s); oltre 100 m la mediana non cresce.
- **La penna alzata in bici**: la scheda «… km riding between them» · «… km
  in bici fra una lettera e l'altra» (con `t()`), la voce «Letter done.
  Ride to the U: the drawing is paused.» · «Lettera finita. Pedala fino
  alla U: il disegno è in pausa.» (`rideTo`).
- **La corsa identica**: stesse frasi e stessi testi; un test segue una
  corsa simulata, senza attività e con `running`, e ne confronta ogni
  frase detta (`rideRun.test.ts`); i test della corsa di prima non sono
  cambiati, tranne quelli dei tratti a mano (solo in bici: 100 m).
- **Test**, sul Mac: app 1.541 verdi, ribasato su `b649a88` (nuovi `ride.test.ts`,
  `rideRun.test.ts`, `rideWords.test.ts`, `RunBike.test.tsx`,
  `AppBikeNavigation.test.tsx`, e aggiunte a navigatore, penna, tratti a
  mano e scheda); `typecheck`, `lint`, `format:check` puliti.
- **Non verificato**: sull'iPhone, pedalando. Non pubblicato.
- **Seguiti, da chiedere all'utente**: la fine della corsa in bici (il
  riepilogo mostra il passo), le calorie (stimate per la corsa: in bici
  circa un terzo), l'incitamento dopo 5 km (in bici non c'è), la corsa
  senza percorso in bici («Ride without a route», fuori scope). Il
  confronto ogni 10 km è TASK-217.
