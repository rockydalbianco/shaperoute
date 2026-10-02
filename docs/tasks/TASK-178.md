# TASK-178 — La foto del profilo, da «Settings»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-178-profile-photo`
**Dipende da**: TASK-177 (la pagina «Settings», `Avatar`), TASK-114 (gli
account nell'API)

## Obiettivo

Chi ha un account mette una foto al suo profilo da «Settings»: la sceglie
dalla libreria o la scatta, e la vede nel cerchio di «Profile» e nel
pulsante in alto al posto dell'iniziale. Chiesto dall'utente il 2026-10-02
(«la foto del profilo da aggiungere in Settings», con TASK-177).

## Contesto da leggere

- `docs/DATABASE.md` (`profile_photos`), `docs/API.md` («Account»,
  «Favorites»)
- `docs/DECISIONS.md` ADR-0115 (la foto: JPEG 256 px nel database),
  ADR-0145 («Settings»)
- `docs/tasks/TASK-177.md`, `docs/tasks/TASK-116.md` (la foto era lì: quel
  file non si modifica)
- `services/api/shaperoute_api/favorites.py` e `tests/test_favorites.py`
  (il modello per endpoint e test con il database vero)
- `apps/mobile/src/profile/`, `apps/mobile/src/route/pickImage.ts`

## Cosa fare

1. **API**: migrazione `0005_profile_photos.sql` (una riga per account,
   `ON DELETE CASCADE`); `PUT /me/photo` riceve un'immagine in base64, la
   raddrizza, la ritaglia al quadrato centrale, la riduce a 256 px e la
   salva come JPEG senza i dati della fotocamera; `GET /me/photo` la
   restituisce; `DELETE /me/photo` la toglie. Tutti con il token.
2. **App**: la riga «Profile picture» di «Settings» esce dall'elenco
   `ACCOUNT_COMING` e diventa un pulsante: «Choose a picture», «Take a
   photo» e, se c'è una foto, «Remove picture». La foto si sceglie con
   `expo-image-picker` (già una dipendenza), con il ritaglio quadrato del
   telefono.
3. La foto compare nel cerchio di «Profile» (`Avatar`) e nel pulsante in
   alto (`ProfileLayer.tsx`); senza foto resta l'iniziale.
4. Test di API (database vero) e app; `API.md`, `DATABASE.md`, `UI.md`;
   ADR-0146.

## Criteri di accettazione

- [x] Una foto scelta da «Settings» si vede subito nella riga, nel cerchio
      di «Profile» e nel pulsante in alto; riaperta l'app, c'è ancora.
- [x] L'API salva solo un JPEG quadrato di 256 px, senza EXIF (niente
      posizione dello scatto); una foto scattata di lato esce dritta.
- [x] Un file che non è un'immagine, o troppo grande, è rifiutato con il
      motivo, e l'app lo dice in parole senza perdere la foto di prima.
- [x] «Remove picture» toglie la foto e torna l'iniziale.
- [x] `DELETE /me` cancella anche la foto; ognuno legge solo la sua.
- [x] Senza foto, senza rete o con un'API non ancora aggiornata l'app
      mostra l'iniziale, come prima.
- [x] Nessun colore scritto a mano, nessuna dipendenza nuova.
- [x] Test verdi.

## File toccati

```
services/api/migrations/0005_profile_photos.sql
services/api/shaperoute_api/profile_photos.py
services/api/shaperoute_api/app.py
services/api/tests/test_profile_photos.py
packages/shared-types/fixtures/profile-photo.json
apps/mobile/src/api/profilePhoto.ts
apps/mobile/src/api/profilePhoto.test.ts
apps/mobile/src/profile/
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/__tests__/AppProfilePhoto.test.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-178.md
```

In `src/profile/` la riga nuova è un file suo, `PhotoRow.tsx`: in
`SettingsPage.tsx` cambiano due righe. In `app.py` entrano tre righe
(l'import, `install_profile_photos` e un commento): lo
toccano anche TASK-194 (#204) e TASK-187, in altri punti.
`SettingsPage.tsx` e il suo test li tocca anche TASK-189 (#207, la sezione
«Sport»): cambi piccoli e lontani, chi entra per secondo unisce.
`accounts.py` e `access.py` sono di TASK-187: qui non si toccano.

## Fuori scope

- Nome utente e bio da cambiare, `GET /users/{id}`, «Edit profile», la
  foto vista dagli altri: restano a TASK-116, con una migrazione sua.
- La foto tenuta sul telefono fra un'apertura e l'altra: all'apertura
  l'app la richiede all'API, e per un attimo si vede l'iniziale.
- Le altre voci «Soon» di «Settings» (TASK-182, 183, 184, 185).

## Esito

La migrazione doveva essere la `0004` (AGENTI.md); TASK-187 l'ha presa
entrando prima in `main` (#210), e con la regola nuova del primo numero
libero il coordinatore ha dato a questo task la `0005`.

Fatto il 2026-10-02. API: `profile_photos.py` (il quadrato con Pillow,
già dipendenza del motore), migrazione `0005`, 22 test nuovi, quelli degli
endpoint con il PostGIS vero (raddrizzare, ritagliare, togliere l'EXIF,
rifiuti con il motivo, la foto di prima che resta, `DELETE /me`, il limite
di 10 al minuto). App: `api/profilePhoto.ts`, `profile/pickPhoto.ts`,
`profile/useProfilePhoto.ts` (il contesto della foto, montato in
`ProfileLayer.tsx`), `PhotoRow.tsx`; `Avatar` mostra la foto. 1071 test
dell'app verdi (35 nuovi, 3 dei quali sull'app intera in
`AppProfilePhoto.test.tsx`), `tsc`, `expo lint`, Prettier, ruff e black
puliti.

Non visto in un simulatore: scegliere una foto vuole tocchi nel selettore
del sistema, che il simulatore qui non concede; lo coprono i test con il
selettore finto. **Da provare sull'iPhone** dopo l'aggiornamento del
server (migrazione `0005`) e la pubblicazione, tutti e due con l'ok
dell'utente.

Lasciato fuori: la foto tenuta sul telefono fra un'apertura e l'altra
(all'apertura si vede l'iniziale per un attimo); la foto vista dagli
altri, con nome e bio, che resta a TASK-116.
