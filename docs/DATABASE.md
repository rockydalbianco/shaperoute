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
| `profile_photos` | utente, JPEG quadrato 256 px | TASK-178 |
| `generated_routes` | ogni percorso dell'API (ADR-0086): richiesta, tipo (forma, parola, immagine), distanza, somiglianza, linea, **punto di partenza mostrato** (a più di 500 m da quello vero), centro, data; utente se era entrato, se no nessuno | TASK-092 |
| `favorites` | percorso tenuto fra i preferiti: utente, chiave fatta dall'app sulla linea (unica per utente), città, forma o parola e stile, titolo, distanza chiesta e sulle strade, somiglianza, **linea intera**, data | TASK-171 |
| `runs` | corsa salvata: utente, chiave fatta dall'app, percorso pianificato, cosa disegna, traccia (`LineStringM`, M = secondi dall'inizio), pause, inizio, distanza, durata, punteggio, fedeltà, luogo (TASK-172); **traccia tagliata** (senza 200 m all'inizio e alla fine), titolo dato dall'utente, pubblica sì/no (TASK-117) | TASK-172, TASK-117 |
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

Migrazione `0003_runs.sql` (TASK-172, ADR-0140):

- `runs`: `id`, `user_id` (`ON DELETE CASCADE`), `key` (da 8 a 40 fra
  minuscole e cifre, unica con `user_id`), `route`
  (`geometry(LineString, 4326)`) e `route_similarity`, tutti e due o
  nessuno; `shape`, `word`, `style`, `title` (cosa disegna il percorso,
  come in `favorites`: non il titolo che l'utente darà alla corsa, che è di
  TASK-117); `track` (`geometry(LineStringM, 4326)`), `pauses` (`jsonb`),
  `started_at`, `distance_m`, `duration_s`, `score` e `fidelity` (tutti e
  due o nessuno, e solo con un percorso), `place`, `created_at`. Un indice
  per l'elenco di un utente, dall'inizio più recente.
- `track` è la traccia **pulita dal motore**, non quella grezza del
  telefono: le posizioni scartate non tornano. M sono i secondi dalla
  prima posizione, con l'orologio che corre anche nelle pause; `pauses` le
  dice, come `[{"from_s", "to_s", "auto"}]` sullo stesso orologio.
  `started_at` più M dà l'orario di ogni punto. L'altitudine non c'è.
- `distance_m`, `duration_s`, `score` e `fidelity` sono contati dall'API al
  salvataggio (`API.md`, «My activities») e non si ricalcolano: se il
  motore cambia il modo di giudicare, le corse già salvate tengono il loro
  punteggio.
- Solo il proprietario legge una riga. Le colonne per gli altri (traccia
  tagliata, «pubblica», titolo) le aggiunge TASK-117 con la sua migrazione.

Migrazione `0004_profile_photos.sql` (TASK-178, ADR-0146):

- `profile_photos`: `user_id` (chiave, `ON DELETE CASCADE`), `jpeg`
  (`bytea`, da 1 a 200 000 byte), `updated_at`. Una riga per account con
  la foto; senza riga, nessuna foto. Una foto nuova prende il posto di
  quella di prima.
- `jpeg` è il quadrato di 256 px fatto dall'API, mai il file del telefono:
  niente EXIF, quindi niente posizione dello scatto (`API.md`, «Profile
  picture»). Le copie di sicurezza la prendono con il resto (ADR-0115).
- Il nome utente e la bio di TASK-116 vengono con la sua migrazione, la
  `0005`.

## Come si memorizza una traccia

In PostGIS, non come GPX su un disco: le domande «vicino a me» e il taglio
dei 200 m si fanno nel database. Una corsa salvata avrà due linee: quella
intera, che vede solo il proprietario (c'è da TASK-172), e quella
tagliata, calcolata al salvataggio, che vedranno gli altri (TASK-117). Gli
orari stanno nella coordinata M della traccia intera. Il GPX si scrive al
volo quando serve.

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
