# TASK-045 — Tema Sgrava: token e stile mappa scuro

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-045-theme-tokens`

## Obiettivo

Tre file nuovi entrano nel repository: i token del marchio e uno stile
MapLibre scuro che li usa. **Nessun file esistente viene toccato.**

## Perché esiste separato

Questo task è pensato per girare **in parallelo** a TASK-041, non dopo.
Il lavoro di design tocca gli stessi tre file dove atterra il percorso aperto
(`App.tsx`, `RoutePanel.tsx`, `mapPage.ts`), quindi due agenti lì dentro si
pestano i piedi. La parte che si può fare in parallelo senza rischio è
esattamente quella che crea **file che non esistono ancora**: nessuno può
avere un conflitto su un file nuovo.

L'applicazione ai file esistenti è TASK-046, e aspetta.

Per la stessa ragione questo branch parte da **`main`**, non dal branch del
task precedente: deve poter essere unito da solo.

## Contesto da leggere

- `docs/UI.md`
- i tre file consegnati, prima di committarli

## Cosa fare

1. Creare il branch da `main`.
2. Mettere i file consegnati ai loro posti:

   ```
   apps/mobile/src/theme/tokens.ts
   apps/mobile/src/map/mapStyle.ts
   apps/mobile/src/map/mapStyle.test.ts
   ```

3. Verificare che siano davvero nuovi: se `src/theme/` esiste già, fermarsi
   e segnalarlo invece di sovrascrivere.
4. `npm run typecheck`, `npm run lint` e `npm test` in `apps/mobile`.
5. Aggiornare `docs/UI.md` con la tavolozza e la regola del giallo
   (sotto, «Decisioni dentro i file»).
6. Registrare la decisione come ADR in `docs/DECISIONS.md`.

## Decisioni dentro i file, da riportare in UI.md e DECISIONS.md

- Il **giallo `#FFD02B` significa una cosa sola**: il percorso, e il comando
  che lo produce. Un avviso giallo renderebbe il colore muto, quindi gli
  avvisi usano `warning` (`#FF7A59`).
- Sul giallo il testo è **scuro**. Il bianco non raggiunge il contrasto
  minimo e diventa illeggibile in pieno sole, che è dove l'app si usa.
- Il marcatore «Start here» passa da verde a **ciano** `#4DD2FF`: su mappa
  scura il verde è spento, e il ciano non può essere scambiato per percorso.
- Lo stile della mappa **non si scarica più** da OpenFreeMap: usa le stesse
  tile, ma i colori li decide `theme/tokens`. Prima erano di un file altrui,
  che poteva cambiare sotto di noi.

## Criteri di accettazione

- [x] I tre file esistono e nessun file preesistente è stato modificato
      (`git diff --stat main` mostra solo aggiunte).
- [x] `npm run typecheck` pulito in modalità strict.
- [x] `npm run lint` pulito.
- [x] `npm test` verde, compresi i 7 test di `mapStyle.test.ts` (ora 8).
- [x] `docs/UI.md` contiene la tavolozza e le quattro regole qui sopra.
- [x] Nuovo ADR in `docs/DECISIONS.md`.
- [x] `docs/STATUS.md` aggiornato.

## File toccati

```
apps/mobile/src/theme/tokens.ts        (nuovo)
apps/mobile/src/map/mapStyle.ts        (nuovo)
apps/mobile/src/map/mapStyle.test.ts   (nuovo)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Qualsiasi modifica a `App.tsx`, `RoutePanel.tsx`, `PlaceSearch.tsx` o
  `mapPage.ts`. **È il punto del task.** Se sembra necessario toccarli,
  il lavoro appartiene a TASK-046.
- Nuove dipendenze npm: non ne servono, e il disco di questo PC è stretto.
- Tradurre i testi dell'app. L'interfaccia è in inglese e resta in inglese.

## Esito

I tre file consegnati sono entrati con due cambi. Gli a capo di Prettier in
`mapStyle.ts` e `mapStyle.test.ts`, perché la CI controlla il formato
(`npm run format:check`). E l'attribuzione: il file diceva solo
«© OpenStreetMap», e in MapLibre l'attribuzione di una sorgente prende il
posto di quella della TileJSON, quindi sulla mappa sarebbero spariti
OpenFreeMap e OpenMapTiles, che le loro licenze chiedono. Ora è la riga
della TileJSON per intero, con un test in più (8 in `mapStyle.test.ts`).
Di codice, solo aggiunte; fra i file esistenti cambiano soltanto `UI.md`
(«Il tema»), `DECISIONS.md` (ADR-0046) e `STATUS.md`. `typecheck`, `lint` e
`format:check` puliti, 202 test verdi.

Verificato in rete, perché i test non possono: la TileJSON di OpenFreeMap
risponde con tutti gli strati che lo stile usa, e `name:it` sui luoghi; il
font «Noto Sans Regular» risponde, ed è lo stesso di liberty. I contrasti
scritti nei token tornano (testo scuro sul giallo 13,5:1, bianco 1,5:1). Se
le etichette si vedano davvero lo dirà il telefono, con TASK-046.

Da sapere per TASK-046: lo stile non ha i nomi delle vie, i numeri civici né
i punti d'interesse, che liberty aveva.
