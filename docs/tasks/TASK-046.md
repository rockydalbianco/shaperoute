# TASK-046 — Applicare il tema all'app

**Stato**: In corso · TASK-041 mergiato; il branch si riporta su `main`
appena TASK-045 è mergiato
**Fase**: 4 · **Branch**: `feat/TASK-046-apply-theme`

## Obiettivo

L'app smette di essere grigia e chiara e diventa Sgrava: mappa scura,
percorso giallo, pannello scuro. Nessun colore scritto a mano fuori da
`theme/tokens`.

## Perché aspetta

Questo task tocca i file dove atterra anche il percorso aperto. Partire
prima che TASK-041 sia chiuso significa risolvere gli stessi conflitti due
volte. Il branch parte **dopo** il merge di TASK-041 e TASK-045.

## Contesto da leggere

- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/map/mapStyle.ts`
- `docs/UI.md`

## Cosa fare

**1. La mappa** — in `src/map/mapPage.ts`:

- sostituire `MAP_STYLE_URL` con `sgravaDarkStyle`, serializzato nella
  pagina come gli altri valori (`JSON.stringify`);
- `ROUTE_COLOR` e `ROUTE_WIDTH` vengono da `route` dei token;
- `START_HERE_COLOR` viene da `color.startHere`;
- il fondo della pagina HTML passa a `color.map.background`, così il
  bianco non lampeggia mentre la mappa carica;
- l'attribuzione OSM ora arriva dalla sorgente dello stile: verificare che
  compaia ancora una volta sola, non due.

**2. Il pannello** — in `src/route/RoutePanel.tsx`: sostituire i colori
scritti a mano (`#ccc`, `#666`, `#333`, `#999`, `#d6336c`, `#b42318`,
`#fff`) con i token. Il pulsante «Draw route» è giallo con testo scuro. I
`warnings` del risultato usano `color.warning`, i problemi `color.error`.

**3. Le altre due schermate** — stessa sostituzione in `App.tsx` e
`src/places/PlaceSearch.tsx`.

**4. I bersagli da toccare** — ogni `Pressable` arriva ad almeno
`MIN_TAP_SIZE` di altezza. Oggi diversi sono più bassi.

## Criteri di accettazione

- [x] `grep` per `#` nei file di interfaccia non trova più colori scritti a
      mano: vengono tutti da `theme/tokens`.
- [ ] Sull'iPhone: mappa scura, percorso giallo ben visibile sopra le
      strade, pannello scuro, testo leggibile.
- [x] **Le etichette dei luoghi si vedono.** Se mancano, il font stack di
      `mapStyle.ts` non è fra quelli che OpenFreeMap serve: è l'unico
      punto che i test non possono verificare, e fallisce in silenzio.
      (Nel browser: sì. Sul telefono: da vedere.)
- [x] L'attribuzione OpenStreetMap è presente e compare una volta sola.
- [x] Il marcatore «Start here» si distingue dal percorso.
- [x] `npm run typecheck`, `npm run lint`, `npm test` puliti.
- [ ] Una schermata dell'app sul telefono allegata alla PR.
- [ ] `docs/STATUS.md` aggiornato.

## File toccati

```
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPage.test.ts
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/places/PlaceSearch.tsx
apps/mobile/App.tsx
docs/UI.md
docs/STATUS.md
```

`docs/UI.md` aggiunto dall'agente all'avvio: dice che «Start here» è verde
e che il tema non è ancora applicato, e smetterebbe di essere vero.

## Fuori scope

- Cambiare testi, etichette o lingua dell'interfaccia: solo colori,
  spaziature e dimensioni.
- Cambiare il comportamento di una schermata, o aggiungerne una.
- Animazioni. Vengono dopo, su un layout fermo.
- Il tema chiaro: l'app è scura e basta, finché qualcuno non lo chiede.

## Nota sulla verifica

I test dimostrano che lo stile è ben formato, non che è **bello** né che
le tile rispondono. Il giudizio resta quello a occhio sul telefono, come per
le forme: guardare la mappa di Levico di sera, che è il caso reale.

## Esito

*(in attesa della prova sull'iPhone)*

Fatto: nessun colore scritto a mano nelle tre schermate e nella pagina
della mappa, ogni `Pressable` alto almeno `MIN_TAP_SIZE`, 207 test verdi.
La pagina della mappa, generata dal codice e aperta nel browser con un
percorso finto a Trento: mappa scura, percorso giallo ben visibile, «Start
here» ciano, nome «Trento» leggibile, attribuzione intera una volta sola.

Scelte dell'agente su delega dell'utente, oltre ai colori:
- **Testi senza colore**: «km», le forme da toccare, i luoghi trovati, il
  risultato non avevano un colore e sul fondo scuro sarebbero neri su nero:
  ora usano `text` o `textMuted`.
- **Segnaposto della partenza chiaro** (`text`): quello di MapLibre è un
  azzurro che accanto al ciano di «Start here» si confonde.
- **I comandi secondari sono neutri** («My position», «Search» erano blu),
  «Open Settings» è sottolineato: il giallo resta a «Draw route».
- **Tastiere scure e barra di stato chiara**, e il fondo della WebView
  scuro, così la mappa non lampeggia bianca.
- **La TileJSON che non arriva è un errore della mappa**: prima lo era lo
  stile di liberty che non arrivava; ora lo stile è nella pagina, e senza
  questa regola una rete che non raggiunge OpenFreeMap darebbe una mappa
  vuota senza messaggio.
- Lo stile entra nella pagina con i `<` protetti (`<`): l'attribuzione
  contiene `</a>`.

Non fatto, fuori scope: il titolo dice ancora «ShapeRoute», e i testi
«Location is off for ShapeRoute…» anche (cambiare i testi non rientra nel
task).
