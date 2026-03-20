-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('TIER_A', 'TIER_B', 'TIER_C');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'RT_ADMIN', 'RT_STAFF', 'RESIDENT');

-- CreateEnum
CREATE TYPE "StatusHuni" AS ENUM ('DIHUNI', 'TIDAK_DIHUNI', 'DISEWAKAN');

-- CreateEnum
CREATE TYPE "StatusMilik" AS ENUM ('MILIK_SENDIRI', 'SEWA', 'KONTRAK', 'LAINNYA');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "Agama" AS ENUM ('ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusPerkawinan" AS ENUM ('BELUM_KAWIN', 'KAWIN', 'CERAI_HIDUP', 'CERAI_MATI');

-- CreateEnum
CREATE TYPE "StatusTinggal" AS ENUM ('TETAP', 'KONTRAK', 'KOST', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusAktifWarga" AS ENUM ('AKTIF', 'PINDAH', 'MENINGGAL', 'TIDAK_AKTIF');

-- CreateEnum
CREATE TYPE "JenisKendaraan" AS ENUM ('MOTOR', 'MOBIL', 'SEPEDA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "JenisSurat" AS ENUM ('SURAT_PENGANTAR', 'SURAT_KETERANGAN', 'SURAT_DOMISILI', 'SURAT_TIDAK_MAMPU', 'SURAT_KEMATIAN', 'SURAT_KELAHIRAN', 'SURAT_PINDAH', 'SURAT_USAHA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusSurat" AS ENUM ('DIAJUKAN', 'DIPROSES', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "JenisKas" AS ENUM ('MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "PeriodeIuran" AS ENUM ('BULANAN', 'TAHUNAN', 'INSIDENTAL');

-- CreateEnum
CREATE TYPE "MetodeBayar" AS ENUM ('TUNAI', 'TRANSFER', 'EWALLET', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusBansos" AS ENUM ('AKTIF', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusKeluhan" AS ENUM ('BARU', 'DIPROSES', 'SELESAI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusPembangunan" AS ENUM ('DIUSULKAN', 'DISETUJUI', 'DALAM_PROSES', 'SELESAI', 'DITOLAK');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rtNumber" TEXT NOT NULL,
    "rwNumber" TEXT NOT NULL,
    "kelurahan" TEXT,
    "kecamatan" TEXT,
    "kota" TEXT,
    "provinsi" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'TIER_A',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'RESIDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rumah" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nomorRumah" TEXT NOT NULL,
    "blok" TEXT,
    "alamat" TEXT NOT NULL,
    "rt" TEXT,
    "rw" TEXT,
    "statusHuni" "StatusHuni" NOT NULL DEFAULT 'DIHUNI',
    "statusMilik" "StatusMilik" NOT NULL DEFAULT 'MILIK_SENDIRI',
    "luasTanah" DOUBLE PRECISION,
    "luasBangunan" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "foto" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rumah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keluarga" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rumahId" TEXT NOT NULL,
    "nomorKK" TEXT NOT NULL,
    "kepalaKeluarga" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warga" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "keluargaId" TEXT,
    "userId" TEXT,
    "nik" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "tempatLahir" TEXT,
    "tanggalLahir" TIMESTAMP(3),
    "jenisKelamin" "JenisKelamin",
    "golonganDarah" TEXT,
    "agama" "Agama",
    "statusPerkawinan" "StatusPerkawinan",
    "pekerjaan" TEXT,
    "pendidikan" TEXT,
    "kewarganegaraan" TEXT DEFAULT 'WNI',
    "nomorHP" TEXT,
    "email" TEXT,
    "foto" TEXT,
    "statusTinggal" "StatusTinggal" NOT NULL DEFAULT 'TETAP',
    "statusAktif" "StatusAktifWarga" NOT NULL DEFAULT 'AKTIF',
    "tanggalMasuk" TIMESTAMP(3),
    "tanggalKeluar" TIMESTAMP(3),
    "alamatPindah" TEXT,
    "keteranganPindah" TEXT,
    "tanggalMeninggal" TIMESTAMP(3),
    "keteranganMeninggal" TEXT,
    "isPemilih" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tamu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "nik" TEXT,
    "alamatAsal" TEXT NOT NULL,
    "tujuan" TEXT NOT NULL,
    "wargaDikunjungi" TEXT NOT NULL,
    "nomorHP" TEXT,
    "nomorKendaraan" TEXT,
    "foto" TEXT,
    "waktuDatang" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waktuPulang" TIMESTAMP(3),
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tamu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kendaraan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rumahId" TEXT,
    "pemilik" TEXT NOT NULL,
    "jenisKendaraan" "JenisKendaraan" NOT NULL,
    "merek" TEXT,
    "nomorPolisi" TEXT NOT NULL,
    "warna" TEXT,
    "tahun" INTEGER,
    "stnkBerlaku" TIMESTAMP(3),
    "foto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kendaraan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wargaId" TEXT,
    "nomorSurat" TEXT NOT NULL,
    "jenisSurat" "JenisSurat" NOT NULL,
    "perihal" TEXT NOT NULL,
    "isiSurat" TEXT,
    "status" "StatusSurat" NOT NULL DEFAULT 'DIAJUKAN',
    "tanggalSurat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggalDisetujui" TIMESTAMP(3),
    "disetujuiOleh" TEXT,
    "tandaTangan" TEXT,
    "catatan" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KasTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jenis" "JenisKas" NOT NULL,
    "kategori" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "buktiUrl" TEXT,
    "pencatat" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KasTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IuranType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "periode" "PeriodeIuran" NOT NULL DEFAULT 'BULANAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IuranType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IuranPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "iuranTypeId" TEXT NOT NULL,
    "wargaId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "tanggalBayar" TIMESTAMP(3),
    "metodeBayar" "MetodeBayar",
    "buktiUrl" TEXT,
    "pencatat" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IuranPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3),
    "lokasi" TEXT,
    "foto" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Berita" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "ringkasan" TEXT,
    "gambar" TEXT,
    "penulis" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Berita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bansos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sumber" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3),
    "status" "StatusBansos" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bansos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BansosRecipient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bansosId" TEXT NOT NULL,
    "wargaId" TEXT NOT NULL,
    "tanggalTerima" TIMESTAMP(3),
    "jumlah" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BansosRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siskamling" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "shift" TEXT,
    "petugas" TEXT[],
    "lokasi" TEXT,
    "catatan" TEXT,
    "kejadian" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Siskamling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keluhan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pengirim" TEXT NOT NULL,
    "email" TEXT,
    "kategori" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "status" "StatusKeluhan" NOT NULL DEFAULT 'BARU',
    "tanggapan" TEXT,
    "tanggalTanggap" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keluhan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventaris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "namaBarang" TEXT NOT NULL,
    "kategori" TEXT,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "kondisi" TEXT,
    "lokasi" TEXT,
    "tanggalPerolehan" TIMESTAMP(3),
    "nilaiPerolehan" DECIMAL(15,2),
    "catatan" TEXT,
    "foto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventaris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisasi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "foto" TEXT,
    "nomorHP" TEXT,
    "periode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsahaWarga" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "namaUsaha" TEXT NOT NULL,
    "pemilik" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "alamat" TEXT,
    "nomorHP" TEXT,
    "deskripsi" TEXT,
    "foto" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsahaWarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "usahaWargaId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "harga" DECIMAL(15,2) NOT NULL,
    "foto" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pembangunan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "pengusul" TEXT NOT NULL,
    "estimasiBiaya" DECIMAL(15,2),
    "lokasi" TEXT,
    "status" "StatusPembangunan" NOT NULL DEFAULT 'DIUSULKAN',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pembangunan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSecurityLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "petugas" TEXT NOT NULL,
    "shift" TEXT,
    "kejadian" TEXT,
    "tamuMasuk" INTEGER NOT NULL DEFAULT 0,
    "tamuKeluar" INTEGER NOT NULL DEFAULT 0,
    "kendaraanMasuk" INTEGER NOT NULL DEFAULT 0,
    "kendaraanKeluar" INTEGER NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSecurityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TataTertib" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TataTertib_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramKerja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tahun" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RENCANA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramKerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Berkas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Berkas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Covid19Data" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wargaId" TEXT,
    "nama" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Covid19Data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaksinasiData" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wargaId" TEXT NOT NULL,
    "dosis" INTEGER NOT NULL,
    "jenisVaksin" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "lokasi" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaksinasiData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Rumah_tenantId_idx" ON "Rumah"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Rumah_tenantId_nomorRumah_blok_key" ON "Rumah"("tenantId", "nomorRumah", "blok");

-- CreateIndex
CREATE INDEX "Keluarga_tenantId_idx" ON "Keluarga"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Keluarga_tenantId_nomorKK_key" ON "Keluarga"("tenantId", "nomorKK");

-- CreateIndex
CREATE UNIQUE INDEX "Warga_userId_key" ON "Warga"("userId");

-- CreateIndex
CREATE INDEX "Warga_tenantId_idx" ON "Warga"("tenantId");

-- CreateIndex
CREATE INDEX "Warga_tenantId_statusAktif_idx" ON "Warga"("tenantId", "statusAktif");

-- CreateIndex
CREATE UNIQUE INDEX "Warga_tenantId_nik_key" ON "Warga"("tenantId", "nik");

-- CreateIndex
CREATE INDEX "Tamu_tenantId_idx" ON "Tamu"("tenantId");

-- CreateIndex
CREATE INDEX "Tamu_tenantId_waktuDatang_idx" ON "Tamu"("tenantId", "waktuDatang");

-- CreateIndex
CREATE INDEX "Kendaraan_tenantId_idx" ON "Kendaraan"("tenantId");

-- CreateIndex
CREATE INDEX "Surat_tenantId_idx" ON "Surat"("tenantId");

-- CreateIndex
CREATE INDEX "Surat_tenantId_jenisSurat_idx" ON "Surat"("tenantId", "jenisSurat");

-- CreateIndex
CREATE INDEX "KasTransaction_tenantId_idx" ON "KasTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "KasTransaction_tenantId_tanggal_idx" ON "KasTransaction"("tenantId", "tanggal");

-- CreateIndex
CREATE INDEX "KasTransaction_tenantId_jenis_idx" ON "KasTransaction"("tenantId", "jenis");

-- CreateIndex
CREATE INDEX "IuranType_tenantId_idx" ON "IuranType"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "IuranType_tenantId_nama_key" ON "IuranType"("tenantId", "nama");

-- CreateIndex
CREATE INDEX "IuranPayment_tenantId_idx" ON "IuranPayment"("tenantId");

-- CreateIndex
CREATE INDEX "IuranPayment_tenantId_tahun_bulan_idx" ON "IuranPayment"("tenantId", "tahun", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "IuranPayment_tenantId_iuranTypeId_wargaId_bulan_tahun_key" ON "IuranPayment"("tenantId", "iuranTypeId", "wargaId", "bulan", "tahun");

-- CreateIndex
CREATE INDEX "Agenda_tenantId_idx" ON "Agenda"("tenantId");

-- CreateIndex
CREATE INDEX "Berita_tenantId_idx" ON "Berita"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Berita_tenantId_slug_key" ON "Berita"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Bansos_tenantId_idx" ON "Bansos"("tenantId");

-- CreateIndex
CREATE INDEX "BansosRecipient_tenantId_idx" ON "BansosRecipient"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BansosRecipient_bansosId_wargaId_key" ON "BansosRecipient"("bansosId", "wargaId");

-- CreateIndex
CREATE INDEX "Siskamling_tenantId_idx" ON "Siskamling"("tenantId");

-- CreateIndex
CREATE INDEX "Siskamling_tenantId_tanggal_idx" ON "Siskamling"("tenantId", "tanggal");

-- CreateIndex
CREATE INDEX "Keluhan_tenantId_idx" ON "Keluhan"("tenantId");

-- CreateIndex
CREATE INDEX "Inventaris_tenantId_idx" ON "Inventaris"("tenantId");

-- CreateIndex
CREATE INDEX "Organisasi_tenantId_idx" ON "Organisasi"("tenantId");

-- CreateIndex
CREATE INDEX "UsahaWarga_tenantId_idx" ON "UsahaWarga"("tenantId");

-- CreateIndex
CREATE INDEX "Pembangunan_tenantId_idx" ON "Pembangunan"("tenantId");

-- CreateIndex
CREATE INDEX "PosSecurityLog_tenantId_idx" ON "PosSecurityLog"("tenantId");

-- CreateIndex
CREATE INDEX "PosSecurityLog_tenantId_tanggal_idx" ON "PosSecurityLog"("tenantId", "tanggal");

-- CreateIndex
CREATE INDEX "TataTertib_tenantId_idx" ON "TataTertib"("tenantId");

-- CreateIndex
CREATE INDEX "ProgramKerja_tenantId_idx" ON "ProgramKerja"("tenantId");

-- CreateIndex
CREATE INDEX "Berkas_tenantId_idx" ON "Berkas"("tenantId");

-- CreateIndex
CREATE INDEX "Covid19Data_tenantId_idx" ON "Covid19Data"("tenantId");

-- CreateIndex
CREATE INDEX "VaksinasiData_tenantId_idx" ON "VaksinasiData"("tenantId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rumah" ADD CONSTRAINT "Rumah_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keluarga" ADD CONSTRAINT "Keluarga_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keluarga" ADD CONSTRAINT "Keluarga_rumahId_fkey" FOREIGN KEY ("rumahId") REFERENCES "Rumah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_keluargaId_fkey" FOREIGN KEY ("keluargaId") REFERENCES "Keluarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tamu" ADD CONSTRAINT "Tamu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kendaraan" ADD CONSTRAINT "Kendaraan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kendaraan" ADD CONSTRAINT "Kendaraan_rumahId_fkey" FOREIGN KEY ("rumahId") REFERENCES "Rumah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surat" ADD CONSTRAINT "Surat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surat" ADD CONSTRAINT "Surat_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasTransaction" ADD CONSTRAINT "KasTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IuranType" ADD CONSTRAINT "IuranType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IuranPayment" ADD CONSTRAINT "IuranPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IuranPayment" ADD CONSTRAINT "IuranPayment_iuranTypeId_fkey" FOREIGN KEY ("iuranTypeId") REFERENCES "IuranType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IuranPayment" ADD CONSTRAINT "IuranPayment_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Berita" ADD CONSTRAINT "Berita_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bansos" ADD CONSTRAINT "Bansos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BansosRecipient" ADD CONSTRAINT "BansosRecipient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BansosRecipient" ADD CONSTRAINT "BansosRecipient_bansosId_fkey" FOREIGN KEY ("bansosId") REFERENCES "Bansos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BansosRecipient" ADD CONSTRAINT "BansosRecipient_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siskamling" ADD CONSTRAINT "Siskamling_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keluhan" ADD CONSTRAINT "Keluhan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventaris" ADD CONSTRAINT "Inventaris_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisasi" ADD CONSTRAINT "Organisasi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsahaWarga" ADD CONSTRAINT "UsahaWarga_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_usahaWargaId_fkey" FOREIGN KEY ("usahaWargaId") REFERENCES "UsahaWarga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembangunan" ADD CONSTRAINT "Pembangunan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSecurityLog" ADD CONSTRAINT "PosSecurityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TataTertib" ADD CONSTRAINT "TataTertib_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKerja" ADD CONSTRAINT "ProgramKerja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Berkas" ADD CONSTRAINT "Berkas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Covid19Data" ADD CONSTRAINT "Covid19Data_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaksinasiData" ADD CONSTRAINT "VaksinasiData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaksinasiData" ADD CONSTRAINT "VaksinasiData_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
