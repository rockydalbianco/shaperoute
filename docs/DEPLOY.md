# DEPLOY — Chiedere percorsi da fuori casa

Oggi l'API gira sul PC di casa e l'iPhone la trova solo sulla stessa Wi-Fi
(`SETUP.md`, passo 10.1). Qui ci sono le strade per usarla da ovunque,
tutte **gratis e senza carta di credito**, salvo dove è detto (ADR-0076).

| Strada | PC acceso? | Costo | Quando |
|---|---|---|---|
| **A — PC + Tailscale** | sì | gratis | **da provare subito** |
| **B — PC + Cloudflare Tunnel** | sì | gratis | subito, se serve un indirizzo pubblico |
| C — Server con Docker (Hetzner, Oracle) | no | 0–7 €/mese, **carta** | più avanti |
| D — Raspberry Pi 5 a casa | no (il Pi sì) | il Pi, una volta | più avanti, senza carta |
| E — VPS pagato con PayPal | no | pochi €/mese | più avanti, senza carta |

Tutti i comandi sono per **PowerShell** sul PC, dalla radice del
repository (`cd ~\PycharmProjects\shaperoute`). Si scrive `npm.cmd`, non
`npm` (`SETUP.md`, passo 0).

---

## A — PC + Tailscale (la strada di adesso)

Tailscale crea una rete privata fra i tuoi dispositivi (la «tailnet»): il
PC riceve un indirizzo `100.x.y.z` che l'iPhone raggiunge da ovunque, anche
in 5G, e nessun altro. Non serve la chiave dell'API. Il piano Personal è
gratis e non chiede la carta (verificato il 2026-09-26 su
https://tailscale.com/pricing).

### A.1 Installare (una volta)

1. **PC**: scarica Tailscale per Windows da https://tailscale.com/download
   e installalo. Controlla prima lo spazio su C:: il disco è quasi pieno.
   Alla fine si apre il browser: accedi con un account Google, Microsoft,
   GitHub o Apple. Tailscale resta nell'area di notifica, vicino
   all'orologio.
2. **iPhone**: installa **Tailscale** dall'App Store, aprilo e accedi con
   **lo stesso account**. iOS chiede di aggiungere una configurazione VPN:
   consenti. L'interruttore in alto deve restare acceso.
3. **Indirizzo del PC**: da PowerShell

   ```powershell
   & "C:\Program Files\Tailscale\tailscale.exe" ip -4
   ```

   risponde con una riga come `100.101.102.103`. È l'indirizzo del PC
   nella tailnet e non cambia: scrivilo da qualche parte. Lo vedi anche
   nell'app Tailscale sull'iPhone, alla voce del PC.

### A.2 Avviare API e app (ogni volta)

Due finestre di PowerShell, tutte e due dalla radice del repository.
Nella prima, l'API come sempre:

```powershell
services\api\.venv\Scripts\python.exe -m shaperoute_api --lan
```

Con `--lan` l'API risponde su tutte le reti del PC, anche su quella di
Tailscale. Nella seconda, l'app con l'indirizzo di Tailscale al posto di
quello della Wi-Fi (metti il tuo al posto di `100.101.102.103`):

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "100.101.102.103"
npm.cmd run mobile
```

Expo mette quell'indirizzo nel QR code, e l'app cerca l'API sullo stesso
indirizzo, alla porta 8000: non serve nient'altro. Il valore vale solo per
quella finestra di PowerShell.

### A.3 La prova fuori casa

1. Sull'iPhone **spegni la Wi-Fi** (5G), e controlla che Tailscale sia
   acceso.
2. In Safari apri `http://100.101.102.103:8000/health` (con il tuo
   indirizzo): deve rispondere `{"status":"ok"}`.
3. Inquadra il QR code con la fotocamera, apri l'app in Expo Go e chiedi
   un percorso in una zona già in cache (Trento, Levico, Milano).

### A.4 Se non risponde

- **Safari non apre `/health`**: Windows può trattare la rete di Tailscale
  come «pubblica», e il permesso dato a Python vale solo per le reti
  private. Controlla con

  ```powershell
  Get-NetConnectionProfile
  ```

  Se alla riga `InterfaceAlias : Tailscale` corrisponde
  `NetworkCategory : Public`, rendila privata da una PowerShell **aperta
  come amministratore** (tasto destro su PowerShell, «Esegui come
  amministratore»):

  ```powershell
  Set-NetConnectionProfile -InterfaceAlias Tailscale -NetworkCategory Private
  ```

  È una modifica al firewall di Windows: la fai tu, non l'agente.
- **Il QR apre l'app ma «Cannot reach the API at http://192.168…»**:
  `REACT_NATIVE_PACKAGER_HOSTNAME` non era impostato nella finestra in cui
  hai lanciato `npm.cmd run mobile`. Chiudi Expo (`Ctrl+C`), rifai A.2.
- **Expo Go non carica l'app**: anche la porta 8081 di Expo passa da
  Tailscale; vale lo stesso controllo del firewall.

### A.5 In alternativa: indirizzo e chiave scritti nell'app

Invece di `REACT_NATIVE_PACKAGER_HOSTNAME`, l'app legge due valori da
`apps\mobile\.env` (un file che **non** entra nel repository; il modello è
`.env.example` alla radice):

```
EXPO_PUBLIC_API_URL=http://100.101.102.103:8000
EXPO_PUBLIC_API_KEY=
```

Se `EXPO_PUBLIC_API_URL` c'è, l'app usa quello al posto dell'indirizzo di
Expo; se `EXPO_PUBLIC_API_KEY` c'è, lo manda in ogni richiesta. Expo li
legge all'avvio di `npm.cmd run mobile`: dopo una modifica va riavviato.
Servono per le strade B–E, dove l'API non è sullo stesso PC di Expo.

---

## La chiave dell'API

Serve quando l'API ha un indirizzo che chiunque può raggiungere (strade
B–E). Con una chiave, ogni richiesta tranne `/health` deve portarla
nell'intestazione `X-API-Key`, altrimenti l'API risponde 401
`unauthorized` e l'app dice «The API refused this app's key».

1. Crea una chiave lunga e casuale (almeno 16 caratteri; con meno l'API
   non parte):

   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```

2. Sul PC o sul server, prima di avviare l'API:

   ```powershell
   $env:SHAPEROUTE_API_KEY = "la-chiave-appena-creata"
   services\api\.venv\Scripts\python.exe -m shaperoute_api --lan
   ```

   L'API stampa «API key required in the X-API-Key header».
3. Nell'app, la stessa chiave in `apps\mobile\.env` come
   `EXPO_PUBLIC_API_KEY=...` (A.5).

La chiave non va **mai** in un file del repository, in un commit o in una
chat. Se finisce da qualche parte, creane una nuova.

C'è anche un **limite**: al massimo 30 richieste POST al minuto per ogni
client (percorsi, contorni, parole, GPX), poi 429 `too_many_requests`.
Si cambia con `SHAPEROUTE_RATE_LIMIT` (0 = nessun limite). Dietro un
tunnel tutti i telefoni contano come un client solo.

---

## B — PC + Cloudflare Tunnel

Un indirizzo pubblico `https://...trycloudflare.com` che porta all'API sul
PC, gratis e senza account. Chiunque abbia l'indirizzo può provarci:
**serve la chiave**.

1. Scarica `cloudflared-windows-amd64.exe` da
   https://github.com/cloudflare/cloudflared/releases (ultima versione),
   mettilo in `D:\cloudflared\cloudflared.exe`.
2. Avvia l'API con la chiave (sezione precedente). Senza `--lan` basta:
   il tunnel parte dallo stesso PC.
3. In una seconda PowerShell:

   ```powershell
   D:\cloudflared\cloudflared.exe tunnel --url http://localhost:8000
   ```

   Stampa un indirizzo come `https://parole-a-caso.trycloudflare.com`.
4. In `apps\mobile\.env`: `EXPO_PUBLIC_API_URL=` quell'indirizzo, e la
   chiave. Riavvia `npm.cmd run mobile`.

L'indirizzo cambia a ogni avvio del tunnel. Uno fisso richiede un account
Cloudflare e un dominio tuo: per ora non serve.

---

## Il pacchetto Docker (strade C, D, E)

Su un server l'API gira in un container Docker, costruito dal
`Dockerfile` alla radice: motore compreso, AI esclusa (senza Ollama le
parole fuori tabella rispondono `ai_unavailable`, il resto funziona). La CI
lo costruisce a ogni PR per Intel/AMD e per ARM64 (Raspberry Pi, Oracle
Ampere), senza pubblicarlo. Docker **non** si installa sul PC di casa: i
comandi qui sotto sono per il server, in Linux.

```bash
git clone https://github.com/rockydalbianco/shaperoute.git
cd shaperoute
docker build -t shaperoute-api .
docker run -d --name shaperoute --restart unless-stopped \
  -p 8000:8000 -e SHAPEROUTE_API_KEY='la-chiave' \
  -v shaperoute-cache:/app/data/cache shaperoute-api
curl http://127.0.0.1:8000/health
```

I grafi delle zone stanno nel volume `shaperoute-cache` e restano anche
quando il container si ricrea. Una zona si scarica la prima volta che
qualcuno ci chiede un percorso (può volerci più di un minuto). Per
scaricarla subito, al primo avvio, con la CLI del motore nella stessa
immagine (qui Trento, 15 km):

```bash
docker run --rm -v shaperoute-cache:/app/data/cache shaperoute-api \
  python -m route_engine --shape circle --distance 15000 --start 46.0700,11.1210
```

Per aggiornare: `git pull`, `docker build ...`, `docker rm -f shaperoute`,
e di nuovo `docker run ...`.

Memoria: una zona in uso occupa centinaia di MB, l'API ne tiene due. Serve
un server con **almeno 4 GB** di RAM; 8 GB per stare tranquilli.

## C — Server con carta: Hetzner, Oracle Always Free

- **Hetzner Cloud** (circa 7 €/mese, carta): un server CAX21 o CPX21 con
  Ubuntu, Docker installato con `apt install docker.io`, poi il pacchetto
  Docker qui sopra.
- **Oracle Cloud Always Free** (gratis, ma la carta serve come verifica
  all'iscrizione): una VM Ampere (ARM64) fino a 4 core e 24 GB. L'immagine
  si costruisce anche per ARM64.

Per raggiungerlo dall'iPhone: `EXPO_PUBLIC_API_URL=http://IP-del-server:8000`
e la chiave; oppure Tailscale anche sul server (A), senza porte aperte.

## D — Raspberry Pi 5 (8 GB) a casa

Un computer piccolo, sempre acceso, che consuma pochi watt: il PC si può
spegnere. Si paga una volta (il Pi, alimentatore, una scheda microSD o
meglio un SSD) e niente al mese.

1. Raspberry Pi OS **a 64 bit** (Lite basta), con Raspberry Pi Imager.
2. Docker: `curl -fsSL https://get.docker.com | sh`.
3. Il pacchetto Docker qui sopra: l'immagine si costruisce per ARM64.
4. Tailscale sul Pi: `curl -fsSL https://tailscale.com/install.sh | sh`,
   poi `sudo tailscale up`, con lo stesso account del PC e dell'iPhone.
5. Nell'app: `EXPO_PUBLIC_API_URL=http://<indirizzo 100.x del Pi>:8000`.
   Con Tailscale la chiave non è indispensabile, ma non costa niente.

8 GB bastano per l'API; Ollama sul Pi sarebbe lento e resta sul PC.

## E — VPS pagato con PayPal, senza carta

Alcuni provider accettano PayPal: ad esempio **Hetzner** e **Contabo**.
Le condizioni cambiano: **al momento dell'iscrizione, controlla sulla
loro pagina dei pagamenti che PayPal sia accettato**, anche per il primo
pagamento e per la verifica dell'account, prima di dare qualsiasi dato.

Poi è come C: Ubuntu, Docker, il pacchetto Docker, la chiave, e
`EXPO_PUBLIC_API_URL` nell'app (o Tailscale sul VPS). Almeno 4 GB di RAM.

---

## Scartate (2026-09-26)

Hugging Face Spaces (Docker ora a pagamento), Render e Koyeb gratis
(512 MB di RAM, niente disco permanente), Cloudflare Workers (troppo poca
memoria). Il perché è in ADR-0076.
