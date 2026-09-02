# Puls · Grupe mici

Aplicație pentru prezența la grupele mici din lucrarea cu adolescenții **Puls**.
Fiecare lider intră cu un cod, deschide grupa lui și bifează cine a fost prezent.
Coordonatorii văd toată lucrarea într-un singur loc.

---

## Ce poate face

> Aplicația e gândită **întâi pentru telefon**: navigarea stă jos, sub degetul
> mare, butoanele sunt suficient de mari cât să nu le ratezi, iar formularele nu
> fac zoom pe iPhone. Se poate pune pe ecranul de start („Adaugă pe ecranul
> principal") și se deschide ca o aplicație, fără bara de adrese.

**Liderul**

- vede doar grupele lui;
- face prezența în câteva atingeri: **Prezent / Anunțat / Absent**, plus butonul „Toți prezenți";
- adaugă pe loc un **musafir** care a venit prima dată, fără să piardă ce a bifat;
- scrie subiectul întâlnirii și o notă despre cum a fost;
- vede cine a lipsit de mai multe ori la rând („de căutat") și îl poate suna direct;
- are la îndemână datele părinților (nume și telefon, cu buton de sunat);
- ține note despre fiecare adolescent (rugăciune, situații, follow-up);
- adaugă adolescenți noi în grupă și îi marchează inactivi când nu mai vin;
- trece pe fișa fiecăruia **unde slujește** (Harvest Kids, cafenea, laudă...);
- vede **când e programată grupa lui la o slujire**;
- când nu poate ajunge, trece o **înlocuire**: alt lider primește acces la grupă în perioada aleasă;
- își pune adresa de email și alege ce **notificări** vrea să primească.

**Coordonatorul (administrator)**

- vede **lista tuturor adolescenților**, cu filtre după grupă, statut (membru sau
  musafir), sex, clasă, vârstă și situație, plus căutare după nume, telefon sau
  numele unui părinte;
- descarcă lista în Excel exact cu filtrele alese;
- **importă adolescenți dintr-un Excel**, după un model descărcabil;
- creează lideri și generează coduri de acces (inclusiv coduri noi, dacă se pierd);
- creează grupe și repartizează oricâți lideri la o grupă;
- creează **locurile de slujire** și programează cine slujește și când;
- mută adolescenți dintr-o grupă în alta, fără să piardă istoricul;
- **șterge definitiv** un lider sau un adolescent, când chiar e nevoie;
- vede tabloul de bord: prezență medie, evoluție pe săptămâni, grupe cu probleme;
- descarcă totul în Excel (prezențe, adolescenți, întâlniri);
- vede jurnalul: cine, ce și când a modificat.

---

## Musafiri și membri

Cine vine prima dată **nu** intră automat în grupă. Liderul îl adaugă de pe foaia
de prezență, la secțiunea *Musafiri*, și de acolo:

- prezența lui se notează normal, dar **nu intră în statistici** și nu declanșează
  alerte de absență (n-are sens să „cauți" pe cineva care a trecut o dată pe la voi);
- rămâne în lista de musafiri a grupei cât timp continuă să vină (apare pe foaie
  dacă a fost prezent în ultimele 90 de zile);
- când grupa hotărăște, după procedura voastră internă, că e parte din ea, apeși
  **„Primește în grupă"** - din acel moment intră în statistici, iar data primirii
  rămâne înregistrată.

Merge și invers: „Trece-l înapoi la musafiri", dacă a fost primit din greșeală.

---

## Slujiri

Sunt două lucruri diferite, legate între ele:

**Locurile de slujire** - Harvest Kids, cafeneaua, laudă, media... Coordonatorul
le creează din pagina *Slujiri*. Fiecare are un nume, o descriere scurtă și,
dacă vrei, un lider care coordonează.

**Cine unde slujește** - se trece de pe fișa adolescentului, la *Unde slujește*:
alegi din listă și, opțional, scrii ce face acolo („la povestire", „chitară").
Merge și invers, din pagina slujirii. Așa știi oricând că Filip e la Harvest
Kids, iar pagina slujirii îți arată toată echipa.

**Calendarul** - „pe 5 septembrie slujește grupa Băieți 14-16". O programare se
pune fie pe o grupă mică, fie pe un loc de slujire, fie pe amândouă. Liderul o
vede pe pagina grupei și pe *Slujiri*, iar cu câteva zile înainte primește și o
notificare.

Un lider poate trece un adolescent din grupa lui la o slujire; restul (creat,
modificat, programat) rămâne la coordonator.

---

## Notificări

Aplicația se uită o dată pe zi ce urmează și îi anunță pe liderii pe care îi
privește. Fiecare notificare se vede în *Setări*, îi sună telefonul dacă și-a
pornit notificările și îi pleacă și pe email dacă și-a pus adresa:

- **zile de naștere** - cu trei zile înainte, pentru adolescenții din grupa lui;
- **slujiri** - când grupa lui sau adolescenții lui sunt programați;
- **prezența necompletată** - dacă a trecut ziua întâlnirii și lipsește;
- **rezumatul de luni** - cum a fost săptămâna și cine ar trebui căutat.

Fiecare lider bifează singur ce vrea să primească. Notificările nu se repetă:
aceeași veste se anunță o singură dată, oricâte ori ar rula verificarea.

Cele trei căi sunt independente și niciuna nu e obligatorie. Cât timp nu sunt
configurate, aplicația merge normal - notificările se adună în *Setări* și pleacă
singure la prima verificare de după configurare.

**Pe telefon** (Web Push): fiecare lider apasă o dată *Pornește notificările aici*,
în *Setări*, pe telefonul lui. Merge și cu aplicația închisă. Pe iPhone e o
condiție în plus: aplicația trebuie pusă întâi pe ecranul principal - în Safari,
nu în Chrome. Serverul are nevoie de o pereche de chei, generate cu
`npm run chei:push`.

**Pe email**: prin [Resend](https://resend.com), cu `RESEND_API_KEY` și
`EMAIL_EXPEDITOR`.

---

## Aplicația pe telefon

Nu e nevoie de magazin de aplicații. Liderul deschide linkul o dată și o pune pe
ecranul principal: de atunci are o icoană ca orice altă aplicație, se deschide pe
tot ecranul, fără bara de adrese.

- **Android**: apare singur un buton *Instalează aplicația*, în *Setări*.
- **iPhone**: trebuie **Safari** (din Chrome pe iOS nu se poate) → butonul de
  partajare → *Adaugă pe ecranul principal*. Pașii sunt scriși în *Setări*.

**Merge și fără semnal.** Fișierele aplicației și ultimele pagini vizitate rămân
în telefon, deci se deschide și în subsolul unde nu prinde net. Dacă bifezi
prezența și pică netul, apare o bară sus și bifa pleacă singură când revine
semnalul - nu trebuie să apeși din nou și nu se pierde nimic.

Paginile ținute în telefon se șterg la ieșirea din cont, ca să nu rămână datele
unui lider pe un telefon împrumutat.

Icoanele se generează din logo cu `npm run icoane` și sunt deja în proiect - le
regenerezi doar dacă schimbi logo-ul.

---

## Import din Excel

*Administrare → Import Excel*. Descarci modelul (are coloanele potrivite, un rând
de exemplu și o foaie cu explicații), îl completezi și îl încarci înapoi.

Obligatorii sunt doar **Nume** și **Grupa**; restul (statut, sex, clasă, data
nașterii, telefon, cei doi părinți) se completează dacă le ai. Ordinea coloanelor
nu contează, iar cele în plus se ignoră.

Înainte să scrie ceva, aplicația îți arată ce a înțeles: cine intră, cine e deja
în aplicație (îi sare, ca să poți încărca fișierul de mai multe ori fără să
dublezi pe nimeni) și ce rânduri n-a putut citi, cu motivul. Abia după ce
confirmi se scrie în baza de date.

---

## Ștergerea definitivă

**Tot ce se poate crea în aplicație se poate și șterge.** Nu doar arhiva:

| Ce ștergi | De unde | Cum se confirmă |
| --- | --- | --- |
| o **grupă** (cu adolescenții și istoricul ei) | Administrare → Grupe → grupa | scrii numele grupei |
| un **lider** | Administrare → Lideri | scrii numele lui |
| un **adolescent** (cu prezențe și note) | fișa lui, jos | scrii numele lui |
| un **loc de slujire** (cu programările lui) | Slujiri → slujirea | scrii numele ei |
| **prezența unei zile** | pagina de prezență a zilei | un buton, sub un capac |
| o **programare** din calendar | Slujiri | un buton |
| o **înlocuire** | pagina grupei | un buton |
| o **notă** despre un adolescent | fișa lui | un buton |
| cineva **dintr-o slujire** | fișa lui sau pagina slujirii | un buton |
| un lider **dintr-o grupă** | Administrare → Grupe | un buton |
| **notificările** tale | Setări | un buton |
| **jurnalul** | Administrare → Jurnal | scrii cuvântul *golește* |

Ștergerile grele (grupă, lider, adolescent, loc de slujire) stau sub un capac
roșu, îți arată întâi exact ce dispare - *„Dispar cu totul 2 adolescenți, o
întâlnire cu 2 prezențe și o notă"* - și abia apoi acceptă butonul, după ce
scrii numele. Nu se mai poate aduce nimic înapoi.

Ce **nu** se pierde: la un lider șters rămân prezențele completate de el și
notele scrise de el, doar fără nume lângă ele. La o grupă ștearsă rămân
liderii, doar nu mai sunt repartizați acolo. La un loc de slujire șters rămân
adolescenții, doar nu mai slujesc acolo.

De cele mai multe ori tot nu asta vrei: pentru cine nu mai vine e „Marchează ca
inactiv", pentru un lider care ia o pauză e „Dezactivează", iar pentru o grupă
care nu se mai ține e „Arhivează". Acolo nu se pierde nimic și se poate reveni
oricând.

---

## Cum pornești aplicația pe calculatorul tău

Ai nevoie de **Node 22** (`nvm use 22.19.0`).

```bash
npm install
npm run pregatire
npm run dev
```

`npm run pregatire` creează fișierul `.env.local`, face tabelele în baza de date
locală (`local.db`) și îți afișează **codul primului administrator**. Notează-l -
nu mai poate fi văzut după aceea (dar poți genera altul oricând).

Apoi deschide http://localhost:3000 și intră cu acel cod.

### Date de test

Ca să vezi aplicația plină (4 grupe, 5 lideri, adolescenți, prezențe pe 8 săptămâni):

```bash
npm run date:demo
```

Scriptul afișează codurile liderilor de test. Rulează-l **doar** pe baza locală.

---

## Comenzi

| Comandă | Ce face |
| --- | --- |
| `npm run dev` | pornește aplicația local |
| `npm run build` | verifică și construiește varianta de producție |
| `npm run pregatire` | prima configurare (env + tabele + primul admin) |
| `npm run db:generate` | generează o migrare nouă după ce ai modificat `lib/db/schema.ts` |
| `npm run db:migrate` | aplică migrările (local sau în producție) |
| `npm run lider:nou -- --nume "Ana Popescu"` | creează un lider din linia de comandă |
| `npm run cod:nou -- --id 3` | generează un cod nou pentru liderul cu id-ul 3 |
| `npm run date:demo` | umple baza locală cu date de test |
| `npm run chei:push` | generează cheile pentru notificările pe telefon |
| `npm run icoane` | regenerează icoanele aplicației din logo |

De obicei nu ai nevoie de ultimele două: totul se face din pagina de administrare.

---

## Cum intră liderii (și de ce e sigur)

Codul de acces arată așa: **`7QF4-M2KPX9`**

- primele 4 caractere spun aplicației *cine* ești;
- ultimele 6 sunt secretul - se salvează **doar hash-uit** (scrypt), niciodată în clar;
- 6 caractere dintr-un alfabet de 32 înseamnă peste **un miliard** de variante;
- după 5 încercări greșite, adresa IP și codul respectiv sunt blocate 15 minute;
- formularul are un câmp-capcană, invizibil pentru oameni, pe care roboții îl completează;
- după ce intri, primești un cookie semnat (JWT, httpOnly) valabil **90 de zile** -
  liderii nu trebuie să scrie codul la fiecare întâlnire;
- dacă adminul generează un cod nou, sesiunile vechi ale acelui lider se închid imediat;
- orice modificare de prezență se scrie în jurnal, cu numele celui care a făcut-o.

Alfabetul codurilor nu conține `0`, `1`, `I` și `O`, ca să nu existe confuzii
când cineva citește codul de pe hârtie.

---

## Punerea online (Vercel + Turso)

Baza de date locală e un fișier; în producție e nevoie de una găzduită.
Alegerea implicită e **Turso** (SQLite găzduit, plan gratuit generos), pentru că
merge cu exact același cod.

### Variabilele de mediu

Se pun în Vercel, la proiect → *Settings* → *Environment Variables*. Șablonul
lor e în [`.env.example`](.env.example).

| Variabilă | Trebuie? | Ce e |
| --- | --- | --- |
| `DATABASE_URL` | **da** | adresa bazei, `libsql://...` |
| `DATABASE_AUTH_TOKEN` | **da** | tokenul bazei din Turso |
| `AUTH_SECRET` | **da** | șir lung și aleator, cu care se semnează sesiunile |
| `APP_URL` | da | adresa aplicației, ex. `https://grupe.puls.ro` |
| `CRON_SECRET` | da | șir aleator; cu el se legitimează verificarea de dimineață |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | pentru telefon | din `npm run chei:push` |
| `VAPID_PRIVATE_KEY` | pentru telefon | din `npm run chei:push`, **nu se dă nimănui** |
| `RESEND_API_KEY` | pentru email | cheia din contul [Resend](https://resend.com) |
| `EMAIL_EXPEDITOR` | pentru email | de la cine pleacă, ex. `Puls <puls@biserica.ro>` |

Fără cele pentru telefon și email aplicația merge; doar că notificările rămân
doar în *Setări*. Se pot adăuga oricând, iar ce s-a adunat între timp pleacă la
prima verificare de după.

**Atenție la `VAPID_PRIVATE_KEY`:** dacă o schimbi mai târziu, toate telefoanele
abonate până atunci nu mai primesc nimic și liderii trebuie să apese din nou
*Pornește notificările aici*.

### Pașii

1. **Turso.** Creează o bază pe [turso.tech](https://turso.tech) și notează
   adresa (`libsql://...`) și un token.

   **Regiunea contează mai mult decât pare.** O pagină pune bazei între 4 și 10
   întrebări, unele una după alta. Dacă baza e într-o parte a lumii și codul în
   alta, fiecare întrebare pierde ~80 ms doar pe drum, iar liderii simt asta la
   fiecare atingere.

   Baza noastră e în **Irlanda**, deci codul trebuie să ruleze tot acolo: în
   `vercel.json` scrie `"regions": ["dub1"]` (Dublin). Dacă vreodată muți baza
   în altă regiune, schimbă și rândul ăla, altfel una fuge de cealaltă.

   Verifici oricând unde rulează, fără să intri în Vercel:

   ```bash
   curl -s -D - -o $null https://puls-grupe-mici-one.vercel.app/intra | Select-String "x-vercel-id"
   ```

   Răspunsul arată `dub1::dub1::...` - prima parte e pe unde a intrat cererea,
   a doua e unde a rulat codul. A doua trebuie să fie `dub1`.
2. **Cheile pentru telefon.** Pe calculatorul tău:

   ```bash
   npm run chei:push
   ```

3. **Vercel.** Importă proiectul din Git, pune variabilele de mai sus și pornește
   prima construire. Verificarea zilnică se configurează singură din
   `vercel.json` (în fiecare zi la 8:00, ora României).
4. **Tabelele în producție.** De pe calculatorul tău, în PowerShell (Windows):

   ```powershell
   $env:DATABASE_URL="libsql://..."; $env:DATABASE_AUTH_TOKEN="..."; npm run db:migrate
   ```

   Pe macOS sau Linux:

   ```bash
   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npm run db:migrate
   ```

5. **Primul administrator**, la fel (PowerShell):

   ```powershell
   $env:DATABASE_URL="libsql://..."; $env:DATABASE_AUTH_TOKEN="..."; npm run lider:nou -- --nume "Numele tău" --rol admin
   ```

6. **Verifică.** Intră cu codul primit, deschide *Administrare → Trimite
   notificările acum* și citește ce raportează: îți spune ce a plecat pe telefon,
   ce pe email și ce mai lipsește din configurare.

Variabilele puse cu `$env:` țin doar cât ține fereastra aceea de PowerShell.
Dacă o închizi, le pui din nou.

De fiecare dată când mai adaugi ceva în `lib/db/schema.ts`, rulează întâi
`npm run db:generate`, iar după ce ai pus codul pe Vercel rulează
`npm run db:migrate` pe baza din producție - pasul 4, cu aceleași variabile.

### Ce trebuie să faci tu, personal

Restul e scris; astea cer un cont sau o decizie:

- contul **Turso** și baza de date;
- contul **Vercel**, proiectul și numele lui (de acolo iese adresa aplicației);
- contul **Resend** și un **domeniu verificat**, dacă vrei și email - fără domeniu
  propriu, Resend trimite doar către adresa cu care te-ai înscris;
- rularea celor două comenzi de mai sus (migrare + primul admin), o singură dată.

Aplicația nu e indexată de motoarele de căutare (`robots: noindex`) și nu are
nicio pagină publică - fără cod nu se vede nimic.

---

## Cum e făcută

| Bucată | Alegere |
| --- | --- |
| Aplicație | Next.js 16 (App Router) + React 19 + TypeScript |
| Aspect | Tailwind 4, culorile Puls (albastru, lime, cărbune) |
| Bază de date | SQLite prin Drizzle ORM - fișier local la dezvoltare, Turso în producție |
| Autentificare | cod de acces + sesiune JWT în cookie httpOnly |

```
app/
  intra/              pagina de intrare cu codul de acces
  (aplicatie)/
    grupe/            grupele mele, grupa, foaia de prezență
    adolescenti/      lista cu filtre (adminul vede tot, liderul doar grupele lui)
    membri/[id]/      fișa unui adolescent (istoric, părinți, note, unde slujește)
    slujiri/          locurile de slujire și calendarul programărilor
    setari/           email, notificări, ieșire din cont
    admin/            tablou de bord, lideri, grupe, import, jurnal, export
  api/export/         fișierele Excel (prezențe și lista de adolescenți)
  api/import/model/   fișierul-model pentru import
  api/cron/           verificarea zilnică a notificărilor
componente/           bucățile de interfață (formulare, foaia de prezență)
lib/
  auth/               coduri, sesiuni, limitarea încercărilor
  db/                 schema și conexiunea
  interogari/         toate citirile din baza de date, cu verificarea drepturilor
  util/date.ts        datele calendaristice (ora României)
scripturi/            unelte din linia de comandă
drizzle/              migrările bazei de date
```

Regula pe care se ține securitatea: **fiecare pagină și fiecare acțiune verifică
întâi cine ești** (`ceruteLider` / `ceruteAdmin`) și **apoi dacă ai voie la grupa
respectivă** (`verificaAccesGrupa`). Datele adolescenților se citesc pe server;
în browser ajunge doar ce are voie să vadă liderul respectiv.

---

## Ce se poate adăuga mai târziu

- prezența la întâlnirea generală de vineri, pe lângă grupele mici;
- filtru pe slujire în lista de adolescenți („arată-mi toți cei de la Harvest Kids");
- prezență și la slujiri, nu doar la grupele mici;
- pagină pentru părinți sau statistici pe lucrare, publice în interiorul bisericii.
