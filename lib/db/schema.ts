/**
 * Schema bazei de date (SQLite / Turso, prin Drizzle ORM).
 *
 * Idei de bază:
 *  - un LIDER poate avea mai multe GRUPE, iar o GRUPĂ poate avea mai mulți lideri
 *    (tabelul de legătură `lideriGrupe`);
 *  - un MEMBRU (adolescent) aparține unei singure grupe;
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

/** Adolescenții din grupe. */
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
    /** Inactiv = nu mai vine; rămâne în istoric, dar nu apare la prezență. */
    activ: integer("activ", { mode: "boolean" }).notNull().default(true),
    creatLa: integer("creat_la", { mode: "timestamp" }).notNull().default(acum),
  },
  (t) => [index("membri_grupa_idx").on(t.grupaId)],
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

/** Note despre un adolescent (rugăciune, situații, follow-up). */
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

export type Lider = typeof lideri.$inferSelect;
export type Grupa = typeof grupe.$inferSelect;
export type Membru = typeof membri.$inferSelect;
export type Intalnire = typeof intalniri.$inferSelect;
export type Prezenta = typeof prezente.$inferSelect;
export type NotaMembru = typeof noteMembru.$inferSelect;
export type Delegare = typeof delegari.$inferSelect;
export type StarePrezenta = Prezenta["stare"];
