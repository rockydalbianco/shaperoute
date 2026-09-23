# TASK-026 — Distanza libera

**Stato**: In corso
**Fase**: 2 · **Branch**: `feat/TASK-026-free-distance`

## Obiettivo

L'utente scrive la distanza che vuole in un campo, al posto dei quattro
pulsanti, e l'app gli dice subito se è fuori dai limiti. I percorsi oltre
15 km sono misurati, e l'app offre solo le distanze che arrivano davvero.
È l'ultimo task della fase 2: alla fine il MVP di `PRODUCT.md` è completo.

## Contesto da leggere

- `docs/ROADMAP.md` fase 2, «Richiesta dell'utente (2026-09-23)»
- `docs/UI.md` «Forma e distanza», «Chiedere un percorso»
- `docs/API.md` «Tempi»; `docs/MAPS.md` «Overpass: come si scarica»,
  «Area scaricata»
- `docs/DECISIONS.md` ADR-0016 (limiti del motore), ADR-0023, ADR-0031,
  ADR-0032
- `apps/mobile/src/route/RoutePanel.tsx`, `apps/mobile/App.tsx`
- `packages/shared-types/src/index.ts` (`MIN_DISTANCE_M`, `MAX_DISTANCE_M`)

## Cosa c'è già

- La distanza si sceglie fra 3, 5, 10 e 15 km (`DISTANCES_KM` in
  `RoutePanel.tsx`): le distanze con tempi conosciuti (ADR-0031). Il motore
  e il contratto accettano da 1 a 50 km (ADR-0016).
- Oltre 15 km non c'è mai stata una prova. La zona da scaricare cresce con
  il quadrato della distanza (calcolata con `zone_area` del motore, cerchio
  a Trento):

  | Distanza | Zona | Rispetto a 15 km |
  |---|---|---|
  | 15 km | 12,5 × 12,5 km = 157 km² | 1× (a Trento 28 MB di GraphML e 12 di pickle) |
  | 21 km | 16,7 × 16,7 km = 280 km² | circa 1,8× |
  | 30 km | 23 × 23 km = 530 km² | circa 3,4× |
  | 42 km | 31 × 31 km = 990 km² | circa 6× |
  | 50 km | 37 × 37 km = 1.370 km² | circa 9× |

  In proporzione, una zona da 50 km peserebbe sui 350 MB su disco, più le
  risposte grezze di Overpass, e l'API ne tiene due in memoria (ADR-0030).
  Sul disco C: ci sono 5,7 GB liberi, dopo la pulizia di oggi: le zone da
  21 e 30 km di Trento ci stanno (circa 70 e 140 MB, in proporzione).
- Il 15 km a Trento richiede circa 30 s di calcolo (TASK-025). Da questo PC
  Overpass risponde solo quando il DNS dà l'indirizzo buono (`MAPS.md`).

## Cosa fare

1. **Confermato dall'utente il 2026-09-23**: A–E come proposte. La nuova
   ADR si scrive nella PR che implementa.
   - **A. Il campo.** Un campo «km» con il tastierino numerico con la
     virgola. Accetta interi e un decimale, con il punto o con la virgola:
     `7`, `7,5`, `7.5`. La richiesta porta `distance_m` intero (7,5 km →
     7500). Di partenza c'è 5. Con un valore non valido, sotto il campo
     compare «Enter a distance between 1 and N km.» e «Draw route» resta
     spento.
   - **B. Via i pulsanti delle distanze**, come chiesto: niente
     scorciatoie. La forma resta a pulsanti: la forma libera è fase 4.
   - **C. Il limite dell'app lo decidono le misure.** Si misurano 21 km
     (mezza maratona) e 30 km a Trento, cuore e cerchio, dall'API: tempo di
     download della zona, tempo di calcolo, somiglianza, spazio su disco.
     L'app offre fino alla distanza più lunga che finisce entro i 5 minuti
     di attesa (ADR-0032) e che il disco regge; il limite del motore e del
     contratto resta 50 km. Proposta di partenza, da confermare con i
     numeri: **21 km**. Il limite dell'app sta in una sola costante.
   - **D. Le zone per le misure** si scaricano con uno script usa-e-getta,
     fuori dal repository, che forza l'indirizzo di Overpass che risponde,
     come in TASK-015 (`MAPS.md`). Il prodotto non cambia.
   - **E. Sopra i 15 km** il pannello avvisa prima della richiesta: «Long
     routes take longer: up to a few minutes.»
2. **Misure** (punto C): zone di Trento per 21 e 30 km, poi cuore e cerchio
   per ogni distanza da `POST /route-jobs`, due volte (zona sul disco, poi
   in memoria). Numeri in `API.md`, «Tempi». Se il limite che ne esce non è
   21 km, ci si ferma e si torna a chiedere.
3. **App**: il campo del punto A al posto dei pulsanti, la conversione in
   metri in una funzione pura, il messaggio fuori limite, l'avviso del
   punto E.
4. **Test** (Jest, deterministici):
   - conversione: `7`, `7,5`, `7.5`, ` 12 ` validi; `0,5`, `abc`, `7,55`,
     vuoto e oltre il limite dell'app non validi;
   - schermata: scrivere la distanza cambia la richiesta; un valore non
     valido spegne «Draw route» e mostra il messaggio; sopra 15 km compare
     l'avviso; cambiare distanza toglie il percorso di prima, come oggi.
5. **Prova sull'iPhone** con l'API avviata con `--lan`: 7,5 km, un valore
   non valido, una distanza lunga a Trento (quella del limite).
6. **Documentazione**: `UI.md`, `API.md` («Tempi»), nuova ADR (superata la
   parte «pulsanti» di ADR-0031), `ROADMAP.md` (fine fase 2), `STATUS.md`.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (132 test nell'app, 7 in
      `shared-types`).
- [x] Ogni caso del punto 4 ha il suo test (`distance.test.ts`,
      `App.test.tsx`).
- [x] Tempi, somiglianza e spazio su disco di 21 e 30 km a Trento scritti
      in `API.md`, «Oltre 15 km»; il limite dell'app scelto con quei
      numeri: 21 km, come proposto.
- [ ] Sull'iPhone un 7,5 km arriva con «target 7.5 km»; un valore non
      valido mostra il messaggio e non parte nessuna richiesta.
- [ ] Sull'iPhone la distanza del limite arriva entro i 5 minuti.
- [ ] I job `mobile`, `api` e `route-engine` della CI sono verdi sulla PR.
- [x] ADR-0034; `UI.md`, `API.md`, `ROADMAP.md`, `STATUS.md` aggiornati.

Differenze dal piano: il tastierino numerico di iOS non ha il tasto invio e
il campo sta in fondo allo schermo, sotto la tastiera. La schermata si
accorcia quando la tastiera si apre (`KeyboardAvoidingView` di React
Native, nessuna dipendenza nuova), e «Draw route» la chiude. A 30 km il
cuore di Trento non si disegna (`shape_not_drawable`, 2,7 km più corto).

## File toccati

```
apps/mobile/App.tsx
apps/mobile/src/route/**
apps/mobile/__tests__/App.test.tsx
docs/UI.md
docs/API.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-026.md
```

## Fuori scope

- Forma libera e forme nuove: fase 4.
- Cambiare i limiti del motore o del contratto (1–50 km, ADR-0016).
- Velocizzare il motore sulle distanze lunghe (`STATUS.md`).
- Correggere nel prodotto l'indirizzo di Overpass che non risponde:
  resta una nota (TASK-025).
- Zone oltre i 30 km: si misurano solo se i 30 km stanno comodi nei 5
  minuti e sul disco.
- Unità diverse dai km (miglia).

## Esito

*(si compila a fine task)*
