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
- când nu poate ajunge, trece o **înlocuire**: alt lider primește acces la grupă în perioada aleasă.

**Coordonatorul (administrator)**

- vede **lista tuturor adolescenților**, cu filtre după grupă, statut (membru sau
  musafir), sex, clasă, vârstă și situație, plus căutare după nume, telefon sau
  numele unui părinte;
- descarcă lista în Excel exact cu filtrele alese;
- creează lideri și generează coduri de acces (inclusiv coduri noi, dacă se pierd);
- creează grupe și repartizează oricâți lideri la o grupă;
- mută adolescenți dintr-o grupă în alta, fără să piardă istoricul;
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

## Publicarea (Vercel + Turso)

Baza de date locală e un fișier; în producție e nevoie de una găzduită.
Alegerea implicită e **Turso** (SQLite găzduit, plan gratuit generos), pentru că
merge cu exact același cod.

1. Creează o bază pe [turso.tech](https://turso.tech) și ia adresa
   (`libsql://...`) și un token.
2. În Vercel, la proiect → *Settings* → *Environment Variables*, pune:
   - `DATABASE_URL` = adresa `libsql://...`
   - `DATABASE_AUTH_TOKEN` = tokenul
   - `AUTH_SECRET` = un șir lung și aleator (poți lua unul din `.env.local`, dar
     mai bine generezi altul pentru producție)
3. Aplică migrările pe baza din producție, de pe calculatorul tău:

   ```bash
   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npm run db:migrate
   ```

4. Creează primul administrator în producție, la fel:

   ```bash
   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npm run lider:nou -- --nume "Numele tău" --rol admin
   ```

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
    membri/[id]/      fișa unui adolescent (istoric, părinți, note)
    admin/            tablou de bord, lideri, grupe, jurnal, export
  api/export/         fișierele Excel (prezențe și lista de adolescenți)
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
- notificare săptămânală pentru liderii care n-au făcut prezența;
- memento pentru zilele de naștere („cine împlinește ani săptămâna asta");
- pagină pentru părinți sau statistici pe lucrare, publice în interiorul bisericii.
