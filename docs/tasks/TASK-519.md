# TASK-519 — Su «Map» la freccia punta dove guarda il telefono, con il cono

**Stato**: In lavorazione · 2026-11-26 · PR di codice aperta
**Fase**: 5 · **ADR**: estende ADR-0359 (voce «deciso…» nella PR di
chiusura) · numero dal Coordinatore (fork 3, 2026-11-26) · seguito di
TASK-431

## Obiettivo

Chiesto dall'utente il 2026-11-26: «riesci a mettere la freccia del compass
dove punta in base a dove sono girato anche sulla mappa in fase di
registrazione?».

Oggi su «Map» la bussola è spenta: la freccia segue solo la traccia GPS
degli ultimi 10 m, quindi da fermi o appena partiti non dice dove si guarda.
Su «Compass» invece segue la bussola (TASK-431).

## Scelte (dell'utente)

- La freccia su «Map» punta dove punta il telefono, **con il cono azzurro**
  davanti, come su «Compass» («Freccia + cono», 2026-11-26).
- La mappa su «Map» **non gira**: resta girata come il disegno.

## Scelte tecniche (dell'agente, su delega dell'utente)

- Tutto in `useHeadingUpMap`: su «Map» la bussola resta accesa e il hook
  espone `facing` senza chiedere giri alla mappa. MapView, il messaggio
  `face` e il cono esistono già (TASK-431): `App.tsx` passa già
  `mapTurn.facing` alla mappa, quindi non cambia.
- Stessa direzione di «Compass» (`mapHeading`): la bussola da fermi, la
  bussola correndo se calibrata, altrimenti la traccia. Stessi limiti di
  giro (4°, 400 ms).
- Il pulsante del nord su «Map» resta quello del disegno (`compass` falso):
  il nord in alto è solo di «Compass».
- **Batteria**: su «Data» e sotto la modalità tasca la bussola è spenta
  (nessuno vede la freccia); torna accesa uscendo dalla tasca, e una lettura
  di prima non conta.
- Passando da «Map» a «Compass» la bussola resta la stessa e la mappa gira
  subito dove punta la freccia, senza aspettare 4° nuovi.

## Criteri di accettazione

- [x] Su «Map», durante la registrazione, la freccia punta dove punta il
      telefono, anche da fermi, con il cono aperto; la mappa non gira.
- [x] Su «Data», in modalità tasca e a corsa finita la bussola è spenta e
      `facing` è null.
- [x] «Compass» si comporta come prima (test di TASK-431 verdi).
- [x] Test deterministici nel test del hook; nessuna dipendenza nuova,
      niente di nativo.
- [ ] Prova sul telefono (dell'utente) dopo l'OTA del Coordinatore.

## File toccati

```
apps/mobile/src/map/useHeadingUpMap.ts
apps/mobile/src/map/useHeadingUpMap.test.tsx
docs/tasks/TASK-519.md                              (nuovo)
```

Nella PR di chiusura (soli documenti): voce «deciso…» che estende ADR-0359
in `docs/DECISIONS.md`; in `docs/UI.md` la riga del token `you` («il cono
di «Compass»» → anche di «Map»); riga in `docs/archive/COMPLETATI.md`.

## Verifica

Test del hook e di `MapViewPocket` (24 test), `tsc`, `eslint` e Prettier
sui file toccati verdi in locale. Non provato nel simulatore (la bussola
non c'è) né sul telefono.

## Fuori scope

- Un cono che si apre solo quando la direzione viene dalla bussola e non
  dalla traccia.
- Spegnere la bussola in tasca anche su «Compass».
