import "server-only";

import { and, count, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import { adresaAplicatiei, emailConfigurat, trimiteEmail } from "@/lib/email";
import { db } from "@/lib/db";
import {
  grupe,
  intalniri,
  lideri,
  lideriGrupe,
  membri,
  notificari,
  prezente,
  programariSlujire,
  type TipNotificare,
} from "@/lib/db/schema";
import { alerteAbsenteGrupa } from "@/lib/interogari/statistici";
import { liderilDeAnuntat } from "@/lib/interogari/slujiri";
import { pushConfigurat, trimitePush } from "@/lib/push";
import {
  ZILE_SAPTAMANA,
  adaugaZile,
  dataAzi,
  dataLunga,
  dataScurta,
  esteDataValida,
  ziSaptamanii,
} from "@/lib/util/date";

/**
 * Notificările liderilor.
 *
 * Se generează o dată pe zi (vezi `/api/cron/notificari`). Fiecare notificare
 * are o `cheie` unică per lider, deci aceeași veste nu se anunță de două ori,
 * oricâte ori ar rula generarea.
 *
 * Notificarea se vede întotdeauna în aplicație. Pe email pleacă doar dacă
 * liderul și-a pus adresa și a lăsat bifat tipul respectiv de notificare.
 */

/** Cu câte zile înainte anunțăm o zi de naștere sau o slujire. */
const ZILE_INAINTE_NASTERE = 3;
const ZILE_INAINTE_SLUJIRE = 4;

type NotificareNoua = {
  liderId: number;
  tip: TipNotificare;
  cheie: string;
  titlu: string;
  mesaj: string;
  link?: string;
};

type LiderDeAnuntat = {
  grupaId: number;
  liderId: number;
  notifZileNastere: boolean;
  notifSlujiri: boolean;
  notifPrezenta: boolean;
};

/** Liderii activi ai fiecărei grupe, cu preferințele lor de notificare. */
async function liderilPeGrupa(
  grupaIds: number[],
): Promise<Map<number, LiderDeAnuntat[]>> {
  if (grupaIds.length === 0) return new Map();
  const rezultat = await db
    .select({
      grupaId: lideriGrupe.grupaId,
      liderId: lideri.id,
      notifZileNastere: lideri.notifZileNastere,
      notifSlujiri: lideri.notifSlujiri,
      notifPrezenta: lideri.notifPrezenta,
    })
    .from(lideriGrupe)
    .innerJoin(lideri, eq(lideri.id, lideriGrupe.liderId))
    .where(and(inArray(lideriGrupe.grupaId, grupaIds), eq(lideri.activ, true)));

  const pe = new Map<number, LiderDeAnuntat[]>();
  for (const r of rezultat) {
    const lista = pe.get(r.grupaId) ?? [];
    lista.push(r);
    pe.set(r.grupaId, lista);
  }
  return pe;
}

/** Zilele de naștere care vin, pentru liderii grupelor respective. */
async function notificariZileNastere(azi: string): Promise<NotificareNoua[]> {
  const zileUrmarite = new Map<string, string>(); // "LL-ZZ" -> data completă
  for (let i = 0; i <= ZILE_INAINTE_NASTERE; i++) {
    const zi = adaugaZile(azi, i);
    zileUrmarite.set(zi.slice(5), zi);
  }

  const candidati = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      dataNasterii: membri.dataNasterii,
      grupaId: membri.grupaId,
      grupaNume: grupe.nume,
    })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(
      and(eq(membri.activ, true), eq(membri.status, "membru"), eq(grupe.activa, true)),
    );

  const cuZiua = candidati.filter(
    (m) =>
      m.dataNasterii &&
      esteDataValida(m.dataNasterii) &&
      zileUrmarite.has(m.dataNasterii.slice(5)),
  );
  if (cuZiua.length === 0) return [];

  const peGrupa = await liderilPeGrupa([...new Set(cuZiua.map((m) => m.grupaId))]);
  const anul = azi.slice(0, 4);
  const noi: NotificareNoua[] = [];

  for (const m of cuZiua) {
    const ziua = zileUrmarite.get(m.dataNasterii!.slice(5))!;
    const ani = Number(anul) - Number(m.dataNasterii!.slice(0, 4));
    const cand = ziua === azi ? "azi" : dataLunga(ziua);

    for (const l of peGrupa.get(m.grupaId) ?? []) {
      if (!l.notifZileNastere) continue;
      noi.push({
        liderId: l.liderId,
        tip: "zi_nastere",
        cheie: `zi_nastere:${anul}:${m.id}`,
        titlu: `${m.nume} împlinește ${ani} ani`,
        mesaj: `${m.nume} (${m.grupaNume}) împlinește ${ani} ani ${cand}. Un mesaj de la tine ar însemna mult.`,
        link: `/membri/${m.id}`,
      });
    }
  }

  return noi;
}

/** Slujirile care urmează, pentru cei implicați. */
async function notificariSlujiri(azi: string): Promise<NotificareNoua[]> {
  const panaLa = adaugaZile(azi, ZILE_INAINTE_SLUJIRE);

  const apropiate = await db
    .select()
    .from(programariSlujire)
    .where(
      and(gte(programariSlujire.data, azi), lte(programariSlujire.data, panaLa)),
    );
  if (apropiate.length === 0) return [];

  const noi: NotificareNoua[] = [];

  for (const p of apropiate) {
    const deAnuntat = await liderilDeAnuntat(p.id);
    if (deAnuntat.length === 0) continue;

    const preferinte = await db
      .select({ id: lideri.id, notifSlujiri: lideri.notifSlujiri })
      .from(lideri)
      .where(and(inArray(lideri.id, deAnuntat), eq(lideri.activ, true)));

    const cand = p.data === azi ? "azi" : dataLunga(p.data);
    const detaliu = [
      cand,
      p.ora ? `ora ${p.ora}` : "",
      p.locatie ?? "",
    ]
      .filter(Boolean)
      .join(", ");

    for (const l of preferinte) {
      if (!l.notifSlujiri) continue;
      noi.push({
        liderId: l.id,
        tip: "slujire",
        cheie: `slujire:${p.id}`,
        titlu: p.titlu,
        mesaj: `Slujire ${detaliu}.${p.detalii ? ` ${p.detalii}` : ""}`,
        link: "/slujiri",
      });
    }
  }

  return noi;
}

/** Grupele care aveau întâlnire zilele trecute, dar n-au prezența completată. */
async function notificariPrezentaLipsa(azi: string): Promise<NotificareNoua[]> {
  const active = await db
    .select({ id: grupe.id, nume: grupe.nume, ziIntalnire: grupe.ziIntalnire })
    .from(grupe)
    .where(eq(grupe.activa, true));

  // Pentru fiecare grupă, ultima zi de întâlnire care a trecut (max. o săptămână).
  const deVerificat: { grupaId: number; nume: string; data: string }[] = [];
  for (const g of active) {
    if (g.ziIntalnire === null) continue;
    for (let inapoi = 1; inapoi <= 7; inapoi++) {
      const zi = adaugaZile(azi, -inapoi);
      if (ziSaptamanii(zi) === g.ziIntalnire) {
        deVerificat.push({ grupaId: g.id, nume: g.nume, data: zi });
        break;
      }
    }
  }
  if (deVerificat.length === 0) return [];

  const facute = await db
    .select({ grupaId: intalniri.grupaId, data: intalniri.data })
    .from(intalniri)
    .where(
      and(
        inArray(
          intalniri.grupaId,
          deVerificat.map((d) => d.grupaId),
        ),
        gte(intalniri.data, adaugaZile(azi, -7)),
      ),
    );
  const existente = new Set(facute.map((f) => `${f.grupaId}:${f.data}`));

  const lipsa = deVerificat.filter(
    (d) => !existente.has(`${d.grupaId}:${d.data}`),
  );
  if (lipsa.length === 0) return [];

  const peGrupa = await liderilPeGrupa(lipsa.map((l) => l.grupaId));
  const noi: NotificareNoua[] = [];

  for (const l of lipsa) {
    for (const lider of peGrupa.get(l.grupaId) ?? []) {
      if (!lider.notifPrezenta) continue;
      noi.push({
        liderId: lider.liderId,
        tip: "prezenta",
        cheie: `prezenta:${l.grupaId}:${l.data}`,
        titlu: `Prezența de ${dataScurta(l.data)} n-a fost completată`,
        mesaj: `Grupa ${l.nume} a avut întâlnire ${ZILE_SAPTAMANA[ziSaptamanii(l.data)]}, ${dataScurta(l.data)}, dar prezența nu e trecută. Se poate completa și acum.`,
        link: `/grupe/${l.grupaId}/prezenta?data=${l.data}`,
      });
    }
  }

  return noi;
}

/** Rezumatul de luni: cum a fost săptămâna trecută și cine trebuie căutat. */
async function notificariRezumat(azi: string): Promise<NotificareNoua[]> {
  if (ziSaptamanii(azi) !== 1) return []; // doar lunea
  const deLa = adaugaZile(azi, -7);
  const panaLa = adaugaZile(azi, -1);

  const perechi = await db
    .select({
      liderId: lideri.id,
      notifRezumat: lideri.notifRezumat,
      grupaId: grupe.id,
      grupaNume: grupe.nume,
    })
    .from(lideriGrupe)
    .innerJoin(lideri, eq(lideri.id, lideriGrupe.liderId))
    .innerJoin(grupe, eq(grupe.id, lideriGrupe.grupaId))
    .where(and(eq(lideri.activ, true), eq(grupe.activa, true)));

  const peLider = new Map<number, typeof perechi>();
  for (const p of perechi) {
    if (!p.notifRezumat) continue;
    const lista = peLider.get(p.liderId) ?? [];
    lista.push(p);
    peLider.set(p.liderId, lista);
  }
  if (peLider.size === 0) return [];

  // Prezența de săptămâna trecută, pe grupe.
  const aleSaptamanii = await db
    .select({ id: intalniri.id, grupaId: intalniri.grupaId, data: intalniri.data })
    .from(intalniri)
    .where(and(gte(intalniri.data, deLa), lte(intalniri.data, panaLa)));

  const numere = new Map<number, { prezenti: number; total: number }>();
  if (aleSaptamanii.length > 0) {
    const stari = await db
      .select({
        intalnireId: prezente.intalnireId,
        stare: prezente.stare,
        status: membri.status,
      })
      .from(prezente)
      .innerJoin(membri, eq(membri.id, prezente.membruId))
      .where(
        inArray(
          prezente.intalnireId,
          aleSaptamanii.map((i) => i.id),
        ),
      );

    const grupaIntalnirii = new Map(aleSaptamanii.map((i) => [i.id, i.grupaId]));
    for (const s of stari) {
      if (s.status === "musafir") continue;
      const grupaId = grupaIntalnirii.get(s.intalnireId);
      if (grupaId === undefined) continue;
      const n = numere.get(grupaId) ?? { prezenti: 0, total: 0 };
      n.total++;
      if (s.stare === "prezent") n.prezenti++;
      numere.set(grupaId, n);
    }
  }

  const grupeCuIntalnire = new Set(aleSaptamanii.map((i) => i.grupaId));
  const alerteCache = new Map<number, number>();
  const noi: NotificareNoua[] = [];

  for (const [liderId, grupeleLui] of peLider) {
    const randuri: string[] = [];
    for (const g of grupeleLui) {
      if (!alerteCache.has(g.grupaId)) {
        alerteCache.set(g.grupaId, (await alerteAbsenteGrupa(g.grupaId)).length);
      }
      const alerte = alerteCache.get(g.grupaId)!;
      const n = numere.get(g.grupaId);

      const prezenta = grupeCuIntalnire.has(g.grupaId)
        ? n
          ? `${n.prezenti} din ${n.total} prezenți`
          : "întâlnire fără prezențe trecute"
        : "fără întâlnire";
      const deCautat = alerte > 0 ? ` · ${alerte} de căutat` : "";
      randuri.push(`${g.grupaNume}: ${prezenta}${deCautat}`);
    }

    noi.push({
      liderId,
      tip: "rezumat",
      cheie: `rezumat:${deLa}`,
      titlu: `Săptămâna ${dataScurta(deLa)} – ${dataScurta(panaLa)}`,
      mesaj: randuri.join("\n"),
      link: "/grupe",
    });
  }

  return noi;
}

export type RezultatGenerare = Record<TipNotificare, number> & { total: number };

/**
 * Calculează ce ar trebui să afle liderii azi și scrie notificările noi.
 * Se poate rula de câte ori vrei: cheile unice împiedică dublurile.
 */
export async function genereazaNotificari(
  azi = dataAzi(),
): Promise<RezultatGenerare> {
  const grupuri = await Promise.all([
    notificariZileNastere(azi),
    notificariSlujiri(azi),
    notificariPrezentaLipsa(azi),
    notificariRezumat(azi),
  ]);

  const rezultat: RezultatGenerare = {
    zi_nastere: 0,
    slujire: 0,
    prezenta: 0,
    rezumat: 0,
    total: 0,
  };

  for (const lista of grupuri) {
    for (const n of lista) {
      const scrise = await db
        .insert(notificari)
        .values({
          liderId: n.liderId,
          tip: n.tip,
          cheie: n.cheie,
          titlu: n.titlu,
          mesaj: n.mesaj,
          link: n.link ?? null,
        })
        .onConflictDoNothing()
        .returning({ id: notificari.id });
      if (scrise.length > 0) {
        rezultat[n.tip]++;
        rezultat.total++;
      }
    }
  }

  return rezultat;
}

export type RezultatTrimitere = {
  /** Câte au plecat pe email. */
  trimise: number;
  esuate: number;
  /** Rămase în așteptare: liderul n-are adresă, sau serverul n-are cheia. */
  inAsteptare: number;
  /** Câte au ajuns ca notificare pe telefon. */
  pushTrimise: number;
  /** Telefoane care nu mai ascultau; le-am scos din listă. */
  pushSterse: number;
  /**
   * De ce n-a plecat ultimul email care a eșuat.
   *
   * Îl scoatem la suprafață pentru că altfel rămânea doar în coloana
   * `eroareTrimitere` din baza de date, unde nu se uită nimeni, iar în
   * administrare scria doar „3 n-au putut fi trimise" - adevărat, dar inutil.
   */
  ultimaEroare: string | null;
};

/**
 * Duce mai departe notificările care încă n-au plecat: pe telefon și pe email.
 *
 * Ne uităm doar la ultimele câteva zile: dacă un lider își pune adresa abia
 * peste o lună, nu are rost să primească dintr-o dată tot ce a ratat.
 *
 * Cele două căi sunt independente. Cine n-are adresă de email rămâne în
 * așteptare, fără să marcăm o eroare - poate și-o pune mâine, și atunci
 * notificarea pleacă normal. La fel și cu telefonul: dacă nu s-a abonat încă,
 * notificarea îl așteaptă câteva zile.
 */
export async function trimiteNotificariNetrimise(
  limita = 100,
  zileInapoi = 3,
): Promise<RezultatTrimitere> {
  const deLa = new Date(Date.now() - zileInapoi * 86400000);

  const inAsteptare = await db
    .select({
      id: notificari.id,
      liderId: notificari.liderId,
      titlu: notificari.titlu,
      mesaj: notificari.mesaj,
      link: notificari.link,
      cheie: notificari.cheie,
      trimisaLa: notificari.trimisaLa,
      pushTrimisLa: notificari.pushTrimisLa,
      email: lideri.email,
      numeLider: lideri.nume,
    })
    .from(notificari)
    .innerJoin(lideri, eq(lideri.id, notificari.liderId))
    .where(
      and(
        isNull(notificari.eroareTrimitere),
        gte(notificari.creatLa, deLa),
        or(isNull(notificari.trimisaLa), isNull(notificari.pushTrimisLa)),
      ),
    )
    .orderBy(desc(notificari.creatLa))
    .limit(limita);

  const rezultat: RezultatTrimitere = {
    trimise: 0,
    esuate: 0,
    inAsteptare: 0,
    pushTrimise: 0,
    pushSterse: 0,
    ultimaEroare: null,
  };

  const potPush = pushConfigurat();
  const potEmail = emailConfigurat();
  const adresa = adresaAplicatiei();

  for (const n of inAsteptare) {
    // Pe telefon: notificarea de sistem, cu titlul și primul rând al mesajului.
    if (potPush && n.pushTrimisLa === null) {
      const dus = await trimitePush(n.liderId, {
        titlu: n.titlu,
        mesaj: n.mesaj,
        link: n.link,
        eticheta: n.cheie,
      });
      rezultat.pushSterse += dus.sterse;
      if (dus.trimise > 0) {
        rezultat.pushTrimise += dus.trimise;
        await db
          .update(notificari)
          .set({ pushTrimisLa: new Date() })
          .where(eq(notificari.id, n.id));
      }
    }

    // Pe email: doar dacă liderul și-a pus adresa.
    if (n.trimisaLa !== null) continue;
    if (!potEmail || !n.email) {
      rezultat.inAsteptare++;
      continue;
    }

    const raspuns = await trimiteEmail({
      catre: n.email,
      subiect: `Puls · ${n.titlu}`,
      text: `Salut, ${n.numeLider}!

${n.mesaj}

${adresa}${n.link ?? "/grupe"}

—
Puls · grupe mici
Poți opri notificările din Setări.`,
    });

    if (raspuns.trimis) {
      await db
        .update(notificari)
        .set({ trimisaLa: new Date() })
        .where(eq(notificari.id, n.id));
      rezultat.trimise++;
    } else {
      await db
        .update(notificari)
        .set({ eroareTrimitere: raspuns.motiv })
        .where(eq(notificari.id, n.id));
      rezultat.esuate++;
      rezultat.ultimaEroare = raspuns.motiv;
    }
  }

  return rezultat;
}

/** Notificările unui lider, cele mai noi întâi. */
export async function notificarileMele(liderId: number, limita = 40) {
  return db
    .select()
    .from(notificari)
    .where(eq(notificari.liderId, liderId))
    .orderBy(desc(notificari.creatLa))
    .limit(limita);
}

/** Câte notificări necitite are liderul (pentru bulina din meniu). */
export async function cateNecitite(liderId: number): Promise<number> {
  const [rand] = await db
    .select({ cate: count() })
    .from(notificari)
    .where(and(eq(notificari.liderId, liderId), eq(notificari.citita, false)));
  return Number(rand?.cate ?? 0);
}

/** Marchează toate notificările liderului ca citite. */
export async function marcheazaToateCitite(liderId: number) {
  await db
    .update(notificari)
    .set({ citita: true })
    .where(and(eq(notificari.liderId, liderId), eq(notificari.citita, false)));
}
