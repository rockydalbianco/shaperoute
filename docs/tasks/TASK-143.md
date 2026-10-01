# TASK-143 — «Explore»: due categorie, ed esempi subito per una città

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-143-explore-examples`

Chiesto dall'utente il 2026-10-01, dopo la prova di TASK-138 sull'iPhone
(«funziona»): in «Ask for a route» le categorie sono troppe, «solo due e
poi altro con tre puntini»; e scelta una città come Vercelli non esce
niente: «devono partire subito i cuori, le forme più semplici, e gli dai
l'esempio; deve essere immediato».

Cosa mostra oggi una città senza percorsi del catalogo (Vercelli): «No
recommended routes near this start yet». Il catalogo ha percorsi solo per
Trento, Levico, Milano, Roma, Torino e Bologna.

## Obiettivo

«Ask for a route» mostra due categorie e «More…»; scelta una città senza
percorsi consigliati, l'app disegna da sola tre esempi semplici, che si
aprono sulla mappa come un percorso consigliato.

## Contesto da leggere

- ADR-0098 (lista di «Explore»), ADR-0105 (categorie), ADR-0110
- `docs/UI.md` («Explore»)

## Cosa fare

1. «Ask for a route» in un file nuovo (`AskForRoute.tsx`): Food e Famous
   Places, poi «More…» che apre le altre 11. `ExploreTools.tsx` non si
   tocca: è fra i file di TASK-142, in lavorazione.
2. Esempi: scelta una città, se la lista del catalogo è vuota, cuore,
   cerchio e stella da 5 km dal centro (scelta dell'agente, l'utente può
   cambiarla), chiesti uno dopo l'altro a `/route-jobs` (una zona
   scaricata una volta sola), il cuore per primo. Ogni scheda si riempie
   quando il suo percorso arriva; un tocco lo apre sulla mappa con «Export
   GPX», come un percorso consigliato.
3. Gli esempi pronti restano: in memoria e in un file sul telefono, per
   le ultime 8 città. La seconda volta sono immediati. Andare sulla mappa
   non ferma quelli in calcolo; un'altra città sì.
4. Mappa non scaricabile (Overpass) o API spenta: un messaggio e «Try
   again», senza chiedere le altre forme.

## Criteri di accettazione

- [x] Due categorie e «More…»; «More…» mostra tutte le 13.
- [x] Una città senza percorsi consigliati chiede da sola cuore, cerchio e
      stella, uno alla volta; ognuno si apre sulla mappa.
- [x] La stessa città un'altra volta (anche dopo aver chiuso l'app) li
      mostra senza chiederli.
- [x] Una città con percorsi nel catalogo non chiede niente.
- [x] Test verdi (app 565); lint, tipi e formattazione.

## File toccati

```
apps/mobile/src/explore/AskForRoute.tsx
apps/mobile/src/explore/AskForRoute.test.tsx
apps/mobile/src/explore/exampleRoutes.ts
apps/mobile/src/explore/exampleRoutes.test.ts
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/explore/CityExamples.test.tsx
apps/mobile/src/explore/explored.ts
apps/mobile/src/explore/explored.test.ts
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-143.md
docs/tasks/TASK-138.md   (solo l'esito della prova sull'iPhone)
```

## Fuori scope

- Togliere il vecchio `AskForRoute` da `ExploreTools.tsx`: dopo il merge
  di TASK-142 (annotato in `STATUS.md`).
- Salvare gli esempi nel catalogo dell'API, per tutti: il catalogo è
  guardato a occhio (ADR-0097); i percorsi salvati per tutti aspettano il
  database (ADR-0086).
- Scaricare prima le zone delle città: TASK-137.
- `App.tsx` (lo tocca la PR #130, TASK-132).

## Esito

Le stesse richieste dell'app, sull'API del Mac (2026-10-01, dopo il
riavvio del Mac):

| Città | Catalogo entro 5 km | Cuore | Cerchio | Stella |
|---|---|---|---|---|
| Pergine Valsugana | 0 | 4,4 km, 0,87, 2 s | 4,6 km, 0,77, 2 s | 4,8 km, 0,94, 2 s |
| New York | 0 | 5,1 km, 0,98 | 4,9 km, 0,98 | 5,2 km, 0,99 |
| Vercelli | 0 | `map_data_unavailable` dopo 63 s | — | — |

Vercelli dal Mac aspetta Overpass, che rifiuta il Mac. Ma dal 2026-10-01
l'app pubblicata usa l'API sul server Hetzner, da cui Overpass risponde: lì,
con le stesse richieste, Vercelli dà cuore 4,8 km 0,74 in 40 s, cerchio
5,4 km 0,85 in 48 s, stella 4,6 km 0,98 in 5 s (94 s la prima volta, poi la
zona è in cache e gli esempi restano sul telefono). Dal log: il cuore
scarica due zone (il riquadro della forma, poi uno più largo), il cerchio
una terza larga solo 30 m in più per lato, perché una zona si riusa solo se
copre tutto il riquadro (`graphs.py`). Proposto a parte: scaricare le zone
con un margine, dopo il merge di TASK-136, che ha quei file. Il file del componente si chiamava `cityExamples.ts`: sul Mac,
che non distingue le maiuscole, `./CityExamples` prendeva quello; ora è
`exampleRoutes.ts`. La prova sull'iPhone dopo merge ed `eas update`.
