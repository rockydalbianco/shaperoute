# TASK-194 — Il file GPX esportato si chiama «sgrava-….gpx»

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-194-gpx-file-name`

Seguito di TASK-160 (i testi dell'app dicono «Sgrava»), annotato nel suo
«Esito»: il file esportato si chiamava ancora «shaperoute-….gpx». Numero
assegnato dal coordinatore; nessun ADR.

## Obiettivo

Il file GPX che l'utente esporta e vede in File o nelle altre app si
chiama `sgrava-heart-5km-2026-09-23.gpx`, non più `shaperoute-…`.

## Contesto da leggere

- `docs/GPX.md` §«Dal telefono»
- `docs/API.md` §`POST /gpx`
- `services/api/shaperoute_api/app.py`, `gpx_file_name`
- `apps/mobile/src/api/gpx.ts`

## Cosa fare

1. `gpx_file_name` dell'API risponde `sgrava-<nome>-<km>-<data>.gpx`, per
   forme, parole e foto; i test dell'API che leggono
   `Content-Disposition` seguono.
2. Nell'app il nome di riserva, usato quando l'API non ne dà uno
   utilizzabile, passa da `shaperoute.gpx` a `sgrava.gpx`.
3. Controllare che niente nell'app dipenda dal prefisso del nome: l'app
   prende il nome da `Content-Disposition` così com'è, quindi un'API non
   ancora aggiornata che risponde `shaperoute-….gpx` continua a funzionare.
   Un test lo tiene fermo.
4. `docs/API.md` e `docs/GPX.md` dicono il nome nuovo.

## Criteri di accettazione

- [x] `POST /gpx` risponde `Content-Disposition: attachment;
      filename="sgrava-heart-5km-2026-09-23.gpx"` (e `sgrava-CIAO-…`,
      `sgrava-image-…`): `services/api/tests/`.
- [x] Senza un nome dall'API il file si chiama `sgrava.gpx`:
      `apps/mobile/src/api/gpx.test.ts`.
- [x] Un nome `shaperoute-….gpx` dato da un'API di prima resta com'è:
      `apps/mobile/src/api/gpx.test.ts`.
- [x] `git grep "shaperoute-"` in `apps/mobile`, `services/api` e in
      `docs/API.md`, `docs/GPX.md` trova solo il test del punto sopra e i
      nomi dei pacchetti.
- [x] Test, lint e formato verdi in locale, per l'API e per l'app.

## File toccati

```
services/api/shaperoute_api/app.py
services/api/tests/test_gpx.py
services/api/tests/test_images.py
services/api/tests/test_outline_edits.py
apps/mobile/src/api/gpx.ts
apps/mobile/src/api/gpx.test.ts
apps/mobile/src/route/shareGpx.test.ts
apps/mobile/__tests__/App.test.tsx
docs/API.md
docs/GPX.md
docs/STATUS.md
docs/tasks/TASK-194.md
```

## Fuori scope

- I nomi dei pacchetti Python (`shaperoute_api`) e npm (`@shaperoute/...`),
  le variabili `SHAPEROUTE_*`, il repository, le immagini docker, gli
  identificativi dell'app, i percorsi della cache, i nomi delle copie del
  database (`shaperoute-<data>.dump`).
- Il contenuto del GPX: l'attributo `creator` dice ancora «ShapeRoute
  route-engine» (`services/route-engine/route_engine/export_gpx.py`,
  `CREATOR`). È un seguito possibile, non di questo task.
- Aggiornare il server e pubblicare l'app: aspettano l'OK dell'utente.

## Esito

L'API chiama il file `sgrava-<nome>-<km>-<data>.gpx` e l'app, senza un nome
dall'API, `sgrava.gpx`; un'API non aggiornata che risponde ancora
`shaperoute-….gpx` continua a funzionare, con un test. `packages/shared-types`
non aveva il nome in nessun fixture. Sul telefono il nome nuovo arriva solo
dopo l'aggiornamento del server (il nome lo dà l'API) e la pubblicazione
dell'app (il nome di riserva): tutti e due aspettano l'OK dell'utente.
Rimandato: `creator="ShapeRoute route-engine"` dentro il file GPX, annotato
qui in «Fuori scope».
