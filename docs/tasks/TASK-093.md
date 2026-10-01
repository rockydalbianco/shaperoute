# TASK-093 — Scegliere fra più percorsi

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-093-route-choice`

Chiesto dall'utente il 2026-10-01, dopo le prove dall'iPhone di TASK-090:
dalla stessa partenza il percorso è sempre lo stesso, ma basta che il GPS
si sposti di qualche decina di metri per averne un altro, a volte più
bello. Era fra le idee non approvate (`PASSAGGIO.md`, `AGENTI.md`,
`UI.md` «Domande ancora aperte»: «la ricerca li ha già»).

## Obiettivo

Dopo una richiesta l'app mostra fino a 3 percorsi diversi per la stessa
forma o parola, e l'utente sceglie quello che gli piace; GPX e navigazione
usano quello scelto.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` «Partenze vicine (TASK-076)» e §5
- `docs/DECISIONS.md` ADR-0071 (partenze vicine), ADR-0086 (tutti i
  percorsi salvati; a parità di qualità si tengono tutti)
- `docs/API.md` «Richieste in due tempi»
- `docs/UI.md` «Il risultato»
- `services/route-engine/route_engine/nearby_starts.py` (`plan_nearby`,
  `_choose`), `services/api/shaperoute_api/images.py` (`plan_request`)

## Cosa c'è già

Per una forma o una parola il motore calcola già 4 percorsi: dalla
partenza e da 3 punti vicini (25–100 m, ADR-0071), e ne tiene uno. Gli
altri 3 si buttano. Per un'immagine (`plan_image`) le partenze vicine non
ci sono: un percorso solo.

## Cosa fare

**Prima di scrivere codice, da far scegliere all'utente** (prodotto, una
domanda per volta, con un'immagine della schermata):

1. Come si vedono le alternative. Proposta: sulla mappa il percorso scelto
   pieno e gli altri sottili e grigi; sotto, tre tessere «A · B · C» con km
   e somiglianza in percentuale; tocco una tessera e diventa il percorso
   scelto. Il primo è quello che sceglie il motore oggi.
2. Quanti: proposta fino a 3, solo se davvero diversi (non lo stesso
   percorso spostato di pochi metri) e con somiglianza non più bassa di
   0,10 rispetto al migliore.
3. Per un'immagine: niente alternative per ora, oppure alternative dalla
   ricerca stessa (posizioni o rotazioni diverse della forma). Proposta:
   per ora niente.

**Poi** (scelte tecniche su delega, da registrare in `DECISIONS.md`):

4. Motore: `plan_nearby` restituisce anche i percorsi non scelti, in
   ordine, senza calcolare niente in più (nessun secondo in più).
5. API: `RouteResult` ha un campo nuovo, facoltativo, con le alternative
   (punti, distanza, somiglianza, indicazioni di svolta); contratto in
   `packages/shared-types` e `API.md`. Un'app vecchia lo ignora.
6. App: le tessere, la linea sulla mappa, GPX e navigazione dal percorso
   scelto.
7. Registro delle richieste (ADR-0085): l'esito registra anche le
   alternative (impronta, somiglianza), così il replay le controlla tutte.

Se il lavoro risulta troppo grande per una PR, dividerlo in motore + API e
app, chiedendo il numero del secondo task.

## Criteri di accettazione

- [x] Le scelte 1–3 sono dell'utente e scritte in `DECISIONS.md`
      (ADR-0087): tessere A · B · C; fino a 3, filtrati; anche le immagini.
- [x] Una forma o una parola dà fino a 3 percorsi diversi, il primo
      uguale a quello di oggi punto per punto (test deterministico sul
      grafo di prova; le 8 richieste vere dall'iPhone rifatte uguali).
- [x] ~~Il tempo della richiesta non cresce più di 1 s~~ Cambiato durante
      il lavoro: le indicazioni delle alternative costano 0,03–0,15 s, ma
      dopo un piano già buono le partenze vicine si aspettano fino a 3 s,
      senza le quali le alternative mancavano proprio sui percorsi venuti
      bene. Misurato: 0,6–6,0 s su sette richieste (`ROUTE_ENGINE.md`).
- [x] Un'app che non conosce il campo nuovo funziona come oggi (test di
      contratto; `alternatives?` facoltativo, `/gpx` con e senza).
- [x] Nell'app si sceglie un'alternativa e GPX e mappa la usano (test).
- [x] Provato sull'iPhone dall'utente (2026-10-01): «funziona».

## File toccati

```
services/route-engine/route_engine/alternatives.py      (nuovo)
services/route-engine/route_engine/nearby_starts.py
services/route-engine/route_engine/models.py             (RouteResult.alternatives)
services/route-engine/route_engine/optimizer.py          (Plan.alternatives)
services/route-engine/tests/test_alternatives.py         (nuovo)
services/route-engine/tests/test_nearby_starts.py, test_contract.py
services/api/shaperoute_api/app.py, images.py, jobs.py, schemas.py,
  request_log.py, replay.py
services/api/tests/test_alternatives.py                  (nuovo)
services/api/tests/test_contract.py, test_images.py, test_request_log.py
packages/shared-types/src/index.ts                       (solo RouteResult)
packages/shared-types/fixtures/route-alternatives.json   (nuovo)
packages/shared-types/fixtures/route-result*.json, route-job-done.json,
  gpx-request.json
packages/shared-types/test/contract.test.ts
apps/mobile/App.tsx
apps/mobile/src/route/choices.ts, choices.test.ts, RouteTiles.tsx (nuovi)
apps/mobile/src/route/RoutePanel.tsx, RoutePanel.test.tsx
apps/mobile/src/map/MapView.tsx, mapPage.ts, messages.ts e i loro test
apps/mobile/src/theme/tokens.ts                          (otherRoute)
apps/mobile/src/api/gpx.test.ts
apps/mobile/__tests__/AppChoices.test.tsx                (nuovo)
docs/ROUTE_ENGINE.md, docs/API.md, docs/UI.md, docs/DECISIONS.md,
docs/STATUS.md, docs/tasks/TASK-093.md
```

`App.tsx` è anche di TASK-126 (PR #124): l'utente ha detto di procedere;
chi mergia per secondo unisce le due versioni.

## Fuori scope

- «Rigenera» per avere altri percorsi oltre ai 3 (più tempo di calcolo).
- Salvare i percorsi per gli altri utenti: TASK-092.
- Cambiare come il motore sceglie il migliore (`_choose`).

## Esito

Fatto e provato sull'iPhone dall'utente (2026-10-01): «provato,
funziona». Tessere A · B · C, altri percorsi grigi sulla mappa, GPX del
percorso scelto, anche per le immagini; il percorso scelto dal motore è lo
stesso di prima. Commento dell'utente sulla qualità: «ad occhio saprei
farlo un po' meglio il cuore»: è un lavoro sul motore (la forma del cuore e
come la ricerca la mette sulle strade), non su questo task; da proporre
come task a parte se l'utente lo vuole.
