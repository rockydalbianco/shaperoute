# TASK-268 — «Data» con l'indicazione: «Map» e «Pause» restano sullo schermo

**Stato**: Done (#472, 2026-10-10)
**Fase**: 4 · **Branch**: `fix/TASK-268-run-data-page`

## Obiettivo

Durante una corsa lungo un percorso, sulla pagina «Data» i pulsanti della
corsa e «Map» / «Data» restano sempre sullo schermo, qualunque sia
l'altezza dell'indicazione in alto e la lunghezza della corsa.

## Contesto

Dalla corsa su strada dell'utente del 2026-10-09 (parole sue): quando
compaiono le indicazioni «si sposta tutto in basso e non si riesce più a
cliccare»; dalla pagina dei dati non si torna alla mappa; a un certo punto
la voce ha smesso di dare le indicazioni.

Verificato sul codice (`screens/RunDashboard.tsx`, `DataPage`): la pagina
è una colonna fissa alta quanto lo schermo, senza scorrimento: in alto
l'indicazione (`heading`, il `NextTurn` di `NavigateScreen.tsx`, più alta
quando c'è la riga «Then …»), poi i km grandi (88 pt), la barra del
percorso, sei numeri, i km uno per uno (con un loro scorrimento), i due
interruttori, la voce, i pulsanti della corsa e «Map» / «Data». Su un
iPhone di 844 pt la somma supera già lo schermo: con l'indicazione in alto
i pulsanti e «Map» finiscono sotto il bordo e il tocco dove prima c'era
«Map» cade sugli interruttori («Auto-pause», «Voice»).

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0137 (le due pagine della corsa, aggiornata da
  TASK-186)
- `apps/mobile/src/screens/RunDashboard.tsx` (`DataPage`, `Splits`)

## Cosa fare

1. In `DataPage`, fra l'indicazione in alto e i pulsanti in fondo, una
   sola `ScrollView` che prende lo spazio che resta: km grandi, barra del
   percorso, numeri, km uno per uno, interruttori, voce. L'indicazione, i
   pulsanti della corsa e «Map» / «Data» restano fuori, fissi.
2. `Splits` senza uno scorrimento suo: le righe stanno in quello della
   pagina.
3. Lo scorrimento non si prende lo swipe verso la mappa
   (`directionalLockEnabled`; la pagina non cede lo swipe iniziato, e se
   le viene tolto torna al suo posto invece di restare a metà).
4. Un test che fissa la struttura; la prova a schermo nel simulatore.
5. La voce che si ferma: capire perché e dirlo all'utente.

## Criteri di accettazione

- [x] Sulla pagina «Data», con l'indicazione e la riga «Then …», «Pause» e
      «Map» sono sullo schermo di un iPhone 17 (prova nel simulatore).
- [x] I km uno per uno, gli interruttori e la voce si raggiungono
      scorrendo; l'indicazione, i pulsanti e «Map» / «Data» no.
- [ ] Lo swipe verso destra riporta alla mappa anche sopra i numeri
      (nel codice e nel test; il dito vero è sull'iPhone dell'utente).
- [x] Nessun testo nuovo; nessun colore scritto a mano.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi (CI
      5/5 della #472).

## File toccati

```
apps/mobile/src/screens/RunDashboard.tsx              (+ test)
apps/mobile/src/screens/RunDashboard.test.tsx
docs/tasks/TASK-268.md
docs/STATUS.md, docs/DECISIONS.md                     (le righe di questo task)
```

## Fuori scope

- **La voce a telefono bloccato o con Spotify davanti**: è TASK-261 parte
  B (`expo-audio`, `UIBackgroundModes` `audio`), che aspetta le scelte
  dell'utente e l'ok alla dipendenza nuova.
- Cambiare l'ordine o il contenuto della pagina «Data», o la pagina
  «Map»: l'indicazione sulla mappa è sopra la mappa, non spinge la scheda.
- Una conferma per spegnere «Voice»: testo nuovo, da chiedere.

## Esito

La pagina «Data» ha l'indicazione fissa in alto, i pulsanti e «Map» /
«Data» fissi in fondo e in mezzo una sola `ScrollView` con tutti i
numeri (aggiunta ad ADR-0137). Nel simulatore (iPhone 17, impalcatura
temporanea con la svolta «Then …» e una corsa di 2,3 km): prima «Map» /
«Data» era tagliato sotto il bordo, ora è intero sopra la barra di casa.
Test nuovo in `RunDashboard.test.tsx`, che sul codice di prima fallisce.
Lint, typecheck e test completi lasciati alla CI: il Mac il 2026-10-09
sera aveva un carico sopra 800 per altre sessioni.

La voce che si ferma: la logica delle indicazioni (`navigator.ts`) non
si interrompe da sola; le cause verosimili sono l'interruttore «Voice»
toccato per sbaglio dove prima stava «Map» (questo task) e il telefono
bloccato o Spotify davanti, dove iOS zittisce la sintesi vocale con la
sessione audio di partenza (TASK-261 parte B, PR #475).

Merge della #472 il 2026-10-10 (`0a07f757`, Coordinatore 2), CI 5/5.
Solo app: la pubblicazione su preview è del coordinatore. Resta la prova
dello swipe col dito sull'iPhone dell'utente.
