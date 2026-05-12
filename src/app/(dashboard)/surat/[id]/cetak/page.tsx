"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getSuratBodyParagraphs,
  getIdentityRows,
  formatTanggalSurat,
  JENIS_LABEL,
  type SuratContext,
} from "@/lib/surat-templates";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

// ─── Types (mirrors API response) ────────────────────────────────────────────

interface SuratData {
  id: string;
  nomorSurat: string;
  jenisSurat: string;
  perihal: string;
  isiSurat: string | null;
  catatan: string | null;
  status: string;
  tanggalSurat: string;
  tanggalDisetujui: string | null;
  disetujuiOleh: string | null;
  tandaTangan: string | null;
  warga: {
    namaLengkap: string;
    nik: string;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    jenisKelamin: string | null;
    agama: string | null;
    statusPerkawinan: string | null;
    pekerjaan: string | null;
    pendidikan: string | null;
    kewarganegaraan: string | null;
    nomorHP: string | null;
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CetakSuratPage() {
  const { id } = useParams();
  const router = useRouter();
  const [surat, setSurat] = useState<SuratData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/v1/surat/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSurat(d.data);
        else setError(d.error || "Gagal memuat surat");
      })
      .catch(() => setError("Terjadi kesalahan"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !surat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-600 font-medium">{error || "Surat tidak ditemukan"}</p>
        <button onClick={() => router.back()} className="text-sm underline text-muted-foreground">
          Kembali
        </button>
      </div>
    );
  }

  const ctx: SuratContext = {
    nomor: surat.nomorSurat,
    jenis: surat.jenisSurat,
    perihal: surat.perihal,
    isiSurat: surat.isiSurat,
    catatan: surat.catatan,
    tanggal: surat.tanggalDisetujui ?? surat.tanggalSurat,
    disetujuiOleh: surat.disetujuiOleh,
    warga: surat.warga,
    tenant: surat.tenant,
  };

  const bodyParagraphs = getSuratBodyParagraphs(ctx);
  const identityRows = getIdentityRows(ctx);
  const t = surat.tenant;
  const judul = JENIS_LABEL[surat.jenisSurat] ?? "SURAT KETERANGAN";
  const kota = t.kota ?? t.kecamatan ?? "—";
  const tanggalLetter = formatTanggalSurat(surat.tanggalDisetujui ?? surat.tanggalSurat);

  return (
    <>
      {/* ── Print stylesheet ── */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 2cm 2.5cm;
        }
        @media print {
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        body { background: #f0f0f0; }
      `}</style>

      {/* ── Toolbar (no-print) ── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>

        <div className="flex items-center gap-3">
          {surat.status !== "DISETUJUI" && (
            <div className="flex items-center gap-1.5 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Surat belum disetujui — hanya untuk preview
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Printer className="h-4 w-4" /> Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* ── A4 Letter ── */}
      <div className="no-print mt-16 pb-12 flex justify-center">
        <LetterBody
          surat={surat}
          ctx={ctx}
          judul={judul}
          bodyParagraphs={bodyParagraphs}
          identityRows={identityRows}
          kota={kota}
          tanggalLetter={tanggalLetter}
          t={t}
        />
      </div>

      {/* ── Print-only version (no wrapper) ── */}
      <div className="hidden print:block">
        <LetterBody
          surat={surat}
          ctx={ctx}
          judul={judul}
          bodyParagraphs={bodyParagraphs}
          identityRows={identityRows}
          kota={kota}
          tanggalLetter={tanggalLetter}
          t={t}
          forPrint
        />
      </div>
    </>
  );
}

// ─── Letter Body Component ────────────────────────────────────────────────────

function LetterBody({
  surat, ctx, judul, bodyParagraphs, identityRows, kota, tanggalLetter, t, forPrint = false,
}: {
  surat: SuratData;
  ctx: SuratContext;
  judul: string;
  bodyParagraphs: string[];
  identityRows: { label: string; value: string }[];
  kota: string;
  tanggalLetter: string;
  t: SuratData["tenant"];
  forPrint?: boolean;
}) {
  const wrapClass = forPrint
    ? "bg-white font-serif text-black print-page"
    : "bg-white shadow-xl print-page mx-auto font-serif text-black"
      + " w-[210mm] min-h-[297mm] p-[25mm]";

  return (
    <div className={wrapClass} style={forPrint ? {} : { width: "210mm", minHeight: "297mm", padding: "20mm 25mm" }}>
      {/* === LETTERHEAD === */}
      <div className="border-b-4 border-black pb-3 mb-4">
        <div className="flex items-start gap-4">
          {/* Logo placeholder */}
          <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold text-center leading-tight">
            LOGO<br />RT
          </div>

          {/* Header text */}
          <div className="flex-1 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide">Rukun Tetangga {t.rtNumber} / Rukun Warga {t.rwNumber}</p>
            {t.kelurahan && (
              <p className="text-[10px] uppercase tracking-wide">Kelurahan {t.kelurahan}</p>
            )}
            {t.kecamatan && (
              <p className="text-[10px] uppercase tracking-wide">Kecamatan {t.kecamatan}</p>
            )}
            {t.kota && (
              <p className="text-[10px] uppercase tracking-wide">{t.kota}{t.provinsi ? `, ${t.provinsi}` : ""}</p>
            )}
            {(t.address || t.phone) && (
              <p className="text-[9px] text-gray-600 mt-0.5">
                {t.address ? `Alamat: ${t.address}` : ""}
                {t.address && t.phone ? " | " : ""}
                {t.phone ? `Telp: ${t.phone}` : ""}
              </p>
            )}
          </div>

          {/* Right spacer to balance logo */}
          <div className="w-16 h-16 shrink-0" />
        </div>
      </div>

      {/* === JUDUL & NOMOR === */}
      <div className="text-center my-5">
        <p className="text-[14px] font-bold uppercase tracking-widest underline underline-offset-4">
          {judul}
        </p>
        <p className="text-[11px] mt-1.5 tracking-wide">
          Nomor: {surat.nomorSurat}
        </p>
      </div>

      {/* === PEMBUKA === */}
      <div className="mb-4 text-[11px] leading-relaxed text-justify">
        <p>
          Yang bertanda tangan di bawah ini, Ketua RT {t.rtNumber} / RW {t.rwNumber}
          {t.kelurahan ? ` Kelurahan ${t.kelurahan}` : ""}
          {t.kecamatan ? `, Kecamatan ${t.kecamatan}` : ""}
          {t.kota ? `, ${t.kota}` : ""},
          dengan ini menerangkan bahwa:
        </p>
      </div>

      {/* === IDENTITAS WARGA === */}
      {identityRows.length > 0 ? (
        <div className="mb-5 ml-6 text-[11px]">
          <table className="w-full border-collapse">
            <tbody>
              {identityRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-0.5 pr-2 w-44 align-top">{row.label}</td>
                  <td className="py-0.5 pr-2 w-4 align-top">:</td>
                  <td className="py-0.5 align-top font-semibold">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mb-5 ml-6 text-[11px] italic text-gray-500">
          (Data warga tidak tersedia)
        </div>
      )}

      {/* === BODY TEXT === */}
      <div className="mb-6 text-[11px] leading-relaxed text-justify space-y-3">
        {bodyParagraphs.map((p, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
        ))}
      </div>

      {/* === PENUTUP === */}
      <div className="mb-8 text-[11px] leading-relaxed text-justify">
        <p>
          Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan
          sebagaimana mestinya.
        </p>
      </div>

      {/* === TANDA TANGAN === */}
      <div className="flex justify-end text-[11px]">
        <div className="text-center min-w-[180px]">
          <p>{kota}, {tanggalLetter}</p>
          <p className="mt-1">Ketua RT {t.rtNumber} / RW {t.rwNumber}</p>

          {/* Signature image or blank space */}
          {surat.tandaTangan ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={surat.tandaTangan}
              alt="Tanda Tangan"
              className="h-16 mx-auto my-2 object-contain"
            />
          ) : (
            <div className="h-16 my-2" />
          )}

          {/* Name with underline */}
          <div className="border-b border-black pb-0.5 px-2">
            <p className="font-bold">{surat.disetujuiOleh ?? "____________________"}</p>
          </div>
        </div>
      </div>

      {/* === CATATAN / FOOTER === */}
      {surat.catatan && (
        <div className="mt-6 pt-3 border-t border-dashed text-[9px] text-gray-500">
          <p><em>Catatan: {surat.catatan}</em></p>
        </div>
      )}

      {/* Validation note */}
      <div className="mt-4 pt-2 border-t border-gray-200 text-[8px] text-gray-400 text-center">
        Dicetak melalui Sistem RT Online · {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        {surat.status !== "DISETUJUI" && " · [DRAFT — BELUM DISETUJUI]"}
      </div>
    </div>
  );
}
