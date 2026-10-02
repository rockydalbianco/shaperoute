# TASK-154 — Lo swipe fra tre pagine: «Feed», «Draw», «Explore»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-154-swipe-pages`
**Dipende da**: TASK-115 (in `main`)

Scelta dell'utente del 2026-10-02, dopo le proposte grafiche sul canvas:
«vai con lo swipe fra le tre pagine». È la variante A, con i nomi in alto,
al posto della barra in basso di TASK-115.

## Obiettivo

Dall'app si passa fra «Feed», «Draw» ed «Explore» con uno swipe a destra o
a sinistra, o toccando il loro nome in alto.

## Contesto da leggere

- `docs/UI.md` «Le due schermate», «Le schede» (TASK-115)
- `docs/DECISIONS.md` ADR-0125 (le schede fatte a mano), ADR-0098
- `apps/mobile/App.tsx`, `apps/mobile/src/screens/Tabs.tsx`

## Cosa fare

1. `Pager.tsx`: tre pagine affiancate con lo scorrimento a pagine di React
   Native, i nomi in alto che si toccano, nessuna dipendenza nuova.
2. `App.tsx`: «feed» fra le schermate; il pager al posto delle due
   schermate sovrapposte. Mappa, corsa e fine corsa restano schermate
   intere, senza pager.
3. «Explore» chiede i percorsi alla prima visita, non all'avvio.
4. `FeedScreen.tsx`: la pagina di sinistra, vuota e onesta finché non
   arriva TASK-118.
5. Via la barra in basso: «Profile» si apre da un pulsante accanto ai nomi
   e si chiude con «←» (`ProfileLayer.tsx` al posto di `Tabs.tsx`).
6. Via il pulsante «Explore» dalla prima schermata e «←» da «Explore».
7. Test del pager, delle pagine dentro l'app vera e di «Profile».
8. `UI.md`, ADR-0124, `STATUS.md`.

## Criteri di accettazione

- [x] L'app si apre su «Draw», con «Feed» a sinistra ed «Explore» a destra.
- [x] Uno swipe che si ferma su un'altra pagina la rende la pagina
      corrente; toccare un nome fa lo stesso.
- [x] «Explore» non chiede niente all'API finché non ci si arriva; tornarci
      non richiede l'elenco.
- [x] Forma, distanza e partenza restano dopo un giro sulle altre pagine.
- [x] Sulla mappa e durante la corsa non ci sono né nomi né swipe; «←» da un
      percorso di «Explore» torna sulla pagina «Explore».
- [x] «Profile» si apre dal pulsante in alto e si chiude con «←»; il
      pallino della sessione finita è sul pulsante.
- [x] Nessuna dipendenza nuova; colori dai token; testi in inglese.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Prova con il dito sull'iPhone: lo swipe, e le righe che scorrono di
      lato dentro le pagine.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/AppPages.test.tsx
apps/mobile/src/screens/Pager.tsx
apps/mobile/src/screens/Pager.test.tsx
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreen.test.tsx
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/screens/Tabs.tsx                 (tolto)
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/account/ProfileTab.test.tsx      (diventa Profile.test.tsx)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-154.md
```

## Fuori scope

- Il contenuto del feed: i post, i like, i commenti (TASK-118, 119, 120).
- Le altre proposte del canvas, non ancora scelte dall'utente: la griglia
  delle forme, la partenza su una riga, il ridisegno di «Explore», la
  scheda del percorso, il sistema dei pulsanti.
- Togliere «Sgrava» dalla cima di «Draw» e «Best near you» da quella di
  «Explore»: fa parte del ridisegno delle due pagine.
- Un pacchetto di icone.
- `nestedScrollEnabled` sulle righe che scorrono di lato, per Android.

## Esito

Fatto (2026-10-02, ADR-0124). L'app si apre su «Draw» fra «Feed» ed
«Explore»; si passa con lo swipe o toccando i nomi in alto. «Explore»
chiede i percorsi alla prima visita, «Feed» dice che lì arriveranno i
disegni pubblicati, «Profile» si apre dal pulsante tondo in alto a destra
e si chiude con «←»: la barra in basso non c'è più. 710 test dell'app
verdi (14 nuovi in tre file, più quelli di «Profile» adattati), lint,
typecheck e prettier puliti. Le tre pagine e «Profile» viste su un
simulatore con Expo Go, senza API.

**Non provato con il dito**: lo swipe stesso e le righe che scorrono di
lato dentro le pagine (tessere delle forme, città). Va fatto sull'iPhone,
con l'app ripubblicata a fine coda dei merge.

Seguiti:

- **TASK-118**: chi lo prende aggiorni i suoi «File toccati».
  `FeedScreen.tsx` esiste già e va riempito; `Tabs.tsx` non c'è più, al suo
  posto ci sono `Pager.tsx` e `ProfileLayer.tsx`; la pagina «Feed» è già
  una delle tre.
- In Expo Go il pulsante blu degli strumenti sta in alto a destra, sopra
  il pulsante di «Profile»: si trascina via. In un'app compilata non c'è.
- «Sgrava» in cima a «Draw» e «Best near you» in cima a «Explore» restano:
  decidere se toglierli con il ridisegno delle due pagine.
- Android: le righe che scorrono di lato dentro il pager non sono state
  provate; potrebbe servire `nestedScrollEnabled`.
