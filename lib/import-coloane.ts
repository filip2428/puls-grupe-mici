/**
 * Coloanele fișierului de import al pulsiștilor.
 *
 * Stau separat de restul importului pentru că sunt date curate, fără nimic de
 * server în ele: așa le poate citi și un script din `scripturi/`, fără să
 * ajungă la baza de date. Adevărul e într-un singur loc - dacă se schimbă un
 * titlu aici, se schimbă și în model, și în verificare, și în convertorul de
 * formulare.
 */
export const COLOANE = [
  { cheie: "nume", titlu: "Nume", obligatoriu: true, exemplu: "Andrei Popa" },
  { cheie: "grupa", titlu: "Grupa", obligatoriu: true, exemplu: "Băieți 14-16" },
  { cheie: "statut", titlu: "Statut", obligatoriu: false, exemplu: "membru" },
  { cheie: "sex", titlu: "Sex", obligatoriu: false, exemplu: "băiat" },
  { cheie: "clasa", titlu: "Clasa", obligatoriu: false, exemplu: "9" },
  {
    cheie: "dataNasterii",
    titlu: "Data nașterii",
    obligatoriu: false,
    exemplu: "2011-04-23",
  },
  {
    cheie: "biserica",
    titlu: "Biserica",
    obligatoriu: false,
    exemplu: "Harvest Arad",
  },
  { cheie: "botez", titlu: "Botez", obligatoriu: false, exemplu: "botezat" },
  {
    cheie: "botezatLa",
    titlu: "Data botezului",
    obligatoriu: false,
    exemplu: "2024-05-12",
  },
  { cheie: "telefon", titlu: "Telefon", obligatoriu: false, exemplu: "0722000111" },
  { cheie: "parinte1Nume", titlu: "Părinte 1", obligatoriu: false, exemplu: "Maria Popa" },
  {
    cheie: "parinte1Telefon",
    titlu: "Telefon părinte 1",
    obligatoriu: false,
    exemplu: "0722000112",
  },
  { cheie: "parinte2Nume", titlu: "Părinte 2", obligatoriu: false, exemplu: "Ion Popa" },
  {
    cheie: "parinte2Telefon",
    titlu: "Telefon părinte 2",
    obligatoriu: false,
    exemplu: "0722000113",
  },
] as const;

export type CheieColoana = (typeof COLOANE)[number]["cheie"];
