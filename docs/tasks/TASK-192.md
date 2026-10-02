# TASK-192 — «Explore»: il paese scelto ha sempre i suoi percorsi

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-192-chosen-town-own-routes` · ADR-0155

Chiesto dall'utente il 2026-10-02: «Premo su Caldonazzo, ma non vengono
fuori suggerimenti a Caldonazzo: mi vengono fuori quelli di Levico perché è
vicino. Va bene dare le alternative, ma bisogna lavorare anche su
Caldonazzo, ad esempio anche le frazioni, Barco eccetera. Va bene tenere
5 km, però bisogna lavorare anche sul paese selezionato».

## Obiettivo

Scelto un luogo in «Explore» — una città, un paese, una frazione — le prime
schede sono percorsi che partono da lì; quelli dei paesi vicini, entro
5 km, restano sotto come alternative.

## La causa

`ExploreScreen.tsx` disegna gli esempi dal centro del luogo scelto solo se
entro 5 km non c'è **nessun** percorso del catalogo. Caldonazzo ha gli otto
di Levico fra 2,7 e 3,6 km: li mostra, e da Caldonazzo non disegna niente.
Con TASK-176 cambia poco: le forme che Levico ha (stella, luna, cavallo,
farfalla) contano come già avute.

## Dipendenze

**TASK-176 in `main`**: riscrive le stesse righe di `ExploreScreen.tsx` e
`exampleRoutes.ts`. Fino ad allora in questo branch ci sono solo file
nuovi (`ownRoutes.ts`, il suo test, questo task file).

## Contesto da leggere

- `docs/UI.md` «Le due schermate», punto 3 («Explore»)
- ADR-0116 (gli esempi di una città), ADR-0136 (gli esempi tenuti
  sull'API: solo dai centri scelti, mai dalla posizione), ADR-0144
  (TASK-176: le forme in più, le forme che una città «ha»)
- `apps/mobile/src/explore/ExploreScreen.tsx`, `exampleRoutes.ts`,
  `CityExamples.tsx`

## Cosa fare

1. `ownRoutes.ts` (nuovo): `byPlace(routes)` separa i percorsi vicini in
   quelli **del luogo** (partenza entro `OWN_RADIUS_M` dal punto scelto) e
   quelli **dei vicini** (il resto, entro i 5 km). La soglia viene dai dati
   del catalogo: vedi ADR-0155.
2. `ExploreScreen.tsx`, con una città scelta:
   - le forme che il luogo «ha» sono solo quelle dei percorsi suoi; senza
     percorsi suoi il luogo è come una città senza percorsi consigliati:
     cuore, cerchio e stella dal suo centro, annunciati subito, poi le
     altre forme (TASK-176);
   - sotto, i percorsi dei vicini sotto un'etichetta loro, con paese e
     distanza come già dicono le schede.
3. Senza città scelta («Near me») non cambia niente: tutti i percorsi entro
   5 km, nessun esempio disegnato (ADR-0136).
4. Test; `UI.md`, ADR-0155, `STATUS.md`.

## Criteri di accettazione

- [ ] Scelta Caldonazzo, le prime schede sono cuore, cerchio e stella di
      5 km disegnati da Caldonazzo; sotto ci sono i percorsi di Levico, con
      «Levico» e la distanza.
- [ ] Vale per ogni luogo scelto, frazioni comprese (Barco): conta il punto
      scelto, non il nome.
- [ ] Una città con percorsi suoi (Levico, Trento) resta com'è con
      TASK-176: le sue schede, più le forme che non ha.
- [ ] Il raggio di «near you» resta 5 km; l'API non cambia.
- [ ] Senza città scelta niente cambia.
- [ ] Nessuna dipendenza nuova; colori dai token; testi in inglese.
- [ ] Test, lint, typecheck e prettier verdi.
- [ ] Prova con il dito sull'iPhone (dell'utente, dopo la pubblicazione).

## File toccati

```
apps/mobile/src/explore/ownRoutes.ts               (nuovo)
apps/mobile/src/explore/ownRoutes.test.ts          (nuovo)
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-192.md
```

## Fuori scope

- «Near me» da Caldonazzo: dalla posizione di qualcuno non si disegna
  niente (ADR-0136); restano i percorsi entro 5 km. Cambiarlo è una scelta
  dell'utente.
- Il catalogo: percorsi di Caldonazzo o delle frazioni disegnati prima e
  tenuti nel catalogo (`catalog/seed/`), e `draw_examples` sul server per i
  paesi piccoli. Gli esempi di un paese nuovo aspettano la prima volta
  (zona da scaricare), poi restano sull'API (TASK-168).
- Il testo di `CityExamples.tsx` e l'API.

## Esito

*(a fine task)*
