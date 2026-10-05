# TASK-240 — Con «Paddle», laghi e spiagge anche in «Another place»

**Stato**: Done (2026-10-05) — PR #344. Esce con la prossima
pubblicazione, del coordinatore.
**Fase**: 4 · **Branch**: `feat/TASK-240-paddle-place-search`
**Dipende da**: TASK-233 (l'elenco dei laghi dentro l'app, l'acqua sul
server), TASK-191 C (la canoa in «Draw»)

## Obiettivo

Richiesta dell'utente (2026-10-05): «quando sono nella sezione Draw e cerco
un altro paese sempre nella sezione padel e inserisco lago di Levico terme
non esce, esce via al lago eccetera eccetera: devi dare la possibilità di
selezionare i laghi e i mari anche in Another Place quando utilizzo la
sezione padel».

Con «Paddle», in «Draw», la ricerca di «Another place» offre anche i laghi
e le spiagge dell'elenco di «Explore», e sceglierne uno mette la partenza
sulla sua riva.

## Scelte dell'utente

Una domanda per volta, ognuna con una proposta:

1. **2026-10-05 — come si trova un lago scrivendo un indirizzo**: «va
   bene». Le parole che non sono nel nome di nessun lago si ignorano
   («Terme», «via»); le parole comuni («lago», «di», «del», «san») da sole
   non bastano se una parola è stata ignorata; i laghi stanno sopra le vie
   e i paesi, al massimo tre, il più vicino per primo, subito, senza
   aspettare la rete. Detto con la proposta: «via monte grappa» mostra due
   laghi «Monte…» sopra le vie.
2. **2026-10-05 — il mare**: «sì va bene». Si parte con le due spiagge
   dell'elenco (Jesolo, Riccione), in cima come i laghi; gli altri posti di
   mare restano i paesi e le vie della ricerca di prima, e funzionano solo
   dove il server ha o riesce a scaricare l'acqua. Altre spiagge
   nell'elenco sono un task a parte (da scegliere, provare col motore, e
   la loro acqua sul server con l'ok dell'utente).
3. **2026-10-05 — un lago piccolo**: «sì va bene». Scelto un lago le cui
   forme stanno a 1,5 o 1 km, la distanza di «Draw» scende a quella, se era
   più lunga; non sale mai; un lago da 2 km e una via non la toccano. Senza
   un messaggio: cambia solo il numero nel campo, che resta modificabile.
4. **2026-10-05 — il testo del campo**: «sì va bene». Con «Paddle», «Lake,
   beach, city or street» al posto di «City or street» (it «Lago,
   spiaggia, città o via», de «See, Strand, Stadt oder Straße», es «Lago,
   playa, ciudad o calle», fr «Lac, plage, ville ou rue»). La riga «Search
   for a city or street to start from.» resta com'è.

## Contesto da leggere

- `docs/tasks/TASK-233.md`, ADR-0196 (l'elenco dei laghi, le distanze)
- `docs/UI.md`, «La partenza», «Ricerca del luogo», «Sull'acqua: «Paddle»»
- `apps/mobile/src/paddle/waterSpots.ts` (in sola lettura)

## Cosa fare

1. Una ricerca dei laghi per un testo scritto come un indirizzo
   (`placeSpots.ts`, nuovo), sull'elenco di `waterSpots.ts`.
2. `PlaceSearch` mostra i luoghi che l'app conosce da sé sopra quelli
   trovati, quando glieli si dà; senza, è quella di prima.
3. `ChooseScreen` e `App.tsx` li danno solo con «Paddle», e alla scelta di
   un lago piccolo abbassano la distanza.

## Criteri di accettazione

- [x] Con «Paddle», «lago di Levico Terme» in «Another place» mostra «Lago
      di Levico» sopra le vie, subito (test).
- [x] Scelto, la partenza è un punto della riva dell'elenco, e la riga dice
      «Starting from Lago di Levico.» (test).
- [x] Jesolo e Riccione si trovano allo stesso modo (test).
- [x] Un lago piccolo scelto porta la distanza a quella delle sue forme; un
      lago da 2 km e una via la lasciano com'è (test).
- [x] Una via («via al lago», «via Roma, Trento») non mostra laghi (test).
- [x] Con «Run» e «Bike» la ricerca è quella di prima: nessun lago, lo
      stesso campo, gli stessi test (test).
- [x] I testi nuovi passano da `t()` nelle cinque lingue; `tables.test.ts`
      verde.

## File toccati

- `apps/mobile/src/paddle/placeSpots.ts` e `.test.ts` (nuovi)
- `apps/mobile/src/places/PlaceSearch.tsx`
- `apps/mobile/src/places/PlaceSearchSuggest.test.tsx` (nuovo)
- `apps/mobile/src/screens/ChooseScreen.tsx`
- `apps/mobile/App.tsx` (le righe di `ChooseScreen` in «Draw»)
- `apps/mobile/__tests__/AppPaddlePlace.test.tsx` (nuovo)
- `apps/mobile/src/i18n/{it,de,es,fr}.ts` (una riga nuova)
- `docs/tasks/TASK-240.md` (nuovo), `docs/UI.md` («Ricerca del luogo»,
  «Sull'acqua: «Paddle»»), `docs/DECISIONS.md` (ADR-0204),
  `docs/STATUS.md` (solo le righe di questo task)

`waterSpots.ts`, `lakes.json`, `PaddleExplore.tsx`, il motore, l'API e il
server non cambiano.

## Fuori scope

- Le spiagge oltre Jesolo e Riccione, e l'acqua del mare sul server.
- I laghi fuori elenco (Ledro, i sette scartati dal motore, l'estero): un
  lago che non è nell'elenco non viene proposto come lago.
- La ricerca di «Explore» con «Paddle» (`searchSpots`), che resta com'è.
- I laghi fra i luoghi di `GET /places`: niente API, niente server.
- La riga «Search for a city or street to start from.», che non è ancora
  tradotta (TASK-210).

## Esito

### 2026-10-05

**Fatto** (ADR-0204), solo nell'app:

- `src/paddle/placeSpots.ts` (nuovo): `findSpots` legge il testo come un
  indirizzo sull'elenco di `waterSpots.ts`; `spotPlaces` dà al massimo tre
  luoghi con la loro distanza; `distanceOnSpot` dice a quale distanza
  scendere. Le parole comuni sull'elenco di oggi (215 nomi): «lago», «di»,
  «del», «san», «d», «della».
- `PlaceSearch`: `suggest` e `placeholder`, tutti e due facoltativi. I
  luoghi noti si vedono subito e sopra quelli trovati; un'etichetta uguale
  non si ripete; con un lago mostrato non si dice «No place found».
- `ChooseScreen` e `App.tsx` (un import e le righe di `ChooseScreen`) li
  passano solo con «Paddle», e abbassano la distanza su un lago piccolo.
- Un testo nuovo nelle cinque lingue.

**Provato**: 25 test nuovi (la regola sull'elenco vero, il campo con e
senza `suggest`, l'app intera con «Paddle» e con «Run»); tutta la suite
dell'app verde (237 file, 1985 test), lint, typecheck, Prettier. **Non
provato sul telefono**: la prova sull'iPhone è dopo la pubblicazione.

**Emerso**:

- Una via che contiene una parola del nome di un lago mostra quel lago
  sopra le vie («via monte grappa»: due laghi «Monte…»). Detto all'utente
  con la proposta, accettato.
- L'app pubblicata cerca i luoghi con `GET /places` (Geoapify), non con
  Photon: «Via al Lago» veniva da lì. I laghi non passano dall'API.

**Seguiti** (numeri dal coordinatore, niente è partito):

- Altre spiagge nell'elenco: da scegliere con l'utente, provare col
  motore, e la loro acqua sul server con il suo ok.
- La riga «Search for a city or street to start from.» con «Paddle», e le
  righe di stato di «Draw» nelle cinque lingue (TASK-210).
- Il Lago di Ledro e i sette laghi scartati (seguiti di TASK-233): finché
  non sono nell'elenco, qui non si trovano come laghi.
- La prova sull'iPhone: «lago di Levico Terme», Jesolo, un lago da 1 km.
