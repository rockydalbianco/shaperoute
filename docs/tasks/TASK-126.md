# TASK-126 — «Explore»: i percorsi migliori vicino alla partenza

**Stato**: Done, da provare sull'iPhone
**Fase**: 4 · **Branch**: `feat/TASK-126-explore`

Chiesto dall'utente il 2026-10-01: «finisci la programmazione, poi testa
Esplora: mappe delle città e relativi percorsi, verificando quali sono
meglio realizzati e più belli». Variante C del mockup di TASK-092.

## Obiettivo

Dall'app si apre «Explore», si vedono i percorsi del catalogo vicino alla
partenza e se ne apre uno sulla mappa, da esportare in GPX.

## Contesto da leggere

- `docs/tasks/TASK-092.md` (punto 4, variante C), ADR-0097, ADR-0098
- `docs/API.md` («GET /places», per lo stile), `docs/UI.md` («Le due schermate»)

## Cosa fare

1. API: `GET /recommended-routes` e `GET /recommended-routes/{id}` dai file
   di `catalog/seed/`, con test e fixture condivisi.
2. App: la schermata «Explore», il pulsante nella prima schermata, il
   percorso scelto sulla mappa con «Export GPX».
3. Prova: l'API col catalogo vero; per ogni città i percorsi guardati a
   occhio, i meglio riusciti e i più belli annotati.

## Criteri di accettazione

- [ ] Gli endpoint rispondono come i fixture di `shared-types`; test verdi.
- [ ] L'app mostra l'elenco, filtra, apre un percorso, esporta il GPX;
      test verdi, lint e tipi puliti.
- [ ] Le città del catalogo guardate una per una, con i migliori annotati.

## File toccati

```
services/api/shaperoute_api/recommended.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/__main__.py
services/api/tests/test_recommended.py
services/api/tests/fixtures/catalog/*
packages/shared-types/fixtures/recommended-routes.json
packages/shared-types/fixtures/recommended-route.json
apps/mobile/App.tsx
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/explore/*
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-126.md
docs/tasks/TASK-125.md   (solo lo stato: Done, dopo il merge di #123)
samples/LOG.md
```

## Fuori scope

- Il database (TASK-114) e i percorsi degli utenti nel catalogo.
- «Start» con le indicazioni di svolta sui percorsi di «Explore».
- Il catalogo nell'immagine Docker.

## Dove sono arrivato (2026-10-01, 17:10)

- API e app fatte, test verdi (API 232, app 502), lint e tipi puliti.
- Provata l'API vera sul catalogo di TASK-125 (porta 8002): 19–33
  percorsi per città, 46 KB l'elenco di Milano, 404 per un id che non c'è.
- L'app non si è potuta provare su questo Mac (niente simulatore iOS):
  va provata sull'iPhone dopo il merge e `eas update` (`DEPLOY.md` A.6).
- Le 6 città guardate una per una (`samples/LOG.md`): 36 percorsi
  illeggibili tolti in TASK-125 (`UNREADABLE`), i più belli annotati.
- Il catalogo vero arriva con il merge di TASK-125; prima, in `main` la
  lista è vuota.

## Esito

Mergiato con la PR #124.
