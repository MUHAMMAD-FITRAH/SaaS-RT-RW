// ─── Surat Template Engine ────────────────────────────────────────────────────
// Provides body text and title for each jenis surat.
// No external dependencies — the cetak page renders this as HTML.

export interface SuratContext {
  nomor: string;
  jenis: string;
  perihal: string;
  isiSurat: string | null;
  catatan: string | null;
  tanggal: string; // ISO string
  disetujuiOleh: string | null;
  warga: {
    namaLengkap: string;
    nik: string;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    jenisKelamin: string | null;
    agama: string | null;
    pekerjaan: string | null;
    pendidikan: string | null;
    statusPerkawinan: string | null;
    nomorHP: string | null;
    kewarganegaraan: string | null;
    // Assembled from keluarga.rumah
    alamat: string | null;
    rt: string | null;
    rw: string | null;
  } | null;
  tenant: {
    name: string;
    rtNumber: string;
    rwNumber: string;
    kelurahan: string | null;
    kecamatan: string | null;
    kota: string | null;
    provinsi: string | null;
    phone: string | null;
    logo: string | null;
    address: string | null;
  };
}

// ─── Roman month for Indonesian official letters ──────────────────────────────

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

export function formatNomorSurat(nomor: string, tanggal: string): string {
  const d = new Date(tanggal);
  return nomor; // Already formatted on creation
}

// ─── Jenis Surat display title ────────────────────────────────────────────────

export const JENIS_LABEL: Record<string, string> = {
  SURAT_PENGANTAR:   "SURAT PENGANTAR",
  SURAT_KETERANGAN:  "SURAT KETERANGAN",
  SURAT_DOMISILI:    "SURAT KETERANGAN DOMISILI",
  SURAT_TIDAK_MAMPU: "SURAT KETERANGAN TIDAK MAMPU",
  SURAT_KEMATIAN:    "SURAT KETERANGAN KEMATIAN",
  SURAT_KELAHIRAN:   "SURAT KETERANGAN KELAHIRAN",
  SURAT_PINDAH:      "SURAT KETERANGAN PINDAH",
  SURAT_USAHA:       "SURAT KETERANGAN USAHA",
  LAINNYA:           "SURAT KETERANGAN",
};

// ─── Body text per jenis ─────────────────────────────────────────────────────

export function getSuratBodyParagraphs(ctx: SuratContext): string[] {
  const w = ctx.warga;
  const t = ctx.tenant;
  const rtRw = `RT ${t.rtNumber} / RW ${t.rwNumber}`;
  const lokasi = [t.kelurahan, t.kecamatan, t.kota].filter(Boolean).join(", ");
  const nama = w?.namaLengkap ?? "Yang Bersangkutan";
  const alamat = w?.alamat ?? lokasi;
  const pekerjaan = w?.pekerjaan ?? "-";

  switch (ctx.jenis) {
    case "SURAT_PENGANTAR":
      return [
        `Bahwa orang tersebut di atas adalah benar-benar warga kami yang berdomisili di wilayah ${rtRw}${lokasi ? `, ${lokasi}` : ""}.`,
        `Dalam rangka keperluan <strong>${ctx.perihal}</strong>, kami memberikan surat pengantar ini kepada yang bersangkutan untuk digunakan sebagaimana mestinya.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    case "SURAT_KETERANGAN":
      return [
        `Bahwa orang tersebut di atas adalah benar-benar warga kami yang berdomisili/bertempat tinggal di wilayah ${rtRw}${lokasi ? `, ${lokasi}` : ""}.`,
        `Surat keterangan ini dibuat untuk keperluan <strong>${ctx.perihal}</strong> dan dapat dipergunakan sebagaimana mestinya.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    case "SURAT_DOMISILI":
      return [
        `Bahwa orang tersebut di atas adalah benar-benar berdomisili/bertempat tinggal tetap di:`,
        `Alamat: <strong>${alamat}</strong>, wilayah ${rtRw}${lokasi ? `, ${lokasi}` : ""}.`,
        `Surat keterangan domisili ini diberikan untuk keperluan <strong>${ctx.perihal}</strong>.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    case "SURAT_TIDAK_MAMPU":
      return [
        `Bahwa orang tersebut di atas adalah benar-benar warga tidak mampu yang berdomisili di wilayah ${rtRw}${lokasi ? `, ${lokasi}` : ""}.`,
        `Berdasarkan pengamatan dan data yang kami miliki, yang bersangkutan layak mendapatkan bantuan/keringanan sebagaimana mestinya.`,
        `Surat keterangan tidak mampu ini diberikan untuk keperluan <strong>${ctx.perihal}</strong>.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    case "SURAT_KEMATIAN":
      return [
        `Bahwa telah meninggal dunia seorang warga kami tersebut di atas.`,
        `Surat keterangan kematian ini diberikan untuk keperluan <strong>${ctx.perihal}</strong> dan proses administrasi lebih lanjut.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    case "SURAT_KELAHIRAN":
      return [
        `Bahwa telah lahir seorang anak dari warga kami tersebut di atas.`,
        `Surat keterangan kelahiran ini diberikan untuk keperluan <strong>${ctx.perihal}</strong> dan proses administrasi lebih lanjut.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    case "SURAT_PINDAH":
      return [
        `Bahwa orang tersebut di atas menyatakan telah berpindah domisili/tempat tinggal dari wilayah ${rtRw}${lokasi ? `, ${lokasi}` : ""}.`,
        `Selama berdomisili di wilayah kami, yang bersangkutan berkelakuan baik dan tidak pernah melakukan perbuatan yang bertentangan dengan hukum.`,
        `Surat keterangan pindah ini diberikan untuk keperluan <strong>${ctx.perihal}</strong>.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    case "SURAT_USAHA":
      return [
        `Bahwa orang tersebut di atas adalah benar-benar memiliki dan menjalankan usaha di bidang <strong>${pekerjaan}</strong> yang beroperasi di wilayah ${rtRw}${lokasi ? `, ${lokasi}` : ""}.`,
        `Selama menjalankan usahanya, yang bersangkutan tidak pernah melakukan perbuatan yang merugikan masyarakat sekitar.`,
        `Surat keterangan usaha ini diberikan untuk keperluan <strong>${ctx.perihal}</strong>.`,
        ctx.isiSurat ? ctx.isiSurat : "",
      ].filter(Boolean);

    default: // LAINNYA
      return [
        ctx.isiSurat ||
          `Bahwa orang tersebut di atas adalah benar-benar warga kami yang berdomisili di wilayah ${rtRw}${lokasi ? `, ${lokasi}` : ""}.`,
        `Surat ini diberikan untuk keperluan <strong>${ctx.perihal}</strong>.`,
      ].filter(Boolean);
  }
}

// ─── Format identity rows ─────────────────────────────────────────────────────

export interface IdentityRow {
  label: string;
  value: string;
}

export function getIdentityRows(ctx: SuratContext): IdentityRow[] {
  const w = ctx.warga;
  if (!w) return [];

  const rows: IdentityRow[] = [
    { label: "Nama Lengkap", value: w.namaLengkap },
    { label: "NIK", value: w.nik },
  ];

  if (w.tempatLahir || w.tanggalLahir) {
    const tempat = w.tempatLahir ?? "-";
    const tgl = w.tanggalLahir
      ? new Date(w.tanggalLahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    rows.push({ label: "Tempat / Tgl. Lahir", value: `${tempat}, ${tgl}` });
  }

  if (w.jenisKelamin) {
    rows.push({ label: "Jenis Kelamin", value: w.jenisKelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan" });
  }
  if (w.agama) rows.push({ label: "Agama", value: w.agama });
  if (w.statusPerkawinan) {
    const kawinLabel: Record<string, string> = {
      BELUM_KAWIN: "Belum Kawin", KAWIN: "Kawin",
      CERAI_HIDUP: "Cerai Hidup", CERAI_MATI: "Cerai Mati",
    };
    rows.push({ label: "Status Perkawinan", value: kawinLabel[w.statusPerkawinan] ?? w.statusPerkawinan });
  }
  if (w.pekerjaan) rows.push({ label: "Pekerjaan", value: w.pekerjaan });
  if (w.pendidikan) rows.push({ label: "Pendidikan", value: w.pendidikan });
  if (w.kewarganegaraan) rows.push({ label: "Kewarganegaraan", value: w.kewarganegaraan });

  const alamatFull = [
    w.alamat,
    w.rt && w.rw ? `RT ${w.rt} / RW ${w.rw}` : null,
  ].filter(Boolean).join(", ");
  if (alamatFull) rows.push({ label: "Alamat", value: alamatFull });

  return rows;
}

// ─── Format tanggal for letter footer ────────────────────────────────────────

export function formatTanggalSurat(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
