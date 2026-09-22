---
name: formular-pulsisti
description: Transformă exportul Google Forms al formularului de înscriere Puls („PULS 2026-2027 (Responses).xlsx" și variantele (1), (2)...) în fișierul Excel de import al pulsiștilor, doar cu răspunsurile noi. Folosește-l când utilizatorul atașează sau pomenește un export nou al formularului, spune „am mai primit răspunsuri", „vezi care sunt noi", „fă-mi excelul cu pulsiștii / pentru import", sau cere să adaptezi exportul pentru aplicație.
---

# Exportul formularului → Excel de import

Formularul de înscriere rămâne deschis tot anul, deci utilizatorul revine cu
exporturi tot mai lungi. Treaba e mereu aceeași: găsești ce e nou față de
exportul trecut, îl cureți și îi dai înapoi un fișier gata de urcat în
*Administrare · Import Excel*.

Toată curățarea e deja scrisă în `scripturi/formular.ts`. Nu scrie de mână
fișierul de import și nu face un script nou: rulezi convertorul, citești ce
raportează, iar când greșește, îl repari pe el, ca data viitoare să iasă bine
din prima.

## 1. Care e exportul nou și care e cel vechi

Exporturile stau în `C:\Users\hacfi\Downloads`. Google le numește la fel, iar
Windows adaugă un număr la fiecare descărcare:

```
PULS 2026-2027 (Responses).xlsx       ← cel mai vechi
PULS 2026-2027 (Responses) (1).xlsx
PULS 2026-2027 (Responses) (2).xlsx   ← cel mai nou
```

- **Nou** = fișierul atașat de utilizator; dacă n-a atașat nimic, cel cu data
  modificării cea mai recentă (`ls -lt`).
- **Vechi** = exportul prelucrat data trecută - de obicei cel imediat dinainte.
  Tabelul cu exporturile deja prelucrate e la finalul fișierului ăstuia; adaugă
  un rând în el de fiecare dată.

Verifică repede, înainte de orice, că noul chiar îl conține pe cel vechi:
primele rânduri identice (aceeași marcă de timp, același nume) și mai multe
rânduri în total. Dacă un rând vechi s-a schimbat sau lipsește, spune-i
utilizatorului - înseamnă că cineva a editat foaia de răspunsuri.

## 2. Rulează convertorul

Din directorul proiectului:

```bash
npm run formular -- "C:\Users\hacfi\Downloads\PULS 2026-2027 (Responses) (2).xlsx" --fata-de "C:\Users\hacfi\Downloads\PULS 2026-2027 (Responses) (1).xlsx"
```

- Scrie `pulsisti-noi-pentru-import.xlsx` lângă exportul nou (în Downloads) și
  **suprascrie** fișierul cu același nume de data trecută. Dacă vrei să încerci
  ceva fără să atingi Downloads, adaugă `--iese "<cale în scratchpad>"`.
- Fără `--fata-de` scoate toată lista, în `pulsisti-pentru-import.xlsx`. E
  nevoie de ea doar dacă utilizatorul cere explicit lista întreagă.
- Cine era în exportul vechi e sărit după nume (fără diacritice, fără
  majuscule). Cine a completat de două ori apare separat, la „Au mai completat
  o dată" - uită-te ce a schimbat și spune-i utilizatorului.

## 3. Citește raportul și repară convertorul unde greșește

Raportul arată câți sunt pe clase și băieți/fete, lista „De verificat" și cine
a fost sărit. Semne că trebuie umblat în `scripturi/formular.ts`:

| Ce vezi | Ce schimbi |
| --- | --- |
| rânduri fără sex („?" la băieți/fete) | prenumele lipsește din `BAIETI` / `FETE` - adaugă-l, în ordine alfabetică |
| aceeași biserică scrisă în mai multe feluri, sau o biserică nouă | un rând în `BISERICI`: în stânga cum o scriu oamenii (fără diacritice, litere mici), în dreapta numele pe care îl ținem |
| „Nu are", „/", „-" raportate ca telefon sau email greșit | cuvântul în `NIMIC` |
| un email cu terminație ciudată scăpat (`@gmail.co`) | furnizorul în `TERMINATII` |
| nume și prenume inversate nedetectate | de obicei tot un prenume lipsă din `BAIETI` / `FETE` |

După fiecare schimbare rulează din nou convertorul, apoi `npx tsc --noEmit`
și `npx eslint scripturi/formular.ts`. Rulează-l o dată și **fără**
`--fata-de`, cu `--iese` în scratchpad, ca să vezi că rândurile vechi ies la fel
ca înainte - o regulă nouă nu trebuie să strice ce mergea.

Comentariile și numele din cod sunt în română, cu diacritice, ca în restul
fișierului. Schimbările la convertor se fac commit (fără fișierele xlsx - au
date personale ale unor minori și nu intră niciodată în git).

**Biserica e a părinților, nu a copilului** (cerut de utilizator pe 22 sep.
2026): copiii nu sunt botezați, deci contează dacă familia e membră undeva.
Convertorul ia biserica unui părinte membru; „/" sau două biserici deodată
(„Harvest/Metanoia"), „-" și orice „ortodox"/„catolic" înseamnă fără biserică.
Dacă utilizatorul îți dă și exportul din aplicație (`puls-pulsisti-*.xlsx`),
compară biserica de acolo cu ce iese acum pentru cei vechi și spune-i ce
diferă - importul nu actualizează pulsiștii existenți.

## 4. Ce nu prinde convertorul - uită-te tu

Citește rândurile noi cu ochii, nu doar raportul:

- **frați**: același telefon de părinte cu nume de părinte diferite (convertorul
  semnalează doar dacă apar în aceeași rulare - uită-te și față de exporturile
  vechi);
- **greșeli în partea din fața lui `@`** (`dani.vintet@` lângă numele Vinter);
- răspunsul **„Nu"** la *Frecventează PULS* - utilizatorul poate vrea să știe;
- clase care nu se potrivesc cu vârsta.

Astea nu se schimbă în fișier: le spui utilizatorului, iar el hotărăște.

## 5. Dă-i fișierul și spune-i ce e în el

Trimite fișierul cu `SendUserFile` (`display: "attach"`). Răspunsul, în
română, pe scurt:

1. câte răspunsuri noi sunt și câți oameni noi (alții pot fi completări repetate);
2. un tabel pe clase: băieți | fete, cu numele;
3. „De verificat": fiecare rând, cu ce e de verificat, plus ce ai văzut tu la pasul 4;
4. ce ai schimbat în convertor, dacă ai schimbat ceva;
5. bisericile care apar prima dată - după import trebuie completate cu
   localitatea în *Administrare · Biserici*.

Amintește-i, dacă nu știe deja: pulsiștii intră fără grupă, iar grupa se dă
după import, din *Administrare · Nerepartizați*. Importul sare singur peste cine
e deja în aplicație.

## Exporturi prelucrate

| Data | Exportul nou | Față de | Rânduri | Noi |
| --- | --- | --- | --- | --- |
| 9 sep. 2026 | `PULS 2026-2027 (Responses).xlsx` | - | 52 | 52 (lista întreagă) |
| 15 sep. 2026 | `PULS 2026-2027 (Responses) (1).xlsx` | `(Responses).xlsx` | 70 | 17 + Jhonatan Galea completat din nou |
| 22 sep. 2026 | `PULS 2026-2027 (Responses) (2).xlsx` | `(Responses) (1).xlsx` | 74 | 4 |
