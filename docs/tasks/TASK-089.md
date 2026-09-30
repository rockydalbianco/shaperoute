# TASK-089 — Il suggerimento del luogo si sceglie con un tocco

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-089-place-suggestion-tap`

## Obiettivo

Chiesto dall'utente dopo TASK-085: «la ricerca delle vie è lenta, e una
volta che c'è il suggerimento non riesco a premerlo, devo scriverlo
completamente». Un suggerimento toccato diventa la partenza, e i
suggerimenti arrivano prima.

## Contesto da leggere

- `docs/UI.md`, «Ricerca del luogo»
- `docs/DECISIONS.md`, ADR-0080

## Cosa fare

1. Al tocco: il campo prende il nome del luogo, la tastiera si chiude, la
   riga si illumina mentre è premuta, e la pausa non cerca di nuovo.
2. Mostrare la risposta a un testo precedente finché quella nuova non
   arriva; pausa da 500 a 300 ms.

## Criteri di accettazione

- [x] Dopo il tocco il campo mostra il luogo scelto e nessuna richiesta
      parte più, anche se il tocco arriva subito dopo una lettera.
- [x] Una risposta arriva sullo schermo anche con una ricerca più nuova in
      corso; una più vecchia di quella mostrata no.
- [ ] Provato sull'iPhone dall'utente.

## File toccati

```
apps/mobile/src/places/PlaceSearch.tsx
apps/mobile/src/places/PlaceSearch.test.tsx
docs/tasks/TASK-089.md
docs/DECISIONS.md
docs/STATUS.md
docs/UI.md
```

## Fuori scope

- Cambiare servizio di ricerca o ospitarne uno: Photon pubblico risponde in
  2–3 s (misurato il 2026-09-30 con `curl`, quasi tutto tempo del server).
  È la parte della lentezza che l'app non può togliere: da decidere con
  l'utente.
- `ChooseScreen.tsx`: la `ScrollView` ha già
  `keyboardShouldPersistTaps="handled"`.

## Esito

Fatto nel codice, con i test. Il tocco mancato non si è potuto riprodurre
(su questo Mac non c'è il simulatore): corretti i due casi trovati leggendo
il codice — il tocco entro la pausa dopo una lettera faceva ripartire la
ricerca e riaprire l'elenco; dopo il tocco il campo restava col testo
parziale e la tastiera aperta, come se non fosse successo nulla. Se
sull'iPhone la riga non si illumina al tocco, il tocco non arriva alla riga
e il guasto è nella `ScrollView` di `ChooseScreen`: task nuovo.
