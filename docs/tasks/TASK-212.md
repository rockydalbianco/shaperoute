# TASK-212 — Il logo di Sgrava dopo «Save»

**Stato**: Done (2026-10-03)
**Fase**: 4 · **Branch**: `feat/TASK-212-saved-logo`
**Dipende da**: TASK-172 («Save» a fine corsa), TASK-179 (l'animazione
all'avvio, il suo giallo e il suo logo), tutti e due in `main`

## Obiettivo

Finita un'attività, toccato «Save», si vede il logo di Sgrava. Chiesto
dall'utente il 2026-10-03: «Finita l'attività, quando la salvi deve
uscire il logo di Sgrava».

## Contesto da leggere

- `docs/UI.md`, «L'animazione all'avvio» e «La fine della corsa»
- `docs/DECISIONS.md` ADR-0140 («Save» e «Discard»), ADR-0147 (l'animazione
  all'avvio)
- `apps/mobile/src/activities/RunEnd.tsx`, `apps/mobile/src/intro/`

## Cosa fare

1. Un componente nuovo, `src/intro/SavedLogo.tsx`: sul giallo `accent`
   dell'avvio, il logo intero (la stessa immagine di `LaunchIntro`), che
   cresce un poco mentre il giallo sale; fermo un momento; poi la
   dissolvenza sull'app. Un tocco lo manda via prima. Al lettore di schermo
   dice «Saved to My activities».
2. Lo strato che lo mostra sta in `Root.tsx`, sopra l'app e sotto
   l'animazione d'avvio; parte quando `RunEnd` chiama `showSavedLogo()`.
3. `RunEnd.tsx`: dopo un «Save» riuscito (`onSave()` vero) il logo. Niente
   logo se il telefono non riesce a tenere la corsa, né a «Discard».
4. Test deterministici; `UI.md`, `STATUS.md`, ADR-0174.

## Criteri di accettazione

- [x] Dopo «Save», con la corsa tenuta, si vede il giallo col logo di
      Sgrava, poi l'app dove «Save» portava già.
- [x] Senza rete, la corsa che aspetta sul telefono ha il logo lo stesso
      (scelta dell'utente, 2026-10-03: «Sì, sempre»).
- [x] Se il telefono non tiene la corsa («This run could not be kept on
      the phone. Try again.») e a «Discard» non c'è logo.
- [x] Il logo dura meno dell'animazione d'avvio, e un tocco lo chiude.
- [x] `App.tsx` non cambia; i test di «My activities» passano senza
      cambiare.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/intro/SavedLogo.tsx (nuovo)
apps/mobile/src/intro/SavedLogo.test.tsx (nuovo)
apps/mobile/src/intro/Root.tsx
apps/mobile/src/activities/RunEnd.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-212.md
```

`RunEnd.tsx` è anche nei file della parte B di TASK-208, non ancora
partita: qui cambiano solo le righe di `save()`.

## Fuori scope

- Il logo a «Done» senza account (non salva niente), o quando si salva
  qualcos'altro (profilo, preferiti, una corsa riaperta).
- Il disegno della corsa sul giallo, un suono, una vibrazione: nessuno li
  ha chiesti.
- Pubblicare l'app: vuole l'ok dell'utente (`AGENTI.md`, punto 9).

## Esito

Fatto: dopo un «Save» riuscito sale il giallo dell'avvio con il logo di
Sgrava, 1,65 s, poi la mappa; un tocco lo chiude prima (ADR-0174). Anche
senza rete, per scelta dell'utente. 10 test nuovi in `SavedLogo.test.tsx`
(il logo, i tempi, il tocco, lo strato in `Root`, «Save» riuscito o no e
«Discard» in `RunEnd`); app 1359 test verdi, `App.tsx` intatto. Visto nel
simulatore (iPhone 17e, Expo Go) con il logo tenuto fermo a mano: giallo
pieno, logo nero al centro (`out/saved-logo/`, fuori da git). **Resta**:
pubblicare l'app (ok dell'utente) e la prova sull'iPhone.
