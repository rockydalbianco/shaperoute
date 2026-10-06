# TASK-253 — La navigazione non salta avanti e riprende dove era

**Stato**: Todo
**Fase**: 4 · **Branch**: `fix/TASK-253-navigation-progress`

## Obiettivo

Su un percorso che ripassa dallo stesso punto (un baffo, un incrocio) la
posizione resta sul passaggio giusto, e dopo «Keep running» o un tratto
saltato il navigatore ritrova il corridore: le svolte si dicono al posto
giusto, «You have arrived» solo all'arrivo.

## Contesto

Dalla revisione del codice dell'app chiesta dall'utente il 2026-10-06,
letta su `origin/main` `4e4370f8`. Verificato sul codice e, per la prima
voce, con una copia di `locate` su percorsi finti:

- **`progress.locate` non fa pagare l'andare avanti.** Il costo è
  `offM + max(0, fromM − alongM)`: fra due passaggi vicini vince quello
  con meno scarto laterale, anche 300 m più avanti (`AHEAD_M`). Un baffo
  di 80 m senza rumore GPS: il corridore a 15 m dall'imbocco è messo 130 m
  avanti, sul ritorno; con 3–8 m di rumore fino a 170 m; un incrocio con
  5 m di rumore, 227 m. Conseguenze in `navigator.ts`: le svolte saltate
  non si dicono più, quella all'uscita del baffo si dice mentre ci si
  allontana, l'avanzamento torna indietro. Se il doppio passaggio è negli
  ultimi 300 m: «You have arrived», `trackStore` segna «arrived» e la
  registrazione finisce senza «Resume». Anche la penna (`penUp.ts`) si
  alza prima. Il test che c'è (`navigator.test.ts`, andata e ritorno di
  1 km) non lo vede: il ritorno è oltre i 300 m.
- **«Keep running» dopo «Stop» riparte da 0 m** (`App.tsx` →
  `useNavigation.ts`, `startNavigation`): la traccia continua
  (`startRun`), il navigatore no. «Head out on …» di nuovo, poi «off the
  route» per sempre: nessuna svolta, 0 % disegnato, penna mai alzata. Lo
  stesso quando il corridore salta più di 300 m di percorso.
- **Una svolta negli ultimi 10 m** non può risultare passata
  (`distance_m + PASS_M <= alongM` con `alongM` che non supera il totale):
  l'arrivo non viene detto.
- **`watchPositionAsync` o la richiesta del permesso che rifiutano**
  (servizi di posizione spenti) sono un rifiuto non gestito in
  `useNavigation.ts` e `useFreeRun.ts`: la schermata resta senza posizioni
  e senza messaggio.

## Contesto da leggere

- `docs/UI.md`, il paragrafo della navigazione
- `docs/DECISIONS.md`: ADR-0070 (fuori tracciato), ADR-0157 (penna alzata)
- `apps/mobile/src/navigation/progress.ts`, `navigator.ts`,
  `useNavigation.ts`, `penUp.ts`, `trackStore.ts`

## Cosa fare

1. `progress.locate` in due passate: prima solo vicino a dove si era
   (indietro `BACK_M`, avanti poche decine di metri); la finestra intera
   (`AHEAD_M`) solo se lì non c'è niente entro la tolleranza del fuori
   tracciato. I valori si fissano con i test, non a occhio.
2. `navigator.ts`: «arrived» solo dopo due posizioni di fila alla fine;
   entro la distanza d'arrivo, le svolte rimaste contano come passate.
3. Riprendere: quando il registratore restituisce una traccia con delle
   posizioni, il navigatore riparte da dove quella traccia è arrivata
   (ripassando le posizioni salvate, senza voce), con penna, tratti a
   piedi e chilometri già detti allineati.
4. Ritrovare il percorso: dopo N secondi fuori tracciato, cercare su
   tutto il percorso che resta davanti. **Che si possa rientrare più
   avanti dopo aver saltato un pezzo è una scelta dell'utente**: va
   chiesta prima di fare questo passo; i passi 1–3 non la aspettano.
5. `useNavigation.ts`, `useFreeRun.ts`: `catch` sulla richiesta del
   permesso e su `watchPositionAsync`, verso lo stato «denied» che c'è.
6. Test nuovi: `progress.test.ts` (non esiste), con un baffo, un incrocio
   e un doppio passaggio negli ultimi 300 m, con e senza rumore
   deterministico.

## Criteri di accettazione

- [ ] Baffo di 80 m: su ogni posizione dell'andata e del ritorno
      l'avanzamento non salta più di qualche metro e non torna indietro;
      la svolta in fondo al baffo viene detta, una volta.
- [ ] Incrocio: passando la prima volta, la posizione resta sul primo
      passaggio.
- [ ] Doppio passaggio negli ultimi 300 m: «arrived» solo alla fine vera.
- [ ] Andata e ritorno di 1 km e i percorsi dei test che ci sono: stesse
      frasi di prima (`navigator.test.ts` verde senza modifiche).
- [ ] «Stop» al km 3 di 5, «Keep running»: la prossima svolta detta è
      quella dopo il km 3; la penna e i chilometri detti sono allineati.
- [ ] Una svolta a 6 m dalla fine: «You have arrived» viene detto.
- [ ] `watchPositionAsync` che rifiuta: lo stato è «denied», nessun
      rifiuto non gestito.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/navigation/progress.ts
apps/mobile/src/navigation/progress.test.ts          (nuovo)
apps/mobile/src/navigation/navigator.ts
apps/mobile/src/navigation/navigator.test.ts
apps/mobile/src/navigation/navigatorResume.test.ts   (nuovo)
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/penUp.ts                  (solo se serve per riprendere)
docs/UI.md, docs/STATUS.md, docs/DECISIONS.md        (le righe di questo task)
```

## Fuori scope

- **Parte dopo il merge di TASK-251**, che tiene `useNavigation.ts` (o
  accordandosi sulle righe con la sua sessione). `progress.ts` e
  `navigator.ts` sono liberi.
- Lo schermo acceso per tutta la corsa, la precisione del GPS nel passo
  minimo, la priorità delle svolte sulla voce del chilometro: cambiano
  quello che l'utente vede o sente. Aspettano le sue risposte.
- Una prova camminando un percorso vero: è dell'utente, sull'iPhone.

## Esito

*(si compila a fine task)*
