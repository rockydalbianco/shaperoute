# TASK-166 — L'annuncio durante l'attesa, e l'ID vero dell'app AdMob

**Stato**: Pronto, in coda per il merge (coordinatore)
**Fase**: 4 · **Branch**: `feat/TASK-166-ad-while-waiting`
**Dipende da**: TASK-132 (AdMob nell'app), TASK-150 (account AdMob)

## Obiettivo

L'annuncio copre l'attesa del calcolo invece di stare fra «percorso pronto»
e «percorso mostrato», come chiesto dall'utente il 2026-10-02. L'app usa
l'ID vero della sua app AdMob.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0102
- `apps/mobile/src/ads/`

## Cosa fare

1. **L'annuncio all'inizio della ricerca.** Quando una ricerca parte
   («Draw route», o «Ask for a route» in «Explore»), se un annuncio è già
   carico si mostra subito, e il motore lavora dietro. Alla chiusura lo
   schermo mostra quello che c'è: il percorso se è pronto, altrimenti
   l'attesa. Senza annuncio carico la ricerca va avanti senza, e se ne
   carica uno per la prossima. Uno per ricerca, non uno per ogni passo
   della barra; mai all'apertura. Tutto in `src/ads/`: `App.tsx` non cambia
   (lo sta modificando TASK-164).
2. **L'ID vero dell'app** (preso da TASK-153, passo 2, solo questo):
   l'utente ha creato l'app in AdMob e ha dato il suo ID. Va in
   `app.json`, nel plugin `react-native-google-mobile-ads`, per la
   piattaforma che l'utente conferma. L'unità pubblicitaria resta quella di
   prova di Google finché l'utente non crea l'unità interstitial vera
   (TASK-153).
3. Aggiornare ADR-0102 con un paragrafo in fondo, senza riscriverlo.

## Criteri di accettazione

- [x] Con un annuncio carico, l'annuncio compare all'inizio della ricerca,
      una volta sola; il percorso arriva dietro (test).
- [x] Senza annuncio carico, la ricerca va avanti come prima e se ne carica
      uno per la prossima (test).
- [x] Nessun annuncio per percorso pronto, errore, annullamento (test).
- [x] In Expo Go nessun annuncio, l'app come prima (test di TASK-132).
- [x] L'ID vero dell'app AdMob è in `app.json`, per iOS (piattaforma
      confermata dall'utente).
- [x] Prova in una build propria nel simulatore: annuncio all'inizio della
      ricerca, X, percorso o attesa.

## File toccati

```
apps/mobile/app.json
apps/mobile/src/ads/
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-166.md
```

## Fuori scope

- L'unità interstitial vera, `app-ads.txt`, il consenso europeo pubblicato,
  «Privacy options», SKAdNetwork: TASK-153.
- `App.tsx` e il resto delle schermate.
- `eas update`: gli annunci si vedono solo in una build propria; si
  pubblica con il coordinatore.

## Esito

Prova nel simulatore (2026-10-02, iPhone 18 Pro, iOS 27, build Release,
API del Mac, Trento). Con gli ID di prova di Google: la prima ricerca
(cuore) chiede il consenso europeo di Google e va senza annuncio; la
seconda (stella) apre l'annuncio subito dopo il tocco, mentre l'API calcola
la stella (2,9 s), e alla X la stella è già sullo schermo.

Con l'ID vero dell'app l'SDK di Google non mostra il modulo di consenso e
non carica annunci, né di prova né veri: in AdMob mancano ancora il
messaggio di consenso europeo («Privacy e messaggi») e l'esame dell'app
(profilo pagamenti in TASK-150, app sullo store in TASK-152). È atteso; si
chiude con TASK-153. Fino ad allora la build con l'ID vero va avanti senza
annunci, come in Expo Go.
