# TASK-167 — «Explore» a schede: due per riga, filtri in una riga

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-167-explore-cards`

Scelto dall'utente il 2026-10-02 fra le proposte grafiche del canvas:
«Pagina Explore a schede». I percorsi diventano schede grandi su due
colonne e i filtri stanno in una riga.

## Obiettivo

In «Explore» il disegno di ogni percorso è la cosa che si vede per prima:
schede a due per riga, e i filtri in una riga sola sopra di loro.

## Contesto da leggere

- `docs/UI.md` «Le due schermate», punto 3 («Explore»)
- `apps/mobile/src/explore/ExploreScreen.tsx`, `CityExamples.tsx`,
  `RouteThumb.tsx` (`thumbSegments`)

## Cosa fare

1. `RouteCard.tsx`: la scheda di un percorso, e di un esempio non ancora
   disegnato.
2. `RouteFilters.tsx`: i filtri in una riga, con le scelte che si aprono
   sotto.
3. `ExploreScreen.tsx`: «Best near you» come griglia di schede, con i
   filtri nuovi.
4. `CityExamples.tsx`: gli esempi di una città come schede.
5. Test; `UI.md`, ADR, `STATUS.md`.

## Criteri di accettazione

- [x] I percorsi di «Best near you» sono schede, due per riga fra i margini
      della pagina, con disegno, somiglianza, forma e km, città e distanza.
- [x] Una scheda toccata apre il percorso come faceva la riga.
- [x] I filtri sono due pulsanti in una riga; un tocco apre le scelte di
      quel filtro, una scelta le chiude e filtra.
- [x] Due filtri che insieme non lasciano niente lo dicono.
- [x] Gli esempi di una città sono schede: pronta si tocca, in attesa dice
      «Drawing…» o «Next» e non è un pulsante.
- [x] Nessuna dipendenza nuova; colori dai token; testi in inglese.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Prova con il dito sull'iPhone.

## File toccati

```
apps/mobile/src/explore/RouteCard.tsx
apps/mobile/src/explore/RouteCard.test.tsx
apps/mobile/src/explore/RouteFilters.tsx
apps/mobile/src/explore/RouteFilters.test.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/explore/CityExamples.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-167.md
```

## Fuori scope

- La città in cima («City») e «Ask for a route» in fondo: restano come
  sono.
- La foto della mappa sotto il disegno, come in «Feed» (TASK-162).
- Le altre proposte del canvas: la pagina «Draw», la scheda del percorso,
  il sistema dei pulsanti.
- `nestedScrollEnabled` per Android.

## Esito

Fatto (2026-10-02, ADR-0135). «Best near you» è una griglia di schede a
due per riga, con il disegno grande; i filtri «Shape» e «Distance» stanno
in una riga e aprono le scelte sotto; gli esempi di una città sono le
stesse schede. 10 test nuovi in due file, più quelli di «Explore» e degli
esempi adattati; 821 test dell'app verdi, lint, typecheck e prettier
puliti. Visto su un simulatore con un'API di prova sul catalogo di Trento:
le schede e un filtro aperto.

**Da provare con il dito sull'iPhone**, con l'app ripubblicata: toccare
una scheda, aprire e chiudere i filtri, lo swipe fra le pagine con la riga
delle scelte aperta.

Seguiti:

- Il componente `RouteThumb` non è più usato dall'app, solo dai suoi test;
  `thumbSegments`, nello stesso file, sì. Si può togliere il componente, o
  tenerlo per la scheda del percorso.
- Gli esempi di una città non visti sul simulatore: servono i download
  delle mappe; li coprono i test.
