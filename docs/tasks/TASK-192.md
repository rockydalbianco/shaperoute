# TASK-192 — «Explore»: il paese scelto ha sempre i suoi percorsi

**Stato**: Done
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
di Levico fra 3,3 e 4,3 km: li mostra, e da Caldonazzo non disegna niente.
Con TASK-176 cambia poco: le forme che Levico ha (stella, luna, cavallo,
farfalla) contano come già avute.

## Dipendenze

**TASK-176 in `main`** (dal 2026-10-02, #199): riscrive le stesse righe di
`ExploreScreen.tsx`. Questo branch l'ha aspettato e parte da lì.

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

- [x] Scelta Caldonazzo, le prime schede sono cuore, cerchio e stella di
      5 km disegnati da Caldonazzo; sotto ci sono i percorsi di Levico, con
      «Levico» e la distanza.
- [x] Vale per ogni luogo scelto, frazioni comprese (Barco): conta il punto
      scelto, non il nome.
- [x] Una città con percorsi suoi (Levico, Trento) resta com'è con
      TASK-176: le sue schede, più le forme che non ha.
- [x] Il raggio di «near you» resta 5 km; l'API non cambia.
- [x] Senza città scelta niente cambia.
- [x] Nessuna dipendenza nuova; colori dai token; testi in inglese.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Prova con il dito sull'iPhone (dell'utente, dopo la pubblicazione).

## File toccati

```
apps/mobile/src/explore/ownRoutes.ts               (nuovo)
apps/mobile/src/explore/ownRoutes.test.ts          (nuovo)
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreOwnRoutes.test.tsx  (nuovo)
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

Fatto il 2026-10-02. Scelto un luogo, un percorso è suo solo se parte entro
1,5 km dal punto scelto (`OWN_RADIUS_M`, dai dati del catalogo: ADR-0155);
Caldonazzo e Barco hanno prima cuore, cerchio e stella dal loro centro e
poi le altre forme, e sotto «NEAR CALDONAZZO» i percorsi di Levico. I test
della schermata sono in un file nuovo, `ExploreOwnRoutes.test.tsx`, come
quelli di TASK-176; quelli che c'erano passano senza modifiche. La soglia
di 1000 m di `ownCityName` (TASK-176) è diventata la stessa `OWN_RADIUS_M`.
Solo test (1055 verdi): non visto in un simulatore. Il motore sul Mac
disegna da Caldonazzo a 5 km: cuore 0,88, cerchio 0,72, stella 0,90.

Rimandato, scritto in `STATUS.md` e nell'ADR: «Near me» da un paese senza
percorsi suoi mostra ancora solo i vicini (scelta dell'utente); i paesi
piccoli non sono disegnati in anticipo sul server; la prova sull'iPhone.
