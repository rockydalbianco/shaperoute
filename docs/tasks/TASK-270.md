# TASK-270 — Dopo un'assenza del GPS il navigatore ritrova il percorso più avanti

**Stato**: In corso
**Fase**: 4 · **Branch**: `fix/TASK-270-navigator-rejoin`

## Obiettivo

Durante una corsa lungo un percorso, se l'app è stata dietro un'altra (o
congelata dal telefono) e nel frattempo il corridore è andato avanti, al
ritorno il navigatore lo ritrova sul percorso e riprende le indicazioni da
lì, invece di restare «fuori percorso» per sempre.

## Contesto

Dalla prima recensione di un tester (2026-10-10, parole sue): «a metà
sono uscito dall'applicazione, sono rientrato, però il GPS non mi è più
andato avanti»; ha dovuto chiudere l'app e calcolare un altro percorso.

Verificato sul codice: `locate` (`progress.ts`, ADR-0052) cerca la
posizione solo da 50 m dietro (`BACK_M`) a 300 m avanti (`AHEAD_M`)
all'ultimo punto del percorso, perché una forma passa più volte vicino a
sé stessa. Senza posizioni per un po' (Expo Go e le build senza il GPS in
background seguono il GPS solo con l'app davanti; iOS può congelare
l'app) il corridore che ha fatto più di 300 m non si trova più nella
finestra: dopo 3 posizioni e 8 s si sente «Off the route», il punto sul
percorso resta fermo, e nessuna posizione successiva lo rimette in pari.
Lo stesso succede a una corsa ripresa dopo che l'app è stata chiusa
(TASK-253), se intanto il corridore è andato avanti.

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0052 (navigazione), ADR-0070 (fuori percorso)
- `apps/mobile/src/navigation/navigator.ts`, `progress.ts`

## Cosa fare

1. Il navigatore ricorda quando è arrivata l'ultima posizione
   (`lastFixMs`). Una posizione che arriva 20 s o più dopo la precedente
   (`GAP_MS`), per un corridore già sul percorso, apre una ricerca:
   finché non lo si rimette sul percorso (`lost`), una posizione fuori
   dalla finestra si cerca su tutto il percorso avanti, col costo di
   `locate` (vince il passaggio più vicino avanti).
2. Il punto trovato si prende dopo `BACK_FIXES` (2) posizioni di fila
   lì (`found`): una sola posizione storta non fa saltare il percorso.
   Una posizione povera (oltre 40 m d'errore) non conta né azzera.
3. Le svolte saltate non si dicono; se prima si era detto «Off the
   route», si dice «Back on the route». La svolta successiva si annuncia
   come sempre.
4. Senza assenza, tutto come prima: una posizione oltre la finestra è
   fuori percorso. Un corridore mai stato sul percorso (va verso la
   partenza) non si cerca più avanti.
5. Test deterministici in `navigator.test.ts`.

## Criteri di accettazione

- [x] Dopo 3 minuti senza posizioni, a 800 m su un percorso lasciato a
      300 m, il navigatore è a 800 m dopo due posizioni, senza «Off the
      route», e annuncia la svolta seguente (test).
- [x] Senza assenza, la stessa posizione a 800 m è fuori percorso come
      prima (test).
- [x] Una posizione povera dopo l'assenza non conta; una sola buona non
      basta (test).
- [x] Fermo a un semaforo per un minuto: si riparte da dov'era (test).
- [x] Fuori percorso prima dell'assenza: rientra più avanti con «Back on
      the route» (test).
- [x] Chi non è mai stato sul percorso non viene cercato più avanti (test).
- [x] Nessun testo nuovo.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi (CI).

## File toccati

```
apps/mobile/src/navigation/navigator.ts
apps/mobile/src/navigation/progress.ts
apps/mobile/src/navigation/navigator.test.ts
docs/tasks/TASK-270.md
docs/STATUS.md, docs/DECISIONS.md                     (le righe di questo task)
```

## Fuori scope

- **Partire da un punto qualsiasi della forma** (il tester: «ho iniziato
  da una parte diversa»): il navigatore aspetta il corridore alla
  partenza. Cambiarlo è una scelta di prodotto, da chiedere.
- **«Torna indietro» in fondo a una strada cieca**: è del motore
  (`directions.py`), task a parte.
- **Riaprire la corsa dopo che l'app è stata chiusa**: scelta dell'utente
  del 2026-10-10 («riapre la corsa in pausa»), task a parte, dopo la #475.
- **Svolte troppo vicine** (il tester: «anche dei mini svolti da 3 m»):
  «per ora si può lasciare così».

## Esito

