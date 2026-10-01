# DATABASE — Persistenza

Da TASK-110 (ADR-0112, ADR-0113). Lo schema qui sotto è quello di
partenza: ogni task lo crea con la sua migrazione e aggiorna questo file.

## Dove e come

- **PostgreSQL 16 con PostGIS**, in Docker sulla VM Oracle dell'API
  (ADR-0112). L'indirizzo del database solo in `.env`
  (`SHAPEROUTE_DATABASE_URL`).
- **Migrazioni**: `services/api/migrations/NNNN_cosa.sql`, applicate
  all'avvio dell'API in ordine, una transazione ciascuna, registrate in
  `schema_migrations`. Una migrazione già in `main` non si modifica mai:
  se ne scrive un'altra.
- **Accesso dal codice**: psycopg 3, SQL scritto a mano, senza ORM.
- **Coordinate**: geometrie in WGS84 (SRID 4326), punti in `(lon, lat)`
  come vuole PostGIS; all'API e all'app escono `(lat, lon)` come sempre.
  Le distanze si misurano in metri con `geography`.
- **Test**: un database vero usa-e-getta (PostGIS in Docker, anche nella
  CI); niente finti.

## Schema di partenza

| Tabella | Cosa | Chi la crea |
|---|---|---|
| `users` | email (unica, minuscola), hash della password (Argon2id), nome utente (unico, 3–20 caratteri), bio, `role` (`user` o `admin`), quando ha detto di avere 16 anni, data d'iscrizione | TASK-114, TASK-116 |
| `sessions` | hash del token (SHA-256), utente, ultimo uso, scadenza a 90 giorni | TASK-114 |
| `profile_photos` | utente, JPEG quadrato 256 px | TASK-116 |
| `generated_routes` | ogni percorso dell'API (ADR-0086): richiesta, tipo (forma, parola, immagine), distanza, somiglianza, linea, **punto di partenza mostrato** (a più di 500 m da quello vero), centro, data; utente se era entrato, se no nessuno | TASK-092 |
| `runs` | corsa salvata: utente, percorso pianificato, traccia (`LineStringM`, M = secondi dall'inizio), **traccia tagliata** (senza 200 m all'inizio e alla fine), punteggio, fedeltà, distanza, durata, titolo, pubblica sì/no, data | TASK-117 |
| `likes` | utente, corsa (coppia unica) | TASK-119 |
| `comments` | corsa, autore, testo (1–500), data, nascosto sì/no | TASK-120 |
| `reports` | chi segnala, cosa (corsa, commento, utente), motivo, data, gestita da e quando | TASK-121 |
| `blocks` | chi blocca, chi è bloccato | TASK-121 |

Tutte le tabelle legate a un utente hanno `ON DELETE CASCADE`: cancellare
la riga di `users` cancella tutto il resto, anche i suoi
`generated_routes` (ADR-0112, punto 7). I percorsi generati senza account
non hanno utente e restano.

## Come si memorizza una traccia

In PostGIS, non come GPX su un disco: le domande «vicino a me» e il taglio
dei 200 m si fanno nel database. Una corsa salvata ha due linee: quella
intera, che vede solo il proprietario, e quella tagliata, calcolata al
salvataggio, che vedono gli altri. Gli orari stanno nella coordinata M
della traccia intera. Il GPX si scrive al volo quando serve.

## Copie di sicurezza

`pg_dump` ogni notte sulla VM, caricato nell'Object Storage gratuito di
Oracle, 14 copie; il ripristino si prova in TASK-122 e si scrive in
`DEPLOY.md`. Le copie stanno fuori dalla VM perché Oracle può reclamare
una VM gratuita poco usata.

## Privacy dei dati di posizione

- Agli altri iscritti una corsa arriva solo pubblicata e tagliata; un
  percorso consigliato parte dal punto mostrato, mai da quello vero, e non
  dice chi l'ha chiesto (ADR-0112).
- Senza account non si legge niente degli iscritti.
- Nel database non ci sono indirizzi IP; i log dell'API non hanno
  posizioni (ADR-0092).
- Cancellare l'account cancella tutto, subito; le copie di sicurezza lo
  perdono entro 14 giorni.
- Età minima 16 anni.
