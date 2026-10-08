# Puls · sistemul de design

Sursa de adevăr pentru cum arată aplicația. Valorile trăiesc în `app/globals.css`;
aici e de ce sunt așa și cum le folosești.

## Direcția

Mobil întâi, calm și cald. Albastrul, lime-ul și albastrul deschis sunt ale
lucrării și nu se schimbă; tot restul (text, fundal, linii) e tras spre aceeași
familie de albastru, ca să nu se bată cu ele. Un singur lucru principal pe ecran
(de obicei „Fă prezența”), restul stă un pas în spate.

## Culori (`@theme` în `globals.css`)

| Nume | Valoare | Pentru ce |
|---|---|---|
| `albastru` | `#2b328d` | acțiunea principală, tabul activ, prezent |
| `albastru-inchis` | `#1d2266` | hover pe butonul principal, capătul gradientului |
| `albastru-deschis` | `#22a5de` | slujiri, inelul de focus |
| `lime` | `#c1d82f` | anunțat, musafiri, înlocuiri, accent pe albastru |
| `albastru-pal` / `lime-pal` | `#eef0fb` / `#f4f8dc` | fundaluri care ies puțin în evidență |
| `carbune` | `#1b1f3b` | textul (bleumarin aproape negru) |
| `cenusiu` | `#5b6378` | textul de-al doilea rând (5,9:1 pe alb) |
| `fundal` / `hartie` | `#f4f5fa` / `#fff` | pagina / cardurile |
| `linie` / `linie-tare` | `#e7e9f2` / `#d4d9e8` | între rânduri / în jurul câmpurilor |

Roșul și verdele rămân cele din Tailwind (`red-50…800`, `green-700`), doar pentru
alerte, erori, „salvat”.

**Nu mai scrie culori brute** (`border-[#eef1f7]`) în componente: folosește numele.

## Tipografie

- **Plus Jakarta Sans** (cu `latin-ext`, pentru ș ț ă î â) pentru tot; **Geist Mono**
  doar pentru codul de acces.
- `.titlu-pagina` — 26px, 800, unul pe pagină. Rândul de sub el primește singur
  distanța potrivită.
- `.titlu-sectiune` — 16px, 700, în carduri. Cu iconiță: `<TitluSectiune icoana=… />`.
- Text de bază 14–16px; nimic sub 11px (etichetele mici, cipurile).

## Componente comune

| Clasă / componentă | Ce e |
|---|---|
| `.card` | alb, colț 20px, linie subțire + umbră moale |
| `.buton` + `.buton-principal` / `.buton-secundar` / `.buton-mic` | 48px (44px mic), colț 14px |
| `.camp`, `.eticheta` | câmpuri de 48px, 16px (sub 16px iPhone-ul face zoom) |
| `.inapoi` | linkul „înapoi” de deasupra titlului, cu săgeată, țintă de 44px |
| `.link` | link de text cu înălțime de deget („Toate”, „Excel”) |
| `.avatar` | inițialele într-un cerc de 40px (`initiale()` din `Icoane.tsx`) |
| `.icoana-sectiune` | pătrățelul colorat cu iconița secțiunii |
| `.bara-jos` | bara lipită jos: barele de salvare de pe foi |
| `.sticla` | materialul de sticlă (iOS 26) pentru tot ce plutește: navigarea și insulele din antet |
| `.antet` | antetul fără fundal, cu ceața de sus sub care trece lista |
| `.bara-tab` | navigarea de jos: capsulă de sticlă, lentila `.bara-tab-lentila`; `data-mic` o strânge la derulare |
| `<Icoana nume=… />` | iconițele aplicației, toate desenate cu linie, fără emoji |
| `<TitluSectiune>` | titlul de secțiune cu iconiță și, opțional, ceva în dreapta |

Clasele stau în `@layer components`, deci **o clasă Tailwind pusă lângă ele
câștigă** (`card bg-red-50`, `buton-secundar border-dashed` chiar se văd).

## Reguli de interacțiune

- Ținte de atingere de cel puțin 44px; butoanele principale 48–56px.
- Starea nu se spune doar prin culoare: prezent/anunțat/absent au și iconiță,
  tabul activ are și pastilă, cardul de prezență are și dungă pe stânga.
- Focus vizibil (`:focus-visible`, inel albastru deschis) — nu-l scoate.
- `prefers-reduced-motion` oprește strângerea la apăsare și animațiile.
- Navigarea de jos are cel mult 5 locuri. Setările și notificările stau în antet
  (inițialele și clopoțelul).

## Ce s-a schimbat față de aspectul vechi

- antet cu clopoțel (notificări necitite) și inițiale (Setări); bara de jos de la
  6 la cel mult 5 tab-uri, etichete de 12px în loc de 10px, pastilă pe tabul activ;
- foaia de prezență: butoane segmentate cu iconițe, dungă de stare pe card, bară de
  progres „cât ai marcat” în bara de salvare;
- lista grupelor: data zilei sus, cifrele grupei mari, întâlnirea cu toți de azi
  ca banner albastru;
- pagina grupei, Setări, Admin, Slujiri: titluri de secțiune cu iconițe, avataruri
  cu inițiale, scurtăturile din Admin grupate pe teme;
- emoji-urile din notificări înlocuite cu iconițe desenate;
- clasele comune mutate în `@layer components`, ca fundalurile și chenarele scrise
  în cod (roșu la „De căutat”, punctat la înlocuiri) să apară cu adevărat.
