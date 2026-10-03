# TASK-222 — Il cuore su giallo in «Explore»

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-222-explore-heart`
**Dipende da**: TASK-221 (il componente `HeartBadge`) · **ADR**: ADR-0184

## Obiettivo

In «Explore», sotto l'immagine del profilo, c'è il segno di Sgrava: il
cuore della partenza disegnato in nero sul giallo. Chiesto dall'utente il
2026-10-03: «anche nella sezione explore sotto l'immagine del profilo,
metti il cuore sullo sfondo giallo di sgrava il logo».

## Contesto da leggere

- ADR-0184 (la regola del «cuore su giallo», di TASK-221)
- `apps/mobile/src/intro/HeartBadge.tsx` (TASK-221)
- `apps/mobile/src/explore/ExploreScreen.tsx`, l'intestazione
- `apps/mobile/src/screens/FeedScreen.tsx`: la lente di «Find friends»
  sotto il bottone di «Profile» (TASK-219), lo stesso posto in «Feed»

## Cosa fare

1. Nell'intestazione di «Explore», a destra di «Best near you», il
   `HeartBadge` di TASK-221, grande quanto il bottone di «Profile»
   (`MIN_TAP_SIZE`) e allineato sotto di lui. Nessun componente nuovo: si
   importa quello di TASK-221.
2. Solo un'immagine: non si tocca, e VoiceOver non lo legge (come accanto
   al nome in «Draw»), così l'intestazione si legge come prima.
3. Test in un file nuovo, accanto a quelli di «Explore».

## Criteri di accettazione

- [x] In «Explore» il cuore su giallo è nell'intestazione, dopo il titolo
      «Best near you» (test).
- [x] VoiceOver non lo trova: i testi dell'intestazione restano quelli di
      prima (test).
- [x] Nel simulatore: a destra, sotto l'immagine del profilo, della stessa
      larghezza; il titolo non va a capo (iPhone 17, 402 pt, 2026-10-03,
      con il `HeartBadge` del branch di TASK-221).
- [ ] Test verdi dell'app (typecheck, lint, prettier, jest).

## File toccati

```
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreHeart.test.tsx
docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-222.md
```

## Fuori scope

- Il disegno del cuore, le misure, i colori: sono di TASK-221 e ADR-0184.
- Il cuore in «Feed» o in altre pagine: non chiesto.
- `docs/UI.md`: lo tocca TASK-191 C (PR #255, in pausa); la regola di dove
  sta il cuore è in ADR-0184.
- Pubblicare l'app: solo con l'ok dell'utente.

## Esito

*(a fine task)*
