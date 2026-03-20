import { SubscriptionTier } from "@prisma/client";

export enum Feature {
  // Administrative (all tiers)
  TATA_TERTIB = "tata_tertib",
  STRUKTUR_ORGANISASI = "struktur_organisasi",
  BARANG_INVENTARIS = "barang_inventaris",
  PROGRAM_KERJA = "program_kerja",
  PENDATAAN_RUMAH = "pendataan_rumah",
  PENDATAAN_WARGA = "pendataan_warga",
  WARGA_PINDAH = "warga_pindah",
  WARGA_MENINGGAL = "warga_meninggal",
  PENDATAAN_TAMU = "pendataan_tamu",
  PENDATAAN_KENDARAAN = "pendataan_kendaraan",
  VAKSINASI = "vaksinasi",
  BANSOS = "bansos",
  AGENDA = "agenda",
  FOTO_GALERY = "foto_galery",
  SURAT_KETERANGAN = "surat_keterangan",
  TANDA_TANGAN_DIGITAL = "tanda_tangan_digital",
  UPLOAD_BERKAS = "upload_berkas",
  SISKAMLING = "siskamling",
  BERITA = "berita",
  KELUHAN = "keluhan",
  EMAIL_NOTIFIKASI = "email_notifikasi",

  // Information reports (all tiers)
  INFO_ALAMAT = "info_alamat",
  INFO_KEPALA_KELUARGA = "info_kepala_keluarga",
  INFO_KELUARGA = "info_keluarga",
  INFO_WARGA = "info_warga",
  INFO_DOMISILI_SETEMPAT = "info_domisili_setempat",
  INFO_DOMISILI_LUAR = "info_domisili_luar",
  INFO_KK_LUAR = "info_kk_luar",
  INFO_PENDATANG = "info_pendatang",
  INFO_PEMILIH = "info_pemilih",
  INFO_USIA = "info_usia",
  INFO_KURANG_MAMPU = "info_kurang_mampu",
  INFO_WNA = "info_wna",
  INFO_PROFESI = "info_profesi",
  INFO_COVID19 = "info_covid19",
  INFO_BANSOS = "info_bansos",
  INFO_STATISTIK = "info_statistik",

  // Finance (all tiers)
  KAS_RT = "kas_rt",
  UPLOAD_BUKTI_PENGELUARAN = "upload_bukti_pengeluaran",
  IURAN_BULANAN = "iuran_bulanan",
  LAPORAN_IURAN = "laporan_iuran",
  REKAP_IURAN = "rekap_iuran",
  LAPORAN_TUNGGAKAN = "laporan_tunggakan",
  REKAP_TUNGGAKAN = "rekap_tunggakan",
  LAPORAN_CASHFLOW = "laporan_cashflow",
  LAPORAN_BULANAN_KAS = "laporan_bulanan_kas",
  REKAP_SALDO_KAS = "rekap_saldo_kas",

  // Mobile APK (all tiers)
  APK_ANDROID_RT = "apk_android_rt",
  APK_KOLEKTOR_IURAN = "apk_kolektor_iuran",

  // Tier B+ features
  USAHA_WARGA = "usaha_warga",
  PEMBANGUNAN = "pembangunan",
  APK_RONDA = "apk_ronda",

  // Tier C only
  POS_SECURITY = "pos_security",
  USAHA_WARGA_PRODUCTS = "usaha_warga_products",
}

const TIER_A_FEATURES: Feature[] = [
  Feature.TATA_TERTIB, Feature.STRUKTUR_ORGANISASI, Feature.BARANG_INVENTARIS,
  Feature.PROGRAM_KERJA, Feature.PENDATAAN_RUMAH, Feature.PENDATAAN_WARGA,
  Feature.WARGA_PINDAH, Feature.WARGA_MENINGGAL, Feature.PENDATAAN_TAMU,
  Feature.PENDATAAN_KENDARAAN, Feature.VAKSINASI, Feature.BANSOS,
  Feature.AGENDA, Feature.FOTO_GALERY, Feature.SURAT_KETERANGAN,
  Feature.TANDA_TANGAN_DIGITAL, Feature.UPLOAD_BERKAS, Feature.SISKAMLING,
  Feature.BERITA, Feature.KELUHAN, Feature.EMAIL_NOTIFIKASI,
  Feature.INFO_ALAMAT, Feature.INFO_KEPALA_KELUARGA, Feature.INFO_KELUARGA,
  Feature.INFO_WARGA, Feature.INFO_DOMISILI_SETEMPAT, Feature.INFO_DOMISILI_LUAR,
  Feature.INFO_KK_LUAR, Feature.INFO_PENDATANG, Feature.INFO_PEMILIH,
  Feature.INFO_USIA, Feature.INFO_KURANG_MAMPU, Feature.INFO_WNA,
  Feature.INFO_PROFESI, Feature.INFO_COVID19, Feature.INFO_BANSOS,
  Feature.INFO_STATISTIK, Feature.KAS_RT, Feature.UPLOAD_BUKTI_PENGELUARAN,
  Feature.IURAN_BULANAN, Feature.LAPORAN_IURAN, Feature.REKAP_IURAN,
  Feature.LAPORAN_TUNGGAKAN, Feature.REKAP_TUNGGAKAN, Feature.LAPORAN_CASHFLOW,
  Feature.LAPORAN_BULANAN_KAS, Feature.REKAP_SALDO_KAS,
  Feature.APK_ANDROID_RT, Feature.APK_KOLEKTOR_IURAN,
];

const TIER_B_ADDITIONS: Feature[] = [
  Feature.USAHA_WARGA,
  Feature.PEMBANGUNAN,
  Feature.APK_RONDA,
];

const TIER_C_ADDITIONS: Feature[] = [
  Feature.POS_SECURITY,
  Feature.USAHA_WARGA_PRODUCTS,
];

function buildTierSet(features: Feature[]): Set<Feature> {
  return new Set(features);
}

export const TIER_FEATURES = {
  TIER_A: buildTierSet(TIER_A_FEATURES),
  TIER_B: buildTierSet([...TIER_A_FEATURES, ...TIER_B_ADDITIONS]),
  TIER_C: buildTierSet([...TIER_A_FEATURES, ...TIER_B_ADDITIONS, ...TIER_C_ADDITIONS]),
} as const;

export function canAccess(feature: Feature, tier: SubscriptionTier): boolean {
  return TIER_FEATURES[tier]?.has(feature) ?? false;
}

export function getRequiredTier(feature: Feature): SubscriptionTier {
  if (TIER_FEATURES.TIER_A.has(feature)) return SubscriptionTier.TIER_A;
  if (TIER_FEATURES.TIER_B.has(feature)) return SubscriptionTier.TIER_B;
  return SubscriptionTier.TIER_C;
}

export function getTierLabel(tier: SubscriptionTier): string {
  const labels: Record<SubscriptionTier, string> = {
    TIER_A: "Basic",
    TIER_B: "Standard",
    TIER_C: "Premium",
  };
  return labels[tier];
}

export function getTierFeatureCount(tier: SubscriptionTier): number {
  return TIER_FEATURES[tier].size;
}
