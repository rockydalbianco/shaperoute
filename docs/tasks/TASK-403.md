# TASK-403 — «Edit the drawing» sotto le opzioni A, B e C del risultato di «Draw»

**Stato**: Done · 2026-11-05 · documenti nella #854, codice nella PR di
`feat/TASK-403-edit-under-choices` (via del Coordinatore sulla lista dei
file). Esito: il tasto è tornato sotto A, B e C e apre la linea
dell'opzione scelta; test toccati, `tsc` e lint verdi in locale.
**Fase**: 5 · **Branch**: `docs/TASK-403-edit-under-choices` (documenti); poi
`feat/TASK-403-edit-under-choices` · **ADR**: ADR-0337

Numero e ADR dal Coordinatore (2026-11-05: TASK-403, ADR-0337). Rovescia
l'aggiunta di ADR-0288 (TASK-340) e la scelta 7 di ADR-0313 (TASK-369), che
restano scritte come sono.

## Obiettivo

Sotto il percorso disegnato da «Draw», quando l'app propone le opzioni A, B
e C, torna il tasto **«Edit the drawing»**: mette la linea dell'opzione
scelta sulla mappa di «Draw on the map», dov'è e grande com'è, per
modificarla con il dito e chiedere di nuovo il percorso.

## Contesto

Richiesta dell'utente del 2026-11-05, parola per parola:

> Possibilità di di modificare anche quando seleziono quando fai tu il
> calcolo del disegno tipo il coniglio poi mi dai le tre opzioni AB e C però
> lì non c'è la possibilità di modificare l'immagine

Il tasto c'era (TASK-320, TASK-331) e l'utente l'aveva fatto togliere il
2026-10-29 (TASK-340: «TOGLI LA FUNZIONE MODIFICA IL DISEGNO IN DRAW»); il
2026-11-04, nella scelta 7 di TASK-369, aveva detto «No, resta tolto».
Ricordati i due «no», alla proposta «sotto A/B/C torna "Edit the drawing",
l'opzione scelta si apre sulla mappa dov'è stata calcolata; per le emoji si
modifica la linea del percorso, non la figura» l'utente ha risposto **«Sì,
rimettilo»** (2026-11-05).

Com'è oggi (`main` a `d81b3c52`, dal codice):

- `App.tsx` passa a `RouteOutcome` (`route/RoutePanel.tsx`) le opzioni
  (`choices`, `chosen`, `RouteTiles`) e, in `figures`, la fila di
  `FigureTiles` («Another figure», TASK-286). Niente «Edit the drawing»:
  `EditDrawingButton.tsx` è stato cancellato da TASK-340.
- Sulle schede (Feed, Explore, percorsi a tema, disegni degli iscritti)
  «Edit the drawing» c'è: `editTrackOf(track)` in `App.tsx` chiude la scheda
  e chiama `mapDraw.editInPlace(lines, centre, unitM)`; la linea viene da
  `routeTrack(points)` / `trackInPlace` (`route/figureLines.ts`, TASK-346,
  TASK-369), e `cardTrack` scarta quella che non fa un disegno.

## Cosa fare

1. **`route/EditDrawingButton.tsx`** (nuovo, come prima di TASK-340): il
   tasto neutro «Edit the drawing», con il testo già tradotto in cinque
   lingue. Nessun testo nuovo.
2. **`App.tsx`**, due punti piccoli:
   - `resultTrack`: con il percorso arrivato, `cardTrack(routeTrack(chosen.points))`,
     cioè la linea dell'opzione **scelta** (A, B o C), dov'è;
   - in `figures` di `RouteOutcome`, dopo `FigureTiles`, il tasto con
     `editTrackOf(resultTrack)`, lo stesso delle schede.
3. **Test** (file nuovo `__tests__/AppEditResult.test.tsx`): il tasto c'è
   sotto A/B/C; con B scelta, il tocco apre la mappa con la linea di B, senza
   chiamate all'API prima di «Draw route»; «Draw route» chiede un disegno
   (`/image-route-jobs`) da dove parte B.
4. **Documenti**: `UI.md` («Edit the drawing: la figura sulla mappa»), STATUS,
   questo file a `Done`. Il test di TASK-340 che dice «sotto il risultato
   niente Edit» (`AppEditDrawing.test.tsx`) si allinea; quello di
   `DrawOnMapApp.test.tsx` riguarda «Draw» prima del percorso e resta.

## Scelte prese dall'agente su delega

- **La linea dell'opzione scelta, non la figura chiesta**: come le schede da
  TASK-369 (un'emoji e una parola danno la loro traccia, ADR-0313). È anche
  quanto proposto all'utente («per le emoji si modifica la linea del
  percorso, non la figura»).
- **Anche dal risultato di un disegno a mano** («Freehand»): il tasto mette
  la linea dell'opzione scelta, non il disegno di partenza; «←» dal
  risultato torna come oggi al disegno di partenza.
- **In ogni sport che arriva al risultato con A, B e C**, sull'acqua e a
  nuoto compresi, come le schede (TASK-369 B). Sci e palestra non hanno
  risultato di «Draw».
- **Dove**: subito sotto «Another figure», sopra «Start», dove stava prima
  di TASK-340.
- Solo JS, nessun cambio a contratto, motore o API; impronta iOS invariata.

## File toccati

- `docs/tasks/TASK-403.md` (nuovo)
- `docs/DECISIONS.md` (ADR-0337 in fondo)
- `docs/STATUS.md` (una riga in «In lavorazione», poi in «Completato»)
- `docs/INDEX.md` (una riga)
- `docs/UI.md` (parte del codice)
- `apps/mobile/src/route/EditDrawingButton.tsx` (nuovo)
- `apps/mobile/App.tsx` (due punti)
- `apps/mobile/__tests__/AppEditResult.test.tsx` (nuovo)
- `apps/mobile/__tests__/AppEditDrawing.test.tsx` (solo le righe che dicono
  «niente Edit sotto il risultato»)

## Criteri di accettazione

- [x] Sotto il risultato di «Draw» c'è «Edit the drawing» quando la linea
      dell'opzione scelta fa un disegno.
- [x] Il tocco apre la mappa di «Draw on the map» con la linea dell'opzione
      scelta (A, B o C), dov'è e grande com'è, e niente parte verso l'API
      prima di «Draw route».
- [x] Test deterministici verdi in locale per i file toccati, `tsc` verde.
- [x] Impronta iOS invariata (nessun file nativo né dipendenza).
