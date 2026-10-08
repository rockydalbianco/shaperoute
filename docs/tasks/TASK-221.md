# TASK-221 — Il cuore su giallo accanto al nome «Sgrava»

**Stato**: Done (2026-10-03)
**Fase**: 4 · **Branch**: `feat/TASK-221-heart-badge`
**Dipende da**: TASK-179 (il cuore dell'avvio, `heartLine.ts`), in `main`;
TASK-220 (il pulsante giallo «Run without a route», #280), che tocca la
stessa schermata: `ChooseScreen.tsx` cambiato dopo il suo merge

## Obiettivo

In cima a «Draw», accanto al nome «Sgrava», il cuore dell'animazione
d'avvio sul suo giallo, come un piccolo logo. Chiesto dall'utente il
2026-10-03: «Dentro l'app, metti il cuore giallo sullo sfondo giallo, a
fianco al nome sgrava».

## Contesto da leggere

- `docs/UI.md`, «Il logo e l'icona» e «L'animazione all'avvio»
- `docs/DECISIONS.md` ADR-0147 (l'animazione all'avvio)
- `apps/mobile/src/intro/heartLine.ts`, `LaunchIntro.tsx`
- `apps/mobile/src/screens/ChooseScreen.tsx`, la riga del titolo

## Cosa fare

1. Un componente nuovo, `src/intro/HeartBadge.tsx`: un quadrato giallo
   `accent` con gli angoli arrotondati, dentro il cuore di Milano
   dell'avvio disegnato fermo, nero `onAccent`, con il punto di partenza.
   Un tratto per ogni pezzo del percorso (niente tagli: non si anima). Solo
   un'immagine: il lettore di schermo legge il nome accanto.
2. `ChooseScreen.tsx`: il cuore a sinistra di «Sgrava», alto quanto il
   titolo. Dopo il merge di TASK-220, ripartendo da `origin/main`.
3. Lo stesso componente serve anche a «Explore» (l'altra sessione, sotto la
   foto del profilo): una regola sola per il cuore su giallo, ADR-0184.
4. Test deterministici; `UI.md`, `STATUS.md`, ADR-0184.

## Criteri di accettazione

- [x] In «Draw», a sinistra di «Sgrava», un quadrato giallo con il cuore
      nero dell'avvio e il suo punto di partenza.
- [x] Il cuore si riconosce alla misura del titolo (visto nel simulatore).
- [x] Il lettore di schermo dice «Sgrava» una volta sola, non il disegno.
- [x] Nessun colore scritto a mano: `accent`, `onAccent`, `text` dai token.
- [x] I test della prima schermata passano senza cambiare.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/intro/HeartBadge.tsx (nuovo)
apps/mobile/src/intro/HeartBadge.test.tsx (nuovo)
apps/mobile/src/screens/ChooseScreen.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-221.md
```

`ChooseScreen.tsx` e `UI.md` sono anche di TASK-220: qui cambiano solo la
riga del titolo e la sezione «Il logo e l'icona».

## Fuori scope

- Il cuore in «Explore»: è dell'altra sessione, che riusa `HeartBadge`.
- Il cuore animato, o tappabile: nessuno l'ha chiesto.
- Il nome «Sgrava» disegnato come il logo invece che scritto.
- Pubblicare l'app: vuole l'ok dell'utente (`AGENTI.md`, punto 9).

## Esito

Fatto: in cima a «Draw», a sinistra di «Sgrava», il cuore dell'avvio
fermo, nero su un quadrato giallo di 32 punti (ADR-0184). Un componente
solo, `HeartBadge.tsx`, che importa il disegno di `heartLine.ts` senza
copiarlo: 98 tratti, uno per pezzo del percorso. 8 test nuovi in
`HeartBadge.test.tsx` (il disegno chiuso, i colori, il lettore di schermo,
il posto accanto al nome); i test di `ChooseScreen.test.tsx` passano senza
cambiare. Visto nel simulatore (iPhone 17, Expo Go): il cuore si
riconosce alla misura del titolo. **Resta**: TASK-222 lo mette in
«Explore»; pubblicare l'app (ok dell'utente) e guardarlo sull'iPhone.
