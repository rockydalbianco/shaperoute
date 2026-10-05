# TASK-240 — Con «Paddle», laghi e spiagge anche in «Another place»

**Stato**: In corso (2026-10-05)
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

1. **Come si trova un lago scrivendo un indirizzo** — proposta fatta il
   2026-10-05, *in attesa*: le parole che non sono nel nome di nessun lago
   si ignorano («Terme», «via»); le parole comuni («lago», «di», «del»,
   «san») da sole non bastano se una parola è stata ignorata; i laghi
   stanno sopra le vie e i paesi, al massimo tre, il più vicino per primo,
   subito, senza aspettare la rete.
2. **Il mare** — *da chiedere*: l'elenco ha due spiagge (Jesolo,
   Riccione); gli altri posti di mare restano quelli della ricerca di
   prima, e funzionano solo dove il server ha o riesce a scaricare l'acqua.
3. **Un lago piccolo** — *da chiedere*: scelto un lago le cui forme stanno
   a 1,5 o 1 km, la distanza di «Draw» scende a quella, se era più lunga.
4. **Il testo del campo** — *da chiedere*: con «Paddle», «Lake, beach, city
   or street» al posto di «City or street» (it «Lago, spiaggia, città o
   via», de «See, Strand, Stadt oder Straße», es «Lago, playa, ciudad o
   calle», fr «Lac, plage, ville ou rue»).

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

- [ ] Con «Paddle», «lago di Levico Terme» in «Another place» mostra «Lago
      di Levico» sopra le vie, subito (test).
- [ ] Scelto, la partenza è un punto della riva dell'elenco, e la riga dice
      «Starting from Lago di Levico.» (test).
- [ ] Jesolo e Riccione si trovano allo stesso modo (test).
- [ ] Un lago piccolo scelto porta la distanza a quella delle sue forme; un
      lago da 2 km e una via la lasciano com'è (test).
- [ ] Una via («via al lago», «via Roma, Trento») non mostra laghi (test).
- [ ] Con «Run» e «Bike» la ricerca è quella di prima: nessun lago, lo
      stesso campo, gli stessi test (test).
- [ ] I testi nuovi passano da `t()` nelle cinque lingue; `tables.test.ts`
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

*(a fine task)*
