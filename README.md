# Quantum Lab v2.1

[Italiano](#italiano) · [English](#english)

> PWA bilingue, statica e offline per generare password da misure QRNG e
> analizzare esperimenti Bell · CHSH, GHZ, Mermin e QRNG. Nessun dato lascia
> il dispositivo.

---

## Italiano

**Quantum Lab** è una Progressive Web App gratuita, bilingue (italiano/inglese)
e open source. Ti aiuta a eseguire esperimenti su **Quantum Inspire**, importare
i risultati e trasformarli in informazioni comprensibili. Tutti i calcoli
avvengono nel browser: nessun backend, nessun database, nessun account, nessun
tracciamento.

### Funzioni

- **Password quantistica** — flusso guidato in tre passaggi: esegui il circuito
  QRNG, importa le misure grezze, genera la password. Il generatore usa
  *rejection sampling* per evitare il bias da modulo e non riutilizza i bit.
- **Generatore del dispositivo** — alternativa locale basata su
  `crypto.getRandomValues()`. È crittograficamente sicuro ma **non** è una
  sorgente quantistica.
- **Esperimenti** — Bell · CHSH, GHZ, test di Mermin e QRNG, con dati di esempio.
- **Analizza risultati** — incolla o importa TXT/CSV/JSON, riconosci il formato
  (misure grezze, istogrammi a 2/3/N bit) e scegli l'analisi appropriata.
- **Bilingue reale** — una sola pagina, dizionari centralizzati, cambio lingua
  senza ricaricare.
- **Offline** — dopo il primo caricamento funziona senza rete (service worker).
- **Privacy** — nessun dato viene inviato a server esterni.

### Workflow con Quantum Inspire

1. Apri **Quantum Inspire** dall'app e accedi con il tuo account.
2. Copia o scarica il circuito cQASM 3.0 fornito (`quantum-lab-qrng.cq`):

   ```
   version 3.0
   qubit[8] q
   bit[8] b
   H q
   b = measure q
   ```

3. Eseguilo con abbastanza shot ed esporta i risultati.
4. Importa le **misure grezze** per la password oppure gli **istogrammi** per
   le analisi.

> Quantum Lab **non è affiliata ufficialmente** a Quantum Inspire. La PWA non
> contiene e non chiede le tue credenziali.

### Installazione locale

Il progetto è statico ma il service worker e i file locale (`/locales/*.json`)
richiedono un server HTTP. Non aprire `index.html` con `file://`.

```bash
cd Quantum-Lab-v2.1.0
python3 -m http.server 8000
# apri http://localhost:8000
```

### Pubblicazione — GitHub Pages

1. Crea un repository e carica il **contenuto** di questa cartella nella radice.
2. `Settings → Pages → Build and deployment → Deploy from a branch`.
3. Scegli il branch (`main`) e la cartella `/root`, poi salva.
4. L'app userà percorsi relativi e funziona anche in una sottocartella come
   `https://utente.github.io/Quantum-Lab-v2.1/`.

### Pubblicazione — Cloudflare Pages

1. `Create a project → Direct Upload` (oppure collega il repository Git).
2. Nessun comando di build. Cartella di output: la radice del progetto.
3. Pubblica: i file statici vengono serviti direttamente.

### Privacy

- Nessun backend, database, login, analytics o tracciamento.
- Nessun font, script o CSS caricato da CDN.
- Tutti i calcoli restano sul dispositivo; nessun dato viene caricato.

### Limiti scientifici

Le analisi sono **descrittive** e semplificate, pensate per la leggibilità:

- La stima di **S** (Bell/CHSH) non include barre d'errore né analisi
  statistica: da sola non certifica l'entanglement.
- La popolazione **000/111** (GHZ) non dimostra da sola la coerenza quantistica;
  serve il test di Mermin.
- **M** (Mermin) è una stima semplificata senza barre d'errore.
- I controlli **QRNG** sono descrittivi e **non** equivalgono a una
  certificazione crittografica formale.

### Struttura dei file

```
Quantum-Lab-v2.1.0/
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
├── LICENSE
├── assets/
│   └── icons/            icon-192, icon-512, icon-maskable-512
├── css/
│   └── app.css
├── js/
│   ├── app.js            wiring dei flussi
│   ├── i18n.js           sistema bilingue
│   ├── router.js         navigazione con hash
│   ├── parser.js         parsing tollerante e classificazione
│   ├── analyses.js       Bell, GHZ, Mermin, QRNG
│   ├── password.js       generazione password
│   ├── import.js         import file e formato
│   └── pwa.js            service worker e aggiornamenti
└── locales/
    ├── it.json
    └── en.json
```

### Screenshot

Aggiungi qui i tuoi screenshot creando una cartella `docs/` e referenziandoli,
ad esempio:

```markdown
![Home](docs/home.png)
![Password quantistica](docs/password.png)
```

> Nessun costo: il progetto è interamente gratuito e statico.

---

## English

**Quantum Lab** is a free, bilingual (Italian/English) and open-source
Progressive Web App. It helps you run experiments on **Quantum Inspire**, import
the results and turn them into clear information. Everything is computed in the
browser: no backend, no database, no accounts, no tracking.

### Features

- **Quantum password** — a three-step guided flow: run the QRNG circuit, import
  the raw measurements, generate the password. The generator uses *rejection
  sampling* to avoid modulo bias and never reuses bits.
- **Device generator** — a local alternative based on
  `crypto.getRandomValues()`. It is cryptographically secure but is **not** a
  quantum source.
- **Experiments** — Bell · CHSH, GHZ, Mermin test and QRNG, with example data.
- **Analyze results** — paste or import TXT/CSV/JSON, detect the format (raw
  measurements, 2/3/N-bit histograms) and choose the right analysis.
- **Real bilingual** — a single page, centralized dictionaries, language switch
  without reloading.
- **Offline** — works without a network after the first load (service worker).
- **Privacy** — no data is sent to external servers.

### Quantum Inspire workflow

1. Open **Quantum Inspire** from the app and sign in with your account.
2. Copy or download the provided cQASM 3.0 circuit (`quantum-lab-qrng.cq`):

   ```
   version 3.0
   qubit[8] q
   bit[8] b
   H q
   b = measure q
   ```

3. Run it with enough shots and export the results.
4. Import the **raw measurements** for the password, or the **histograms** for
   the analyses.

> Quantum Lab is **not officially affiliated** with Quantum Inspire. The PWA
> does not contain and never asks for your credentials.

### Local installation

The project is static, but the service worker and the locale files
(`/locales/*.json`) require an HTTP server. Do not open `index.html` via
`file://`.

```bash
cd Quantum-Lab-v2.1.0
python3 -m http.server 8000
# open http://localhost:8000
```

### Deployment — GitHub Pages

1. Create a repository and upload the **contents** of this folder to the root.
2. `Settings → Pages → Build and deployment → Deploy from a branch`.
3. Choose the branch (`main`) and the `/root` folder, then save.
4. The app uses relative paths and works even in a sub-folder such as
   `https://user.github.io/Quantum-Lab-v2.1/`.

### Deployment — Cloudflare Pages

1. `Create a project → Direct Upload` (or connect the Git repository).
2. No build command. Output directory: the project root.
3. Deploy: the static files are served directly.

### Privacy

- No backend, database, login, analytics or tracking.
- No fonts, scripts or CSS loaded from a CDN.
- All computations stay on the device; no data is uploaded.

### Scientific limits

The analyses are **descriptive** and simplified for readability:

- The **S** estimate (Bell/CHSH) has no error bars or statistical analysis: on
  its own it does not certify entanglement.
- The **000/111** population (GHZ) does not by itself prove quantum coherence;
  the Mermin test is needed.
- **M** (Mermin) is a simplified estimate without error bars.
- The **QRNG** checks are descriptive and are **not** equivalent to a formal
  cryptographic certification.

### File structure

See the tree in the Italian section above.

### Screenshots

Add your screenshots by creating a `docs/` folder and referencing them, e.g.:

```markdown
![Home](docs/home.png)
![Quantum password](docs/password.png)
```

> No cost: the project is entirely free and static.

---

## Author

**Alessandro Pezzali** — <https://www.alessandropezzali.it/>

## Repository

<https://github.com/pezzaliapp/Quantum-Lab-v2>

Live (GitHub Pages): <https://www.alessandropezzali.it/Quantum-Lab-v2/>

## License

Released under the **MIT License** — see the [LICENSE](LICENSE) file.
© 2026 Alessandro Pezzali.
