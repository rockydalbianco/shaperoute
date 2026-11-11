# TASK-460 — I movimenti dei tasti di «Play»

**Stato**: In corso — codice scritto, PR da aprire dopo il video
**Fase**: app · **Branch**: `feat/TASK-460-play-motion`
**ADR**: — (nessuno riservato) · Numero dato dal Coordinatore il 2026-11-11

## Obiettivo

In «Play» i tasti rispondono al tocco come nel resto dell'app, le schede
«Collection | Challenges» scorrono, le pagine interne entrano di lato, e le
scelte che contano danno un tic leggero del telefono.

Richiesta dell'utente del 2026-11-11, dopo la chiusura di TASK-423:
«aggiungi delle animazioni», poi «dei moviemnti di tasti...». Delle quattro
proposte ha scelto «1–4, solo Play» (qui) e «Tutte e 4» (nella sessione
madre); per le schede che scorrono, «Solo Play».

## Contesto da leggere

- `apps/mobile/src/ui/Tap.tsx` (TASK-339, TASK-388: la pressione con la
  molla), `ui/motion.ts`, `ui/useReduceMotion.ts`
- `apps/mobile/src/haptics/haptics.ts` (`selectionFeel`, TASK-361)
- `apps/mobile/src/game/` (TASK-296, TASK-423)

## Cosa fare

1. I tasti e le righe toccabili di «Play» usano `ui/Tap`: sotto il dito si
   rimpiccioliscono un poco e si scuriscono, lasciati tornano con un
   piccolo rimbalzo. Il velo della scheda di sblocco e la sua carta restano
   `Pressable`: non si muovono.
2. `PlayTabs` (nuovo, solo di «Play»): l'aspetto di `screens/Segmented`,
   con la pastiglia scelta che scivola su una molla. Le altre schermate
   con `Segmented` non cambiano.
3. `SlideIn` (nuovo): una collezione, «Prizes» o una squadra aperta entra
   da destra con una dissolvenza; tornando alla lista, questa entra da
   sinistra.
4. Un tic leggero (`selectionFeel`) quando si cambia scheda, si sceglie un
   premio per il profilo, si prende un pezzo di sfida.

Con «Riduci movimento» niente si muove: la pressione scurisce soltanto, la
pastiglia e le pagine sono subito al loro posto.

## Criteri di accettazione

- [ ] I tasti di «Play» rispondono al tocco come nel resto dell'app.
- [ ] Le schede scorrono, solo in «Play».
- [ ] Le pagine interne entrano di lato; con «Riduci movimento», no.
- [ ] Il tic sulle tre scelte, mai altrove.
- [ ] Niente dipendenze né nativo: impronta iOS invariata (6f8bba4c).
- [ ] Un video corto dal simulatore visto dall'utente prima del merge.

## File toccati

```
apps/mobile/src/game/PlayTabs.tsx            (nuovo)
apps/mobile/src/game/SlideIn.tsx             (nuovo)
apps/mobile/src/game/PlayTabs.test.tsx       (nuovo: PlayTabs e SlideIn)
apps/mobile/src/game/PlayScreen.tsx, CollectionList.tsx, CollectionPage.tsx,
  ChallengesTab.tsx, MonthChallengeRow.tsx, PlayOverlay.tsx,
  NewChallenge.tsx, TeamView.tsx, ChallengeView.tsx, PrizesPage.tsx,
  UnlockCard.tsx                             (Pressable → Tap, i tic; in
                                             PrizesPage anche gli angoli
                                             tondi della cornice scelta)
docs/tasks/TASK-460.md                       (nuovo)
```

Non si toccano `screens/Segmented.tsx`, `ui/Tap.tsx`, `haptics/haptics.ts`,
`theme/tokens.ts`. Niente testi nuovi.

## Fuori scope

- I movimenti fuori da «Play» (scelta dell'utente: «Solo Play»).
- Le animazioni di sblocco, collezione, premio (la prima proposta, non
  scelta).

## Cronologia

- 2026-11-11 — Proposta e scelte dell'utente; numero TASK-460 e lista dei
  file approvati dal Coordinatore. Codice scritto: 192 test di `src/game`,
  3 nuovi e `__tests__/AppPlay` verdi sul Mac; impronta iOS su copia pulita
  6f8bba4c, uguale a `main`.
- 2026-11-11 — Video dal simulatore (iPhone 17, Expo Go, una pagina di
  prova con i dati d'esempio, tolta dopo): schede che scorrono, collezione
  e «Prizes» che entrano di lato, la lista che rientra da sinistra, i tasti
  che si rimpiccioliscono. In `out/TASK-460/play-motion.mp4` del checkout
  principale. Simulatore spento dopo. Visto lì: il riquadro della cornice
  scelta in «Prizes» aveva gli angoli vivi, ora tondi come le carte.
- 2026-11-11 — Video visto dall'utente: «Sì, vanno bene». PR #1156.

## Esito

*(a fine task)*
