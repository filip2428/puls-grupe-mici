/**
 * Schema bazei de date (SQLite / Turso, prin Drizzle ORM).
 *
 * Idei de bază:
 *  - un LIDER poate avea mai multe GRUPE, iar o GRUPĂ poate avea mai mulți lideri
 *    (tabelul de legătură `lideriGrupe`);
 *  - un MEMBRU (pulsist) aparține unei singure grupe;
 *  - o ÎNTÂLNIRE e o dată calendaristică dintr-o grupă; PREZENȚELE sunt câte una
 *    per membru per întâlnire;
 *  - DELEGĂRILE permit ca un lider să facă prezența la altă grupă o perioadă
 *    (când liderul titular lipsește);
 *  - AUDIT-ul reține cine și ce a modificat.
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const acum = sql`(unixepoch())`;

/** Liderii și administratorii. Autentificarea se face cu un cod de acces. */
export const lideri = sqliteTable(
  "lideri",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nume: text("nume").notNull(),
    telefon: text("telefon"),
    /** Adresa pe care primește notificări. Opțională - fără ea nu pleacă email-uri. */
    email: text("email"),
    /** Ce vrea să afle pe email. Notificarea se vede oricum în aplicație. */
    notifZileNastere: integer("notif_zile_nastere", { mode: "boolean" })
      .notNull()
      .default(true),
    notifSlujiri: integer("notif_slujiri", { mode: "boolean" })
      .notNull()
      .default(true),
    notifPrezenta: integer("notif_prezenta", { mode: "boolean" })
      .notNull()
      .default(true),
    notifRezumat: integer("notif_rezumat", { mode: "boolean" })
      .notNull()
      .default(true),
    /** "admin" vede tot și administrează; "lider" vede doar grupele lui. */
    rol: text("rol", { enum: ["admin", "lider"] })
      .notNull()
      .default("lider"),
    /** Prima parte a codului de acces (ex. "7QF4") - publică, servește la căutare. */
    codPublic: text("cod_public").notNull(),
    /** Hash-ul părții secrete a codului (scrypt). Codul în clar NU se salvează nicăieri. */
    codHash: text("cod_hash").notNull(),
    /** Crește la fiecare regenerare de cod, ca sesiunile vechi să devină invalide. */
    versiuneSesiuni: integer("versiune_sesiuni").notNull().default(1),
    activ: integer("activ", { mode: "boolean" }).notNull().default(true),
    ultimaAutentificare: integer("ultima_autentificare", { mode: "timestamp" }),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [uniqueIndex("lideri_cod_public_uq").on(t.codPublic)],
);

/** Grupele mici. */
export const grupe = sqliteTable("grupe", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nume: text("nume").notNull(),
  /** 0 = duminică ... 6 = sâmbătă. Doar informativ, pentru afișare. */
  ziIntalnire: integer("zi_intalnire"),
  oraIntalnire: text("ora_intalnire"),
  locatie: text("locatie"),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
});

/** Legătura mulți-la-mulți lider - grupă. */
export const lideriGrupe = sqliteTable(
  "lideri_grupe",
  {
    liderId: integer("lider_id")
      .notNull()
      .references(() => lideri.id, { onDelete: "cascade" }),
    grupaId: integer("grupa_id")
      .notNull()
      .references(() => grupe.id, { onDelete: "cascade" }),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [
    primaryKey({ columns: [t.liderId, t.grupaId] }),
    index("lideri_grupe_grupa_idx").on(t.grupaId),
  ],
);

/**
 * Pulsiștii.
 *
 * `status` face diferența dintre cineva care e cu adevărat parte din grupă și
 * cineva care doar a fost în vizită:
 *  - "musafir" = a venit (o dată sau de mai multe ori), dar nu e încă în grupă;
 *  - "membru"  = a fost primit în grupă, după procedura internă.
 * Musafirii nu intră în statistici și nu apar la „de căutat".
 */
export const membri = sqliteTable(
  "membri",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    grupaId: integer("grupa_id")
      .notNull()
      .references(() => grupe.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    telefon: text("telefon"),
    /** Format AAAA-LL-ZZ, opțional (pentru zile de naștere). */
    dataNasterii: text("data_nasterii"),
    /** "baiat" | "fata" - folosit la filtrare. */
    sex: text("sex", { enum: ["baiat", "fata"] }),
    /** Clasa la școală: 5 ... 13 (13 = a XII-a terminată / student). */
    clasa: integer("clasa"),
    status: text("status", { enum: ["membru", "musafir"] })
      .notNull()
      .default("membru"),
    /** Când a fost primit în grupă (AAAA-LL-ZZ). */
    devenitMembruLa: text("devenit_membru_la"),
    /** Datele părinților, pentru contact rapid. */
    parinte1Nume: text("parinte1_nume"),
    parinte1Telefon: text("parinte1_telefon"),
    parinte2Nume: text("parinte2_nume"),
    parinte2Telefon: text("parinte2_telefon"),
    /** Inactiv = nu mai vine; rămâne în istoric, dar nu apare la prezență. */
    activ: integer("activ", { mode: "boolean" }).notNull().default(true),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [
    index("membri_grupa_idx").on(t.grupaId),
    index("membri_status_idx").on(t.status),
  ],
);

/** O întâlnire a unei grupe, într-o anumită zi. */
export const intalniri = sqliteTable(
  "intalniri",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    grupaId: integer("grupa_id")
      .notNull()
      .references(() => grupe.id, { onDelete: "cascade" }),
    /** Data în format AAAA-LL-ZZ (ora României). */
    data: text("data").notNull(),
    /** Cine a completat prezența. */
    marcatDeId: integer("marcat_de_id").references(() => lideri.id, {
      onDelete: "set null",
    }),
    /** Adevărat dacă cel care a completat a fost înlocuitor (prin delegare). */
    prinInlocuire: integer("prin_inlocuire", { mode: "boolean" })
      .notNull()
      .default(false),
    /** Subiectul / tema întâlnirii. */
    subiect: text("subiect"),
    /** Nota liderului despre întâlnire (vizibilă liderilor grupei și adminilor). */
    nota: text("nota"),
    numarInvitati: integer("numar_invitati").notNull().default(0),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
    actualizatLa: integer("actualizat_la", { mode: "timestamp" })
      .notNull()
      .default(acum),
  },
  (t) => [
    uniqueIndex("intalniri_grupa_data_uq").on(t.grupaId, t.data),
    index("intalniri_data_idx").on(t.data),
  ],
);

/** Starea unui membru la o întâlnire. */
export const prezente = sqliteTable(
  "prezente",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    intalnireId: integer("intalnire_id")
      .notNull()
      .references(() => intalniri.id, { onDelete: "cascade" }),
    membruId: integer("membru_id")
      .notNull()
      .references(() => membri.id, { onDelete: "cascade" }),
    /** prezent | absent | motivat (a anunțat că lipsește) */
    stare: text("stare", { enum: ["prezent", "absent", "motivat"] }).notNull(),
  },
  (t) => [
    uniqueIndex("prezente_intalnire_membru_uq").on(t.intalnireId, t.membruId),
    index("prezente_membru_idx").on(t.membruId),
  ],
);

/** Note despre un pulsist (rugăciune, situații, follow-up). */
export const noteMembru = sqliteTable(
  "note_membru",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    membruId: integer("membru_id")
      .notNull()
      .references(() => membri.id, { onDelete: "cascade" }),
    autorId: integer("autor_id").references(() => lideri.id, {
      onDelete: "set null",
    }),
    text: text("text").notNull(),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [index("note_membru_membru_idx").on(t.membruId)],
);

/**
 * Delegare: liderul `liderId` poate face prezența la grupa `grupaId`
 * în intervalul [deLa, panaLa] (date AAAA-LL-ZZ, inclusiv).
 */
export const delegari = sqliteTable(
  "delegari",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    grupaId: integer("grupa_id")
      .notNull()
      .references(() => grupe.id, { onDelete: "cascade" }),
    liderId: integer("lider_id")
      .notNull()
      .references(() => lideri.id, { onDelete: "cascade" }),
    deLa: text("de_la").notNull(),
    panaLa: text("pana_la").notNull(),
    motiv: text("motiv"),
    creatDeId: integer("creat_de_id").references(() => lideri.id, {
      onDelete: "set null",
    }),
    anulata: integer("anulata", { mode: "boolean" }).notNull().default(false),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [
    index("delegari_lider_idx").on(t.liderId),
    index("delegari_grupa_idx").on(t.grupaId),
  ],
);

/** Jurnal: cine, ce și când a modificat. */
export const audit = sqliteTable(
  "audit",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    liderId: integer("lider_id").references(() => lideri.id, {
      onDelete: "set null",
    }),
    actiune: text("actiune").notNull(),
    detalii: text("detalii"),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [index("audit_creat_idx").on(t.creatLa)],
);

/** Încercări de autentificare - pentru limitarea atacurilor automate. */
export const incercariLogin = sqliteTable(
  "incercari_login",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Hash al IP-ului sau al codului public încercat (nu păstrăm IP-uri în clar). */
    cheie: text("cheie").notNull(),
    reusita: integer("reusita", { mode: "boolean" }).notNull().default(false),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [index("incercari_cheie_idx").on(t.cheie, t.creatLa)],
);

/**
 * Echipele de slujire (Laudă, Media, Protocol, Copii...).
 * Aici sunt pulsiștii implicați pe termen lung într-o slujire.
 */
export const echipeSlujire = sqliteTable("echipe_slujire", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nume: text("nume").notNull(),
  descriere: text("descriere"),
  /** Liderul care coordonează slujirea (opțional). */
  responsabilId: integer("responsabil_id").references(() => lideri.id, {
    onDelete: "set null",
  }),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
});

/** Cine e implicat în ce echipă de slujire. */
export const membriEchipe = sqliteTable(
  "membri_echipe",
  {
    echipaId: integer("echipa_id")
      .notNull()
      .references(() => echipeSlujire.id, { onDelete: "cascade" }),
    membruId: integer("membru_id")
      .notNull()
      .references(() => membri.id, { onDelete: "cascade" }),
    /** Ce face acolo (ex. "chitară", "cameră"). */
    rol: text("rol"),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [
    primaryKey({ columns: [t.echipaId, t.membruId] }),
    index("membri_echipe_membru_idx").on(t.membruId),
  ],
);

/**
 * Calendarul slujirilor: la data X slujește o grupă mică sau o echipă
 * (sau amândouă - de exemplu grupa ajută echipa de protocol).
 */
export const programariSlujire = sqliteTable(
  "programari_slujire",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Data în format AAAA-LL-ZZ. */
    data: text("data").notNull(),
    titlu: text("titlu").notNull(),
    detalii: text("detalii"),
    ora: text("ora"),
    locatie: text("locatie"),
    grupaId: integer("grupa_id").references(() => grupe.id, {
      onDelete: "cascade",
    }),
    echipaId: integer("echipa_id").references(() => echipeSlujire.id, {
      onDelete: "cascade",
    }),
    creatDeId: integer("creat_de_id").references(() => lideri.id, {
      onDelete: "set null",
    }),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [
    index("programari_data_idx").on(t.data),
    index("programari_grupa_idx").on(t.grupaId),
    index("programari_echipa_idx").on(t.echipaId),
  ],
);

/**
 * Notificările liderilor.
 *
 * Se generează o dată pe zi (vezi `/api/cron/notificari`), se văd în aplicație
 * și, dacă liderul și-a pus adresa de email, pleacă și pe email.
 * `cheie` e unică per lider, ca aceeași veste să nu fie anunțată de două ori.
 */
export const notificari = sqliteTable(
  "notificari",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    liderId: integer("lider_id")
      .notNull()
      .references(() => lideri.id, { onDelete: "cascade" }),
    tip: text("tip", {
      enum: ["zi_nastere", "slujire", "prezenta", "rezumat"],
    }).notNull(),
    /** Cheie de dedublare, ex. "zi_nastere:2026:12". */
    cheie: text("cheie").notNull(),
    titlu: text("titlu").notNull(),
    mesaj: text("mesaj").notNull(),
    /** Unde duce notificarea în aplicație (ex. "/membri/12"). */
    link: text("link"),
    citita: integer("citita", { mode: "boolean" }).notNull().default(false),
    /** Când a plecat pe email (null = încă n-a plecat). */
    trimisaLa: integer("trimisa_la", { mode: "timestamp" }),
    /** Când a ajuns pe telefon, ca notificare de sistem. */
    pushTrimisLa: integer("push_trimis_la", { mode: "timestamp" }),
    /** Motivul pentru care nu a plecat, dacă e cazul. */
    eroareTrimitere: text("eroare_trimitere"),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [
    uniqueIndex("notificari_lider_cheie_uq").on(t.liderId, t.cheie),
    index("notificari_lider_idx").on(t.liderId, t.creatLa),
  ],
);

/**
 * Telefoanele pe care liderul vrea notificări.
 *
 * Un lider poate avea mai multe: telefonul și laptopul, de exemplu. Fiecare
 * abonament e legat de un browser anume, prin `endpoint` (adresa la care
 * Google/Apple/Mozilla livrează mesajul). Dacă omul șterge aplicația sau
 * refuză notificările, adresa moare, iar noi ștergem rândul la prima
 * încercare eșuată.
 */
export const abonamentePush = sqliteTable(
  "abonamente_push",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    liderId: integer("lider_id")
      .notNull()
      .references(() => lideri.id, { onDelete: "cascade" }),
    /** Adresa serviciului de livrare. Unică - un browser, un abonament. */
    endpoint: text("endpoint").notNull(),
    /** Cheile de criptare ale browserului; fără ele mesajul nu poate fi citit. */
    cheieP256dh: text("cheie_p256dh").notNull(),
    cheieAuth: text("cheie_auth").notNull(),
    /** Ca liderul să recunoască de pe ce telefon e, când are mai multe. */
    descriere: text("descriere"),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
    ultimaFolosire: integer("ultima_folosire", { mode: "timestamp" }),
  },
  (t) => [
    uniqueIndex("abonamente_push_endpoint_uq").on(t.endpoint),
    index("abonamente_push_lider_idx").on(t.liderId),
  ],
);

export type Lider = typeof lideri.$inferSelect;
export type Grupa = typeof grupe.$inferSelect;
export type Membru = typeof membri.$inferSelect;
export type Intalnire = typeof intalniri.$inferSelect;
export type Prezenta = typeof prezente.$inferSelect;
export type NotaMembru = typeof noteMembru.$inferSelect;
export type Delegare = typeof delegari.$inferSelect;
export type StarePrezenta = Prezenta["stare"];
export type EchipaSlujire = typeof echipeSlujire.$inferSelect;
export type ProgramareSlujire = typeof programariSlujire.$inferSelect;
export type Notificare = typeof notificari.$inferSelect;
export type AbonamentPush = typeof abonamentePush.$inferSelect;
export type TipNotificare = Notificare["tip"];
