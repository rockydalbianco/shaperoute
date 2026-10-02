# DATABASE — Persistenza

Da TASK-110 (ADR-0114, ADR-0115). Lo schema qui sotto è quello di
partenza: ogni task lo crea con la sua migrazione e aggiorna questo file.

## Dove e come

- **PostgreSQL 16 con PostGIS**, in Docker sulla stessa VM dell'API
  (ADR-0115; ADR-0114 la voleva su Oracle, l'API pubblicata oggi è su
  Hetzner): il servizio `db` di `deploy/compose.yaml` (TASK-122). L'indirizzo del database solo in `.env`
  (`SHAPEROUTE_DATABASE_URL`), mai da riga di comando: contiene una
  password. Codice in `services/api/shaperoute_api/db.py`.
- **Migrazioni**: `services/api/migrations/NNNN_cosa.sql`, applicate
  all'avvio dell'API in ordine, una transazione ciascuna, registrate in
  `schema_migrations`. Una migrazione già in `main` non si modifica mai:
  se ne scrive un'altra.
- **Accesso dal codice**: psycopg 3, SQL scritto a mano, senza ORM.
- **Coordinate**: geometrie in WGS84 (SRID 4326), punti in `(lon, lat)`
  come vuole PostGIS; all'API e all'app escono `(lat, lon)` come sempre.
  Le distanze si misurano in metri con `geography`.
- **Test**: un database vero usa-e-getta, niente finti
  (`services/api/tests/conftest.py`). I test avviano l'immagine
  `postgis/postgis:16-3.4` con docker, una volta per giro, e danno a ogni
  test un database vuoto, cancellato dopo; con
  `SHAPEROUTE_TEST_DATABASE_URL` usano invece quel server. Senza docker né
  variabile i test del database si saltano sul PC e falliscono nella CI
  (`CI=true`), che ha docker. Sul Mac docker è Colima (`SETUP.md`, 10.4).

## Schema di partenza

| Tabella | Cosa | Chi la crea |
|---|---|---|
| `users` | email (unica, minuscola), hash della password (Argon2id), nome utente (unico, 3–20 caratteri), bio, `role` (`user` o `admin`), quando ha detto di avere 16 anni, data d'iscrizione | TASK-114, TASK-116 |
| `sessions` | hash del token (SHA-256), utente, ultimo uso, scadenza a 90 giorni | TASK-114 |
| `profile_photos` | utente, JPEG quadrato 256 px | TASK-116 |
| `generated_routes` | ogni percorso dell'API (ADR-0086): richiesta, tipo (forma, parola, immagine), distanza, somiglianza, linea, **punto di partenza mostrato** (a più di 500 m da quello vero), centro, data; utente se era entrato, se no nessuno | TASK-092 |
| `favorites` | percorso tenuto fra i preferiti: utente, chiave fatta dall'app sulla linea (unica per utente), città, forma o parola e stile, titolo, distanza chiesta e sulle strade, somiglianza, **linea intera**, data | TASK-171 |
| `runs` | corsa salvata: utente, percorso pianificato, traccia (`LineStringM`, M = secondi dall'inizio), **traccia tagliata** (senza 200 m all'inizio e alla fine), punteggio, fedeltà, distanza, durata, titolo, pubblica sì/no, data | TASK-117 |
| `likes` | utente, corsa (coppia unica) | TASK-119 |
| `comments` | corsa, autore, testo (1–500), data, nascosto sì/no | TASK-120 |
| `reports` | chi segnala, cosa (corsa, commento, utente), motivo, data, gestita da e quando | TASK-121 |
| `blocks` | chi blocca, chi è bloccato | TASK-121 |

Tutte le tabelle legate a un utente hanno `ON DELETE CASCADE`: cancellare
la riga di `users` cancella tutto il resto, anche i suoi
`generated_routes` (ADR-0114, punto 7). I percorsi generati senza account
non hanno utente e restano.

## Com'è oggi

Migrazione `0001_users_sessions.sql` (TASK-114, ADR-0120):

- `users`: `id`, `email` (minuscola, unica), `password_hash` (Argon2id),
  `username` (3–20 fra lettere, cifre, `_` e `.`; unico con
  `lower(username)`), `role` (`user` o `admin`, default `user`),
  `confirmed_16_at`, `created_at`. La bio arriva con il profilo
  (TASK-116).
- `sessions`: `token_hash` (SHA-256 del token, 32 byte, chiave),
  `user_id` (`ON DELETE CASCADE`), `created_at`, `last_used_at`. Valida
  finché `last_used_at` è più recente di 90 giorni; ogni uso la sposta.
  Una sessione scaduta si cancella quando qualcuno la usa.
- L'estensione PostGIS la crea la prima migrazione che usa una geometria:
  è la `0002` (`CREATE EXTENSION IF NOT EXISTS postgis`); l'immagine la ha
  già.
- Un admin si nomina a mano sulla VM:
  `UPDATE users SET role = 'admin' WHERE email = '…';`

Migrazione `0002_favorites.sql` (TASK-171, ADR-0139):

- `favorites`: `id`, `user_id` (`ON DELETE CASCADE`), `key` (da 8 a 40 fra
  minuscole e cifre, unica con `user_id`), `city`, `shape`, `word`, `style`
  (`round` o `block`), `title`, `distance_m`, `route_m`, `similarity`,
  `line` (`geometry(LineString, 4326)`, punti in `(lon, lat)`),
  `created_at`. Un indice per l'elenco di un utente, dal più recente.
- Il preferito è una **copia** del percorso, non un rimando al catalogo o
  a `generated_routes`: resta com'era anche se il catalogo cambia, e un
  percorso disegnato sul telefono non sta da nessun'altra parte.
- La linea entra come WKT con tutte le cifre e torna con
  `ST_AsGeoJSON(line, 15)`: l'app ritrova gli stessi punti, e quindi la
  stessa chiave.

## Come si memorizza una traccia

In PostGIS, non come GPX su un disco: le domande «vicino a me» e il taglio
dei 200 m si fanno nel database. Una corsa salvata ha due linee: quella
intera, che vede solo il proprietario, e quella tagliata, calcolata al
salvataggio, che vedono gli altri. Gli orari stanno nella coordinata M
della traccia intera. Il GPX si scrive al volo quando serve.

## Copie di sicurezza

Da TASK-122 (ADR-0123, `DEPLOY.md` F.13): `pg_dump` ogni notte sul
server, nel servizio `backup` di `deploy/compose.yaml`, in
`data/backups/`, 13 giorni tenuti; mezz'ora dopo il servizio `offsite` le
manda in uno Storage Box Hetzner, separato dal server (scelta dell'utente,
aggiornamento del 2026-10-02), dove restano le stesse: quelle con più di
13 giorni spariscono anche lì. Così un account cancellato è fuori da ogni
copia entro 14 giorni. Senza Storage Box le copie restano sul server.
`backup.sh check` prova che una copia si ripristina, in un database a
parte; il ripristino vero è in `DEPLOY.md` F.13. ADR-0115 le voleva
nell'Object Storage di Oracle, che non c'è più (l'API è su Hetzner,
ADR-0111).

## Privacy dei dati di posizione

- Agli altri iscritti una corsa arriva solo pubblicata e tagliata; un
  percorso consigliato parte dal punto mostrato, mai da quello vero, e non
  dice chi l'ha chiesto (ADR-0114).
- Senza account non si legge niente degli iscritti.
- Nel database non ci sono indirizzi IP; i log dell'API non hanno
  posizioni (ADR-0092).
- Cancellare l'account cancella tutto, subito; le copie di sicurezza lo
  perdono entro 14 giorni.
- Età minima 16 anni.
