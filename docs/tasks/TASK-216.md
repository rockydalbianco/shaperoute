# TASK-216 — La navigazione in bici

**Stato**: Todo (scelte dell'utente del 2026-10-03; il codice dopo
TASK-206 C)
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

- **Il confronto di ogni km col precedente in bici** (TASK-217, scelta
  dell'utente del 2026-10-03): in velocità e **senza numeri**, IT «Più
  veloce del chilometro precedente.» / «Più lento del chilometro
  precedente.», EN «Faster than the last kilometre.» / «Slower than the
  last kilometre.»; «stessa velocità» entro 0,5 km/h è una proposta
  dell'agente, da confermare. Se TASK-217 entra prima di questo task, le
  frasi della bici si collegano qui.

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
   mostra il ritmo al km; la voce di ogni km dice la velocità media
   (`Phrasebook`, nelle cinque tabelle: inglese e italiano da far
   approvare all'utente, le altre «da confermare»). La corsa non cambia.
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

- [ ] Con un percorso in bici la schermata della corsa mostra km/h e la
      voce dei km dice la velocità media; con la corsa tutto come prima.
- [ ] In bici gli avvisi di svolta (e dei tratti a mano) arrivano prima che
      nella corsa, alla distanza scritta in `DECISIONS.md`.
- [ ] Con una parola a penna alzata in bici la scheda e la voce dicono
      «riding» / «Ride to» (e in italiano «in bici» / «Pedala fino»).
- [ ] Test deterministici dell'app verdi; `typecheck`, `lint`,
      `format:check` puliti.

## File toccati

Previsti (da confermare col coordinatore quando si parte: `RoutePanel.tsx`
è anche della #255, in pausa):

```
apps/mobile/App.tsx
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/navigator.ts
apps/mobile/src/navigation/penUp.ts
apps/mobile/src/navigation/runStats.ts
apps/mobile/src/navigation/*.test.ts
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunPanel.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanelBike.test.tsx
apps/mobile/src/voice/{phrasebook,en,it,de,es,fr}.ts
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

*(da compilare)*
