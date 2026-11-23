# TASK-350 — Nelle schede di «Explore», prima il disegno e con uno swipe la foto

**Stato**: Done — PR `feat/TASK-350-explore-photo-swipe`; aspetta il merge del Coordinatore
**Fase**: 4 · **Branch**: `feat/TASK-350-explore-photo-swipe` · numero e
ADR-0302 dati dal Coordinatore il 2026-10-30

## Obiettivo

Le schede di «Explore» che hanno una foto mostrano prima il disegno sulla
mappa; con uno swipe si vede la foto della città.

Richiesta dell'utente del 2026-10-30: «In Explorer, le foto non vanno bene.
Bisogna mettere prima l'immagine e poi swipe destra e vedi la foto della
città in caso».

## Contesto da leggere

- `docs/DECISIONS.md`, ADR-0243 e ADR-0287, ADR-0302;
- `docs/UI.md`, «NEARBY TOWNS» e «Le foto dei posti».

## Cosa fare

1. `RouteCard`: con `photo` e una linea, due pagine da scorrere, il disegno
   e poi la foto col suo credito, e due pallini che dicono quale si vede.
   Senza linea, la sola foto.
2. Il tocco sta dentro le pagine, come in `FeedPost`: una `Pressable`
   attorno le bloccherebbe.
3. `NearbyTowns`: nessuna foto finché il disegno è atteso («Drawing…»); un
   paese il cui disegno fallisce mostra la sola foto.
4. `IdeasFromEurope`: niente più forma in piccolo sopra la foto; la mappa si
   prende anche per le schede con foto.

## Criteri di accettazione

- [x] Una scheda con foto apre sul disegno; lo swipe porta alla foto e
      indietro, e i pallini lo seguono.
- [x] Un tocco su una delle due pagine apre la scheda; una scivolata no.
- [x] Dall'ultima pagina lo swipe passa alla fila; le pagine dell'app si
      scorrono ancora.
- [x] Una foto che non si carica lascia il solo disegno.
- [x] Nessun testo nuovo, nessuna dipendenza, server non toccato.

## File toccati

- `apps/mobile/src/explore/RouteCard.tsx`, `RouteCard.test.tsx`
- `apps/mobile/src/explore/NearbyTowns.tsx`, `NearbyTowns.test.tsx`
- `apps/mobile/src/explore/IdeasFromEurope.tsx`, `IdeasFromEurope.test.tsx`
- `docs/UI.md`, `docs/DECISIONS.md`, `docs/STATUS.md`
- `docs/tasks/TASK-350.md`

## Esito

Provato nel simulatore iPhone 17e con l'API del worktree, a Trento: swipe e
ritorno su Sardagna, foto col credito, tocco sulla foto che apre il paese,
passaggio alla fila e alla pagina «Profile». Su «IDEAS FROM EUROPE» si sono
visti i pallini, ma lo swipe è stato provato solo su «NEARBY TOWNS»: il
componente è lo stesso. Android non è stato provato.
