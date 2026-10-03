# TASK-221 — Il cuore su giallo accanto al nome «Sgrava»

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-221-heart-badge`
**Dipende da**: TASK-179 (il cuore dell'avvio, `heartLine.ts`), in `main`;
TASK-220 (il pulsante giallo «Run without a route»), che tocca la stessa
schermata: `ChooseScreen.tsx` si cambia solo dopo il suo merge

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

- [ ] In «Draw», a sinistra di «Sgrava», un quadrato giallo con il cuore
      nero dell'avvio e il suo punto di partenza.
- [ ] Il cuore si riconosce alla misura del titolo (visto nel simulatore).
- [ ] Il lettore di schermo dice «Sgrava» una volta sola, non il disegno.
- [ ] Nessun colore scritto a mano: `accent`, `onAccent`, `text` dai token.
- [ ] I test della prima schermata passano senza cambiare.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

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

*(a fine task)*
