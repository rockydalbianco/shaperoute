# TASK-218 — Le immagini ufficiali di Strava

**Stato**: Done (2026-10-03)
**Fase**: 4 · **Branch**: `feat/TASK-218-strava-brand`
**Dipende da**: TASK-187 («Send to Strava», in `main`)

## Obiettivo

«Connect with Strava» è il pulsante ufficiale di Strava, non più un
pulsante di solo testo, e accanto all'interruttore «Send to Strava» c'è il
logo ufficiale di Strava. Chiesto dall'utente il 2026-10-03 («ma il logo
strava al salvataggio ora c'è?», poi «ok perfetto» alla proposta).

## Contesto da leggere

- `docs/UI.md`, «La fine della corsa» («Send to Strava») e «Settings»
  («Strava»)
- `docs/DECISIONS.md` ADR-0156 (Strava), ADR-0181 (questo task)
- `apps/mobile/src/strava/StravaParts.tsx`
- Le regole del marchio di Strava: developers.strava.com/guidelines

## Le regole di Strava che valgono qui

Dalla pagina delle regole (rivista da Strava il 2025-09-29):

1. Il pulsante «Connect with Strava», se un'app lo usa, è quello del
   pacchetto di Strava (arancione o bianco, alto 48 px a 1x) e porta a
   `https://www.strava.com/oauth/authorize` (o `oauth/mobile/authorize`):
   lo fa già l'API di TASK-187.
2. Per dire che un'app lavora con Strava: «Powered by Strava» o
   «Compatible with Strava», con i loghi del pacchetto (arancione, bianco,
   nero; orizzontale o in colonna).
3. Mai un logo di Strava che faccia pensare a un'app fatta o sponsorizzata
   da Strava; mai come icona dell'app; mai modificato, alterato o animato.
4. Il logo di Strava sta vicino ma separato dal nome e dal logo dell'app, e
   non più in vista di loro.
5. «View on Strava» (già in «My activities»): leggibile e riconoscibile
   come link (grassetto, sottolineato o arancione `#FC5200`). Non cambia
   qui.

## Cosa fare

1. Scaricare i due pacchetti ufficiali (`1.1-Connect-with-Strava-Buttons.zip`,
   397 KB, e `1.2-Strava-API-Logos.zip`, 1,2 MB, da
   developers.strava.com/downloads/; ok dell'utente al download) e
   copiare nell'app solo le immagini che servono, in
   `apps/mobile/assets/strava/`, a 1x, 2x e 3x.
2. `ConnectWithStrava` in `StravaParts.tsx`: l'immagine del pulsante al
   posto del testo, nome per VoiceOver con `t()`; mentre si apre resta
   uguale, con una rotellina accanto.
3. `StravaSwitch`: il logo «Compatible with Strava» sotto le parole.
4. Test deterministici; `UI.md`, ADR-0181, `STATUS.md`.

## Criteri di accettazione

- [x] Nei tre posti di «Connect with Strava» (fine corsa, «Settings», la
      corsa aperta in «My activities») c'è l'immagine ufficiale di Strava,
      alta 48 pt, senza testo dell'app sopra.
- [x] Mentre si apre Strava il pulsante non cambia aspetto e non si tocca
      due volte.
- [x] L'interruttore «Send to Strava» ha sotto le parole il logo ufficiale
      «Compatible with Strava», e VoiceOver lo legge come prima («Send to
      Strava», acceso o spento).
- [x] Le immagini sono quelle del pacchetto di Strava, mai ridisegnate; un
      test controlla le misure di 1x, 2x e 3x.
- [x] Nessuna dipendenza nuova, nessun colore scritto a mano, nessun testo
      nuovo da tradurre.
- [x] I 17 scenari di `AppStrava.test.tsx` passano senza cambiare.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/assets/strava/ (nuova: connect-with-strava e
                            compatible-with-strava, 1x, @2x, @3x)
apps/mobile/src/strava/StravaParts.tsx
apps/mobile/src/strava/StravaParts.test.tsx (nuovo)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-218.md (nuovo)
```

`StravaParts.tsx` è anche nei file di TASK-210 (la lingua), che oggi non
lo tocca; libero per il coordinatore. TASK-208 B, non ancora partita,
toccherà la zona di Strava a fine corsa: chi entra secondo si aggiorna.

## Fuori scope

- Togliere i token `strava` e `onStrava`, ora senza uso: `tokens.ts` è
  nei file di TASK-206.
- «View on Strava» arancione o «Powered by Strava» in altri posti: nessuno
  li ha chiesti.
- Il logo di Strava dopo «Save», sul giallo del logo di Sgrava: le regole
  non vogliono loghi animati né più in vista del logo dell'app.
- Pubblicare l'app: vuole l'ok dell'utente (`AGENTI.md`, punto 9).

## Esito

Fatto: «Connect with Strava» è il pulsante ufficiale di Strava (237 × 48
pt) nei tre posti, e l'interruttore «Send to Strava» ha sotto le parole il
logo bianco «Compatible with Strava» (ADR-0181). 8 test nuovi in
`StravaParts.test.tsx` (misure dei PNG, pulsante, rotellina, VoiceOver in
italiano, interruttore). Visto nel simulatore (iPhone 17e, Expo Go, una
schermata di prova non salvata con `StravaRunEnd` finto): pulsante
nitido, logo leggibile sul fondo scuro (`out/strava-brand/`, fuori da
git). Emerso: il pulsante dice «CONNECT WITH STRAVA» in ogni lingua, perché
il pacchetto di Strava è solo in inglese. **Resta**: pubblicare l'app (ok
dell'utente); sul telefono si vede solo quando il server ha Strava.
