/**
 * prisma/seed.ts — Data demo lengkap untuk SaaS RT/RW
 * Jalankan: npx prisma db seed
 *
 * Akun demo (password: password123):
 *   superadmin@rt-online.id  → SUPER_ADMIN
 *   admin@rt-online.id       → RT_ADMIN
 *   rw@rt-online.id          → RW_ADMIN
 *   warga@rt-online.id       → RESIDENT
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helper ──────────────────────────────────────────────────────────────────

function date(year: number, month: number, day: number) {
  return new Date(year, month - 1, day);
}
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const Y = 2026; // tahun berjalan

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Memulai seeding database...\n");

  // ── 1. Bersihkan data lama (urutan penting karena FK) ──────────────────────
  console.log("🗑  Menghapus data lama...");
  await prisma.vaksinasiData.deleteMany();
  await prisma.bansosRecipient.deleteMany();
  await prisma.bansos.deleteMany();
  await prisma.iuranPayment.deleteMany();
  await prisma.iuranType.deleteMany();
  await prisma.kasTransaction.deleteMany();
  await prisma.surat.deleteMany();
  await prisma.keluhan.deleteMany();
  await prisma.pengajuan.deleteMany();
  await prisma.berita.deleteMany();
  await prisma.agenda.deleteMany();
  await prisma.siskamling.deleteMany();
  await prisma.tamu.deleteMany();
  await prisma.kendaraan.deleteMany();
  await prisma.pPOBOrder.deleteMany();
  await prisma.iklanUsaha.deleteMany();
  await prisma.product.deleteMany();
  await prisma.usahaWarga.deleteMany();
  await prisma.pembangunan.deleteMany();
  await prisma.posSecurityLog.deleteMany();
  await prisma.inventaris.deleteMany();
  await prisma.organisasi.deleteMany();
  await prisma.tataTertib.deleteMany();
  await prisma.programKerja.deleteMany();
  await prisma.berkas.deleteMany();
  await prisma.covid19Data.deleteMany();
  await prisma.warga.deleteMany();
  await prisma.keluarga.deleteMany();
  await prisma.rumah.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  console.log("   ✓ Selesai\n");

  const pw = await hash("password123", 12);

  // ── 2. Tenant ──────────────────────────────────────────────────────────────
  console.log("🏘  Membuat Tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "RT 003 / RW 012 Kel. Pancoran Mas",
      slug: "rt003-rw012-pancoran-mas",
      rtNumber: "003",
      rwNumber: "012",
      kelurahan: "Pancoran Mas",
      kecamatan: "Pancoran Mas",
      kota: "Depok",
      provinsi: "Jawa Barat",
      address: "Jl. Kenanga Indah, Pancoran Mas, Depok 16434",
      phone: "021-77889900",
      email: "rt003.pancoranmas@gmail.com",
      subscription: {
        create: {
          tier: "TIER_B",
          status: "ACTIVE",
          currentPeriodStart: date(Y, 1, 1),
          currentPeriodEnd: date(Y, 12, 31),
        },
      },
    },
  });
  console.log(`   ✓ Tenant: ${tenant.name}\n`);

  // ── 3. Users ──────────────────────────────────────────────────────────────
  console.log("👤 Membuat Users...");

  await prisma.user.create({
    data: {
      email: "superadmin@rt-online.id",
      password: pw,
      name: "Developer Admin",
      role: "SUPER_ADMIN",
      phone: "081200000001",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@rt-online.id",
      password: pw,
      name: "Budi Santoso",
      role: "RT_ADMIN",
      phone: "081234567890",
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "rw@rt-online.id",
      password: pw,
      name: "H. Mahmud Harun",
      role: "RW_ADMIN",
      phone: "081234567891",
    },
  });

  const residentUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "warga@rt-online.id",
      password: pw,
      name: "Ahmad Hidayat",
      role: "RESIDENT",
      phone: "081234567892",
    },
  });

  console.log("   ✓ 4 user dibuat\n");

  // ── 4. Rumah (20 unit) ────────────────────────────────────────────────────
  console.log("🏠 Membuat Rumah...");
  const rumahList: { id: string }[] = [];
  const statusHuniList = ["DIHUNI", "DIHUNI", "DIHUNI", "DIHUNI", "TIDAK_DIHUNI", "DISEWAKAN"] as const;
  const statusMilikList = ["MILIK_SENDIRI", "MILIK_SENDIRI", "MILIK_SENDIRI", "SEWA", "KONTRAK"] as const;

  for (let i = 1; i <= 20; i++) {
    const r = await prisma.rumah.create({
      data: {
        tenantId: tenant.id,
        nomorRumah: i.toString().padStart(3, "0"),
        blok: i <= 10 ? "A" : "B",
        alamat: `Jl. Kenanga Indah No. ${i}, Pancoran Mas, Depok`,
        rt: "003",
        rw: "012",
        statusHuni: statusHuniList[i % statusHuniList.length],
        statusMilik: statusMilikList[i % statusMilikList.length],
        luasTanah: 60 + (i % 6) * 20,
        luasBangunan: 45 + (i % 5) * 15,
      },
    });
    rumahList.push(r);
  }
  console.log(`   ✓ ${rumahList.length} rumah dibuat\n`);

  // ── 5. Keluarga + Warga ───────────────────────────────────────────────────
  console.log("👨‍👩‍👧‍👦 Membuat Keluarga & Warga...");

  type AnggotaDef = {
    nama: string;
    gender: "LAKI_LAKI" | "PEREMPUAN";
    lahir: [number, number, number];
    pekerjaan: string;
    pendidikan: string;
    status: "KAWIN" | "BELUM_KAWIN" | "CERAI_HIDUP" | "CERAI_MATI";
  };

  const keluargaDef: {
    kk: string;
    noKK: string;
    anggota: AnggotaDef[];
  }[] = [
    {
      kk: "Ahmad Hidayat",
      noKK: "3276010000000001",
      anggota: [
        { nama: "Ahmad Hidayat",     gender: "LAKI_LAKI", lahir: [1982, 3, 15], pekerjaan: "Wiraswasta",     pendidikan: "S1",  status: "KAWIN" },
        { nama: "Fatimah Zahra",     gender: "PEREMPUAN", lahir: [1985, 7, 22], pekerjaan: "Ibu Rumah Tangga", pendidikan: "S1", status: "KAWIN" },
        { nama: "Reza Hidayat",      gender: "LAKI_LAKI", lahir: [2008, 2, 10], pekerjaan: "Pelajar",        pendidikan: "SMP", status: "BELUM_KAWIN" },
        { nama: "Nadia Hidayat",     gender: "PEREMPUAN", lahir: [2012, 9, 5],  pekerjaan: "Pelajar",        pendidikan: "SD",  status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Bambang Purnomo",
      noKK: "3276010000000002",
      anggota: [
        { nama: "Bambang Purnomo",   gender: "LAKI_LAKI", lahir: [1975, 11, 8], pekerjaan: "PNS",            pendidikan: "S1",  status: "KAWIN" },
        { nama: "Dewi Lestari",      gender: "PEREMPUAN", lahir: [1978, 4, 17], pekerjaan: "Guru",           pendidikan: "S1",  status: "KAWIN" },
        { nama: "Fajar Purnomo",     gender: "LAKI_LAKI", lahir: [2005, 6, 25], pekerjaan: "Mahasiswa",      pendidikan: "SMA", status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Candra Wijaya",
      noKK: "3276010000000003",
      anggota: [
        { nama: "Candra Wijaya",     gender: "LAKI_LAKI", lahir: [1980, 1, 30], pekerjaan: "Karyawan Swasta","pendidikan": "S1", status: "KAWIN" },
        { nama: "Eka Putri",         gender: "PEREMPUAN", lahir: [1983, 8, 12], pekerjaan: "Ibu Rumah Tangga", pendidikan: "D3", status: "KAWIN" },
        { nama: "Galih Wijaya",      gender: "LAKI_LAKI", lahir: [2007, 3, 19], pekerjaan: "Pelajar",        pendidikan: "SMP", status: "BELUM_KAWIN" },
        { nama: "Hana Wijaya",       gender: "PEREMPUAN", lahir: [2010, 12, 1], pekerjaan: "Pelajar",        pendidikan: "SD",  status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Dedi Supriadi",
      noKK: "3276010000000004",
      anggota: [
        { nama: "Dedi Supriadi",     gender: "LAKI_LAKI", lahir: [1970, 5, 7],  pekerjaan: "Pensiunan",      pendidikan: "SMA", status: "KAWIN" },
        { nama: "Intan Permata",     gender: "PEREMPUAN", lahir: [1974, 9, 14], pekerjaan: "Ibu Rumah Tangga", pendidikan: "SMA", status: "KAWIN" },
      ],
    },
    {
      kk: "Eko Prasetyo",
      noKK: "3276010000000005",
      anggota: [
        { nama: "Eko Prasetyo",      gender: "LAKI_LAKI", lahir: [1988, 7, 21], pekerjaan: "Dokter",         pendidikan: "S2",  status: "KAWIN" },
        { nama: "Juwita Sari",       gender: "PEREMPUAN", lahir: [1990, 2, 14], pekerjaan: "Apoteker",       pendidikan: "S1",  status: "KAWIN" },
        { nama: "Kevin Prasetyo",    gender: "LAKI_LAKI", lahir: [2014, 4, 3],  pekerjaan: "Pelajar",        pendidikan: "SD",  status: "BELUM_KAWIN" },
        { nama: "Lina Prasetyo",     gender: "PEREMPUAN", lahir: [2016, 11, 20], pekerjaan: "Pelajar",       pendidikan: "SD",  status: "BELUM_KAWIN" },
        { nama: "Maya Prasetyo",     gender: "PEREMPUAN", lahir: [2019, 6, 30], pekerjaan: "Belum Sekolah",  pendidikan: "Belum Sekolah", status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Faisal Rahman",
      noKK: "3276010000000006",
      anggota: [
        { nama: "Faisal Rahman",     gender: "LAKI_LAKI", lahir: [1977, 10, 11], pekerjaan: "Pengusaha",     pendidikan: "S1",  status: "KAWIN" },
        { nama: "Kartini Dewi",      gender: "PEREMPUAN", lahir: [1980, 3, 25], pekerjaan: "Ibu Rumah Tangga", pendidikan: "D3", status: "KAWIN" },
        { nama: "Nabil Rahman",      gender: "LAKI_LAKI", lahir: [2003, 8, 18], pekerjaan: "Mahasiswa",      pendidikan: "SMA", status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Gunawan Setiawan",
      noKK: "3276010000000007",
      anggota: [
        { nama: "Gunawan Setiawan",  gender: "LAKI_LAKI", lahir: [1969, 12, 5], pekerjaan: "Pensiunan TNI",  pendidikan: "SMA", status: "KAWIN" },
        { nama: "Laras Ayu",         gender: "PEREMPUAN", lahir: [1973, 6, 22], pekerjaan: "Ibu Rumah Tangga", pendidikan: "SMA", status: "KAWIN" },
        { nama: "Oscar Setiawan",    gender: "LAKI_LAKI", lahir: [1998, 9, 10], pekerjaan: "Karyawan Swasta", pendidikan: "S1", status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Heri Susanto",
      noKK: "3276010000000008",
      anggota: [
        { nama: "Heri Susanto",      gender: "LAKI_LAKI", lahir: [1985, 4, 28], pekerjaan: "Teknisi",        pendidikan: "STM", status: "KAWIN" },
        { nama: "Melati Sari",       gender: "PEREMPUAN", lahir: [1987, 1, 16], pekerjaan: "Bidan",          pendidikan: "D3",  status: "KAWIN" },
        { nama: "Putra Susanto",     gender: "LAKI_LAKI", lahir: [2011, 7, 4],  pekerjaan: "Pelajar",        pendidikan: "SD",  status: "BELUM_KAWIN" },
        { nama: "Qori Susanto",      gender: "PEREMPUAN", lahir: [2014, 3, 22], pekerjaan: "Pelajar",        pendidikan: "SD",  status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Irfan Hakim",
      noKK: "3276010000000009",
      anggota: [
        { nama: "Irfan Hakim",       gender: "LAKI_LAKI", lahir: [1992, 8, 9],  pekerjaan: "Programmer",     pendidikan: "S1",  status: "KAWIN" },
        { nama: "Nita Anggraini",    gender: "PEREMPUAN", lahir: [1994, 5, 31], pekerjaan: "Desainer",       pendidikan: "S1",  status: "KAWIN" },
      ],
    },
    {
      kk: "Joko Prasetyo",
      noKK: "3276010000000010",
      anggota: [
        { nama: "Joko Prasetyo",     gender: "LAKI_LAKI", lahir: [1965, 2, 18], pekerjaan: "Pedagang",       pendidikan: "SMA", status: "KAWIN" },
        { nama: "Olivia Putri",      gender: "PEREMPUAN", lahir: [1968, 11, 7], pekerjaan: "Ibu Rumah Tangga", pendidikan: "SMA", status: "KAWIN" },
        { nama: "Rio Prasetyo",      gender: "LAKI_LAKI", lahir: [1995, 4, 14], pekerjaan: "Karyawan BUMN",  pendidikan: "S1",  status: "KAWIN" },
      ],
    },
    {
      kk: "Kurniawan Adi",
      noKK: "3276010000000011",
      anggota: [
        { nama: "Kurniawan Adi",     gender: "LAKI_LAKI", lahir: [1979, 6, 13], pekerjaan: "Kontraktor",     pendidikan: "S1",  status: "KAWIN" },
        { nama: "Puspita Sari",      gender: "PEREMPUAN", lahir: [1982, 10, 27], pekerjaan: "Ibu Rumah Tangga", pendidikan: "S1", status: "KAWIN" },
        { nama: "Sari Adi",          gender: "PEREMPUAN", lahir: [2006, 2, 8],  pekerjaan: "Pelajar",        pendidikan: "SMP", status: "BELUM_KAWIN" },
        { nama: "Teguh Adi",         gender: "LAKI_LAKI", lahir: [2009, 7, 19], pekerjaan: "Pelajar",        pendidikan: "SD",  status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Lukman Hakim",
      noKK: "3276010000000012",
      anggota: [
        { nama: "Lukman Hakim",      gender: "LAKI_LAKI", lahir: [1973, 9, 2],  pekerjaan: "Wiraswasta",     pendidikan: "SMA", status: "KAWIN" },
        { nama: "Rina Wati",         gender: "PEREMPUAN", lahir: [1976, 12, 15], pekerjaan: "Perawat",       pendidikan: "D3",  status: "KAWIN" },
        { nama: "Umar Hakim",        gender: "LAKI_LAKI", lahir: [2001, 5, 30], pekerjaan: "Karyawan Swasta", pendidikan: "S1", status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Muhammad Rizal",
      noKK: "3276010000000013",
      anggota: [
        { nama: "Muhammad Rizal",    gender: "LAKI_LAKI", lahir: [1990, 3, 21], pekerjaan: "Arsitek",        pendidikan: "S1",  status: "KAWIN" },
        { nama: "Vina Amelia",       gender: "PEREMPUAN", lahir: [1993, 8, 6],  pekerjaan: "Akunttan",       pendidikan: "S1",  status: "KAWIN" },
        { nama: "Wulan Rizal",       gender: "PEREMPUAN", lahir: [2018, 1, 12], pekerjaan: "Belum Sekolah",  pendidikan: "Belum Sekolah", status: "BELUM_KAWIN" },
      ],
    },
    {
      kk: "Nugroho Susilo",
      noKK: "3276010000000014",
      anggota: [
        { nama: "Nugroho Susilo",    gender: "LAKI_LAKI", lahir: [1960, 7, 14], pekerjaan: "Pensiunan PNS",  pendidikan: "S1",  status: "KAWIN" },
        { nama: "Xenia Putri",       gender: "PEREMPUAN", lahir: [1963, 4, 29], pekerjaan: "Ibu Rumah Tangga", pendidikan: "SMA", status: "KAWIN" },
      ],
    },
    {
      kk: "Omar Bakri",
      noKK: "3276010000000015",
      anggota: [
        { nama: "Omar Bakri",        gender: "LAKI_LAKI", lahir: [1983, 11, 3], pekerjaan: "Manajer",        pendidikan: "S2",  status: "KAWIN" },
        { nama: "Yuliana Sari",      gender: "PEREMPUAN", lahir: [1986, 6, 18], pekerjaan: "Ibu Rumah Tangga", pendidikan: "S1", status: "KAWIN" },
        { nama: "Zaki Bakri",        gender: "LAKI_LAKI", lahir: [2010, 10, 25], pekerjaan: "Pelajar",       pendidikan: "SD",  status: "BELUM_KAWIN" },
        { nama: "Aisha Bakri",       gender: "PEREMPUAN", lahir: [2013, 3, 7],  pekerjaan: "Pelajar",        pendidikan: "SD",  status: "BELUM_KAWIN" },
      ],
    },
  ];

  const wargaIds: string[] = [];
  let nikCounter = 1;

  for (let i = 0; i < keluargaDef.length; i++) {
    const fam = keluargaDef[i];
    const kk = await prisma.keluarga.create({
      data: {
        tenantId: tenant.id,
        rumahId: rumahList[i].id,
        nomorKK: fam.noKK,
        kepalaKeluarga: fam.kk,
      },
    });

    for (let j = 0; j < fam.anggota.length; j++) {
      const a = fam.anggota[j];
      const nik = `3276${(nikCounter++).toString().padStart(12, "0")}`;
      const w = await prisma.warga.create({
        data: {
          tenantId: tenant.id,
          keluargaId: kk.id,
          userId: i === 0 && j === 0 ? residentUser.id : undefined,
          nik,
          namaLengkap: a.nama,
          tempatLahir: "Depok",
          tanggalLahir: date(...a.lahir),
          jenisKelamin: a.gender,
          agama: "ISLAM",
          statusPerkawinan: a.status,
          pekerjaan: a.pekerjaan,
          pendidikan: a.pendidikan,
          kewarganegaraan: "WNI",
          nomorHP: `08${(1300000000 + nikCounter).toString()}`,
          statusTinggal: "TETAP",
          statusAktif: "AKTIF",
          isPemilih: a.lahir[0] <= 2008,
        },
      });
      wargaIds.push(w.id);
    }
  }
  console.log(`   ✓ ${keluargaDef.length} keluarga, ${wargaIds.length} warga\n`);

  // ── 6. Kendaraan ──────────────────────────────────────────────────────────
  console.log("🚗 Membuat Kendaraan...");
  const kendaraanData = [
    { pemilik: "Ahmad Hidayat",   jenis: "MOTOR", merek: "Honda",  nopol: "B 1234 XYZ", warna: "Hitam",  tahun: 2019 },
    { pemilik: "Ahmad Hidayat",   jenis: "MOBIL", merek: "Toyota", nopol: "B 5678 ABC", warna: "Silver", tahun: 2021 },
    { pemilik: "Bambang Purnomo", jenis: "MOTOR", merek: "Yamaha", nopol: "B 2345 DEF", warna: "Biru",   tahun: 2020 },
    { pemilik: "Bambang Purnomo", jenis: "MOBIL", merek: "Honda",  nopol: "B 6789 GHI", warna: "Putih",  tahun: 2018 },
    { pemilik: "Candra Wijaya",   jenis: "MOTOR", merek: "Suzuki", nopol: "B 3456 JKL", warna: "Merah",  tahun: 2022 },
    { pemilik: "Dedi Supriadi",   jenis: "MOTOR", merek: "Honda",  nopol: "B 4567 MNO", warna: "Hitam",  tahun: 2017 },
    { pemilik: "Eko Prasetyo",    jenis: "MOBIL", merek: "Mazda",  nopol: "B 7890 PQR", warna: "Abu-abu", tahun: 2023 },
    { pemilik: "Faisal Rahman",   jenis: "MOBIL", merek: "Toyota", nopol: "B 8901 STU", warna: "Hitam",  tahun: 2022 },
    { pemilik: "Faisal Rahman",   jenis: "MOTOR", merek: "Yamaha", nopol: "B 5555 VWX", warna: "Putih",  tahun: 2021 },
    { pemilik: "Gunawan Setiawan",jenis: "MOTOR", merek: "Honda",  nopol: "B 9012 YZA", warna: "Merah",  tahun: 2016 },
    { pemilik: "Heri Susanto",    jenis: "MOTOR", merek: "Kawasaki",nopol:"B 1357 BCD", warna: "Hijau",  tahun: 2020 },
    { pemilik: "Irfan Hakim",     jenis: "MOBIL", merek: "Honda",  nopol: "B 2468 EFG", warna: "Putih",  tahun: 2024 },
    { pemilik: "Irfan Hakim",     jenis: "SEPEDA",merek: "Polygon",nopol: "-",          warna: "Biru",   tahun: 2022 },
    { pemilik: "Lukman Hakim",    jenis: "MOTOR", merek: "Honda",  nopol: "B 3579 HIJ", warna: "Hitam",  tahun: 2018 },
    { pemilik: "Omar Bakri",      jenis: "MOBIL", merek: "BMW",    nopol: "B 4680 KLM", warna: "Hitam",  tahun: 2023 },
  ] as const;

  for (const k of kendaraanData) {
    const rumah = rumahList.find((r) =>
      keluargaDef.some((f, idx) => f.kk === k.pemilik && rumahList[idx]?.id === r.id)
    );
    await prisma.kendaraan.create({
      data: {
        tenantId: tenant.id,
        rumahId: rumah?.id ?? rumahList[0].id,
        pemilik: k.pemilik,
        jenisKendaraan: k.jenis,
        merek: k.merek,
        nomorPolisi: k.nopol,
        warna: k.warna,
        tahun: k.tahun,
        stnkBerlaku: date(Y + 1, randInt(1, 12), randInt(1, 28)),
      },
    });
  }
  console.log(`   ✓ ${kendaraanData.length} kendaraan\n`);

  // ── 7. Tamu ───────────────────────────────────────────────────────────────
  console.log("🧳 Membuat data Tamu...");
  const tamuData = [
    { nama: "Santoso Hadi",      asal: "Bekasi",         tujuan: "Silaturahmi",         wargaDikunjungi: "Ahmad Hidayat" },
    { nama: "Rini Kusuma",       asal: "Jakarta Selatan", tujuan: "Urusan Keluarga",    wargaDikunjungi: "Bambang Purnomo" },
    { nama: "Agus Salim",        asal: "Bogor",           tujuan: "Jual Beli",          wargaDikunjungi: "Faisal Rahman" },
    { nama: "Lestari Dewi",      asal: "Tangerang",       tujuan: "Arisan",             wargaDikunjungi: "Kartini Dewi" },
    { nama: "Budi Rahardjo",     asal: "Depok",           tujuan: "Silaturahmi",        wargaDikunjungi: "Joko Prasetyo" },
    { nama: "Siti Rahayu",       asal: "Bandung",         tujuan: "Menginap",           wargaDikunjungi: "Ahmad Hidayat" },
    { nama: "Wahyu Darmawan",    asal: "Cibubur",         tujuan: "Servis Barang",      wargaDikunjungi: "Heri Susanto" },
    { nama: "Endah Pertiwi",     asal: "Sawangan",        tujuan: "Kegiatan Sosial",    wargaDikunjungi: "Melati Sari" },
    { nama: "Tono Subroto",      asal: "Ciputat",         tujuan: "Antar Paket",        wargaDikunjungi: "Omar Bakri" },
    { nama: "Yuni Astuti",       asal: "Jakarta Timur",   tujuan: "Lamaran Kerja",      wargaDikunjungi: "Irfan Hakim" },
  ];

  for (let i = 0; i < tamuData.length; i++) {
    const t = tamuData[i];
    const masuk = new Date(Y, randInt(0, 4), randInt(1, 28), randInt(8, 17), 0);
    const pulang = new Date(masuk.getTime() + randInt(1, 4) * 3600 * 1000);
    await prisma.tamu.create({
      data: {
        tenantId: tenant.id,
        namaLengkap: t.nama,
        alamatAsal: t.asal,
        tujuan: t.tujuan,
        wargaDikunjungi: t.wargaDikunjungi,
        nomorHP: `08${(1200000001 + i).toString()}`,
        waktuDatang: masuk,
        waktuPulang: pulang,
      },
    });
  }
  console.log(`   ✓ ${tamuData.length} tamu\n`);

  // ── 8. Surat ──────────────────────────────────────────────────────────────
  console.log("📄 Membuat Surat...");
  const suratData = [
    { jenis: "SURAT_PENGANTAR",   perihal: "Surat Pengantar Nikah",           status: "DISETUJUI", wargaIdx: 0 },
    { jenis: "SURAT_DOMISILI",    perihal: "Surat Keterangan Domisili Usaha", status: "DISETUJUI", wargaIdx: 1 },
    { jenis: "SURAT_KETERANGAN",  perihal: "Surat Keterangan Tidak Mampu",    status: "DISETUJUI", wargaIdx: 3 },
    { jenis: "SURAT_PENGANTAR",   perihal: "Surat Pengantar Buat KTP",        status: "DIPROSES",  wargaIdx: 4 },
    { jenis: "SURAT_USAHA",       perihal: "Surat Keterangan Usaha Warung",   status: "DISETUJUI", wargaIdx: 5 },
    { jenis: "SURAT_KELAHIRAN",   perihal: "Surat Keterangan Kelahiran Bayi", status: "DISETUJUI", wargaIdx: 6 },
    { jenis: "SURAT_KEMATIAN",    perihal: "Surat Keterangan Kematian",       status: "DISETUJUI", wargaIdx: 7 },
    { jenis: "SURAT_PENGANTAR",   perihal: "Surat Pengantar SKCK",            status: "DIAJUKAN",  wargaIdx: 8 },
    { jenis: "SURAT_PINDAH",      perihal: "Surat Keterangan Pindah Domisili","status": "DIAJUKAN", wargaIdx: 9 },
    { jenis: "SURAT_TIDAK_MAMPU", perihal: "Surat Keterangan Tidak Mampu",   status: "DITOLAK",   wargaIdx: 10 },
    { jenis: "SURAT_DOMISILI",    perihal: "Surat Domisili untuk Beasiswa",   status: "DISETUJUI", wargaIdx: 11 },
    { jenis: "SURAT_KETERANGAN",  perihal: "Surat Keterangan Belum Menikah",  status: "DISETUJUI", wargaIdx: 12 },
    { jenis: "SURAT_PENGANTAR",   perihal: "Surat Pengantar Kartu Keluarga",  status: "DIPROSES",  wargaIdx: 13 },
    { jenis: "SURAT_KETERANGAN",  perihal: "Surat Keterangan Warga",          status: "DISETUJUI", wargaIdx: 14 },
    { jenis: "SURAT_USAHA",       perihal: "Surat Keterangan Usaha Online",   status: "DIAJUKAN",  wargaIdx: 0 },
  ] as const;

  let noSurat = 1;
  for (const s of suratData) {
    const tgl = date(Y, randInt(1, 5), randInt(1, 28));
    await prisma.surat.create({
      data: {
        tenantId: tenant.id,
        wargaId: wargaIds[s.wargaIdx] ?? wargaIds[0],
        nomorSurat: `${Y}/RT003/${noSurat.toString().padStart(3, "0")}`,
        jenisSurat: s.jenis,
        perihal: s.perihal,
        status: s.status,
        tanggalSurat: tgl,
        tanggalDisetujui: s.status === "DISETUJUI" ? new Date(tgl.getTime() + 2 * 86400 * 1000) : undefined,
        disetujuiOleh: s.status === "DISETUJUI" ? "Budi Santoso" : undefined,
      },
    });
    noSurat++;
  }
  console.log(`   ✓ ${suratData.length} surat\n`);

  // ── 9. Iuran Type ─────────────────────────────────────────────────────────
  console.log("💰 Membuat Iuran...");
  const iuranKebersihan = await prisma.iuranType.create({
    data: { tenantId: tenant.id, nama: "Iuran Kebersihan",   jumlah: 50000, periode: "BULANAN", isActive: true },
  });
  const iuranKeamanan = await prisma.iuranType.create({
    data: { tenantId: tenant.id, nama: "Iuran Keamanan",     jumlah: 25000, periode: "BULANAN", isActive: true },
  });
  const iuranRT = await prisma.iuranType.create({
    data: { tenantId: tenant.id, nama: "Iuran RT",           jumlah: 10000, periode: "BULANAN", isActive: true },
  });
  await prisma.iuranType.create({
    data: { tenantId: tenant.id, nama: "Sumbangan Pembangunan", jumlah: 100000, periode: "INSIDENTAL", isActive: true, isJumlahFleksibel: true },
  });

  // Iuran payments — 5 bulan terakhir, per warga kepala keluarga (indeks 0 tiap keluarga)
  const kepalaWargaIdx = [0, 4, 8, 10, 12, 15, 18, 21, 25, 27, 31, 35, 38, 40, 42];
  let iuranCount = 0;

  for (const iuranType of [iuranKebersihan, iuranKeamanan, iuranRT]) {
    for (let bulan = 1; bulan <= 5; bulan++) {
      for (const wIdx of kepalaWargaIdx) {
        const wargaId = wargaIds[wIdx] ?? wargaIds[0];
        const isPaid = Math.random() > 0.15;
        await prisma.iuranPayment.create({
          data: {
            tenantId: tenant.id,
            iuranTypeId: iuranType.id,
            wargaId,
            bulan,
            tahun: Y,
            jumlah: Number(iuranType.jumlah),
            tanggalBayar: isPaid ? date(Y, bulan, randInt(1, 28)) : null,
            metodeBayar: isPaid ? (Math.random() > 0.5 ? "TUNAI" : "TRANSFER") : null,
            pencatat: isPaid ? "Budi Santoso" : null,
          },
        });
        iuranCount++;
      }
    }
  }
  console.log(`   ✓ 4 tipe iuran, ${iuranCount} record pembayaran\n`);

  // ── 10. Kas Transactions (12 bulan) ───────────────────────────────────────
  console.log("🏦 Membuat Kas Transactions...");
  const kasData = [
    // MASUK
    { bulan: 1,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran kebersihan Jan 2026",   jumlah: 750000 },
    { bulan: 1,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran keamanan Jan 2026",     jumlah: 375000 },
    { bulan: 2,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran kebersihan Feb 2026",   jumlah: 700000 },
    { bulan: 2,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran keamanan Feb 2026",     jumlah: 350000 },
    { bulan: 3,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran kebersihan Mar 2026",   jumlah: 750000 },
    { bulan: 3,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran keamanan Mar 2026",     jumlah: 375000 },
    { bulan: 4,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran kebersihan Apr 2026",   jumlah: 650000 },
    { bulan: 4,  jenis: "MASUK", kategori: "Sumbangan",      ket: "Sumbangan Isra Miraj",        jumlah: 1500000 },
    { bulan: 5,  jenis: "MASUK", kategori: "Iuran Bulanan",  ket: "Iuran kebersihan Mei 2026",   jumlah: 750000 },
    { bulan: 5,  jenis: "MASUK", kategori: "Sumbangan",      ket: "Donasi warga untuk masjid",   jumlah: 2000000 },
    // KELUAR
    { bulan: 1,  jenis: "KELUAR", kategori: "Kebersihan",    ket: "Honor petugas kebersihan Jan", jumlah: 500000 },
    { bulan: 1,  jenis: "KELUAR", kategori: "Keamanan",      ket: "Honor petugas ronda Jan",      jumlah: 300000 },
    { bulan: 1,  jenis: "KELUAR", kategori: "Listrik",       ket: "Bayar listrik pos ronda",      jumlah: 75000  },
    { bulan: 2,  jenis: "KELUAR", kategori: "Kebersihan",    ket: "Honor petugas kebersihan Feb", jumlah: 500000 },
    { bulan: 2,  jenis: "KELUAR", kategori: "Keamanan",      ket: "Honor petugas ronda Feb",      jumlah: 300000 },
    { bulan: 2,  jenis: "KELUAR", kategori: "Perbaikan",     ket: "Perbaikan lampu jalan gang 2", jumlah: 250000 },
    { bulan: 3,  jenis: "KELUAR", kategori: "Kebersihan",    ket: "Honor petugas kebersihan Mar", jumlah: 500000 },
    { bulan: 3,  jenis: "KELUAR", kategori: "ATK",           ket: "Beli alat tulis sekretariat",  jumlah: 85000  },
    { bulan: 3,  jenis: "KELUAR", kategori: "Sosial",        ket: "Santunan warga sakit",         jumlah: 300000 },
    { bulan: 4,  jenis: "KELUAR", kategori: "Kebersihan",    ket: "Honor petugas kebersihan Apr", jumlah: 500000 },
    { bulan: 4,  jenis: "KELUAR", kategori: "Keamanan",      ket: "Honor petugas ronda Apr",      jumlah: 300000 },
    { bulan: 4,  jenis: "KELUAR", kategori: "Logistik",      ket: "Pembelian perlengkapan ronda", jumlah: 175000 },
    { bulan: 5,  jenis: "KELUAR", kategori: "Kebersihan",    ket: "Honor petugas kebersihan Mei", jumlah: 500000 },
    { bulan: 5,  jenis: "KELUAR", kategori: "Perbaikan",     ket: "Cat pagar pos keamanan",       jumlah: 350000 },
  ] as const;

  for (const k of kasData) {
    await prisma.kasTransaction.create({
      data: {
        tenantId: tenant.id,
        tanggal: date(Y, k.bulan, randInt(1, 25)),
        jenis: k.jenis,
        kategori: k.kategori,
        keterangan: k.ket,
        jumlah: k.jumlah,
        pencatat: "Budi Santoso",
      },
    });
  }
  console.log(`   ✓ ${kasData.length} transaksi kas\n`);

  // ── 11. Agenda ────────────────────────────────────────────────────────────
  console.log("📅 Membuat Agenda...");
  const agendaData = [
    { judul: "Rapat Bulanan RT",                  mulai: [Y, 1, 15], selesai: [Y, 1, 15], lokasi: "Balai RT 003",            deskripsi: "Pembahasan program kerja bulan Januari dan evaluasi kegiatan." },
    { judul: "Kerja Bakti Bersih Lingkungan",     mulai: [Y, 2, 8],  selesai: [Y, 2, 8],  lokasi: "Seluruh Gang RT 003",    deskripsi: "Gotong royong membersihkan lingkungan sebelum Ramadhan." },
    { judul: "Buka Puasa Bersama Warga",          mulai: [Y, 3, 20], selesai: [Y, 3, 20], lokasi: "Masjid Al-Ikhlas",       deskripsi: "Acara buka puasa bersama seluruh warga RT 003." },
    { judul: "Rapat Evaluasi Triwulan",           mulai: [Y, 4, 10], selesai: [Y, 4, 10], lokasi: "Balai RT 003",           deskripsi: "Evaluasi program kerja triwulan pertama tahun 2026." },
    { judul: "Peringatan Hari Kebangkitan Nasional", mulai: [Y, 5, 20], selesai: [Y, 5, 20], lokasi: "Lapangan RW 012",   deskripsi: "Upacara dan lomba-lomba memperingati Hari Kebangkitan Nasional." },
    { judul: "Posyandu Balita",                   mulai: [Y, 5, 25], selesai: [Y, 5, 25], lokasi: "Rumah Bunda Melati",     deskripsi: "Penimbangan dan imunisasi balita bersama bidan Melati Sari." },
    { judul: "Rapat Persiapan HUT RI ke-81",      mulai: [Y, 7, 1],  selesai: [Y, 7, 1],  lokasi: "Balai RT 003",           deskripsi: "Rapat persiapan rangkaian kegiatan HUT Kemerdekaan RI." },
    { judul: "Lomba HUT RI ke-81",                mulai: [Y, 8, 17], selesai: [Y, 8, 17], lokasi: "Lapangan RT 003",        deskripsi: "Berbagai lomba seru: makan kerupuk, balap karung, tarik tambang!" },
    { judul: "Arisan Rutin RT",                   mulai: [Y, 6, 5],  selesai: [Y, 6, 5],  lokasi: "Bergilir antar rumah",   deskripsi: "Arisan bulanan warga RT 003. Tuan rumah: Keluarga Faisal Rahman." },
  ] as const;

  for (const a of agendaData) {
    await prisma.agenda.create({
      data: {
        tenantId: tenant.id,
        judul: a.judul,
        deskripsi: a.deskripsi,
        tanggalMulai: date(...(a.mulai as [number, number, number])),
        tanggalSelesai: date(...(a.selesai as [number, number, number])),
        lokasi: a.lokasi,
        isPublished: true,
      },
    });
  }
  console.log(`   ✓ ${agendaData.length} agenda\n`);

  // ── 12. Berita ────────────────────────────────────────────────────────────
  console.log("📰 Membuat Berita...");
  const beritaData = [
    {
      judul: "Jadwal Ronda Bulan Mei 2026 Telah Ditetapkan",
      slug: "jadwal-ronda-mei-2026",
      konten: "Pengurus RT 003 telah menetapkan jadwal ronda (siskamling) untuk bulan Mei 2026. Setiap KK diharapkan turut berpartisipasi sesuai jadwal yang telah ditentukan. Jadwal lengkap dapat dilihat di papan pengumuman RT atau menghubungi Ketua RT.",
      ringkasan: "Jadwal ronda bulan Mei sudah keluar. Seluruh warga dimohon untuk mengikuti sesuai jadwal.",
      kategori: "Keamanan",
      penulis: "Budi Santoso",
      tgl: [Y, 5, 1] as [number, number, number],
    },
    {
      judul: "Program Kerja Bakti Dilaksanakan Setiap Minggu Pertama",
      slug: "kerja-bakti-rutin",
      konten: "Mulai bulan Mei 2026, RT 003 akan mengadakan kerja bakti rutin setiap minggu pertama di bulan berjalan. Kegiatan ini bertujuan untuk menjaga kebersihan dan keindahan lingkungan. Semua warga diharapkan hadir dan berpartisipasi aktif.",
      ringkasan: "Kerja bakti rutin setiap minggu pertama bulan berjalan.",
      kategori: "Lingkungan",
      penulis: "Budi Santoso",
      tgl: [Y, 4, 28] as [number, number, number],
    },
    {
      judul: "Posyandu Balita Buka Setiap Tanggal 25",
      slug: "posyandu-balita-rutin",
      konten: "Posyandu balita RT 003 akan buka setiap tanggal 25. Layanan meliputi penimbangan berat badan, pengukuran tinggi, pemberian vitamin, dan imunisasi. Dipandu oleh Bidan Melati Sari. Gratis untuk seluruh balita warga RT 003.",
      ringkasan: "Posyandu balita buka tanggal 25 tiap bulan. Gratis untuk warga RT 003.",
      kategori: "Kesehatan",
      penulis: "Melati Sari",
      tgl: [Y, 4, 20] as [number, number, number],
    },
    {
      judul: "Selamat! Warga RT 003 Raih Juara 1 Lomba Kebersihan RW",
      slug: "juara-lomba-kebersihan-rw",
      konten: "Alhamdulillah, RT 003 berhasil meraih juara 1 dalam lomba kebersihan lingkungan tingkat RW 012. Penghargaan ini merupakan hasil kerja keras seluruh warga dalam menjaga kebersihan. Mari kita pertahankan prestasi ini!",
      ringkasan: "RT 003 juara 1 lomba kebersihan tingkat RW 012.",
      kategori: "Prestasi",
      penulis: "Budi Santoso",
      tgl: [Y, 3, 15] as [number, number, number],
    },
    {
      judul: "Pengumuman: Pembayaran Iuran Bulan Mei 2026",
      slug: "iuran-mei-2026",
      konten: "Mengingatkan seluruh warga RT 003 untuk segera melunasi iuran bulan Mei 2026 paling lambat tanggal 25 Mei. Iuran kebersihan Rp 50.000, iuran keamanan Rp 25.000, dan iuran RT Rp 10.000. Pembayaran dapat dilakukan tunai ke Bendahara atau via transfer.",
      ringkasan: "Segera lunasi iuran bulan Mei 2026 sebelum tanggal 25.",
      kategori: "Keuangan",
      penulis: "Ahmad Hidayat",
      tgl: [Y, 5, 3] as [number, number, number],
    },
  ];

  for (const b of beritaData) {
    await prisma.berita.create({
      data: {
        tenantId: tenant.id,
        judul: b.judul,
        slug: b.slug,
        konten: b.konten,
        ringkasan: b.ringkasan,
        kategori: b.kategori,
        penulis: b.penulis,
        isPublished: true,
        publishedAt: date(...b.tgl),
      },
    });
  }
  console.log(`   ✓ ${beritaData.length} berita\n`);

  // ── 13. Bansos ────────────────────────────────────────────────────────────
  console.log("🤝 Membuat Bansos...");
  const bansos1 = await prisma.bansos.create({
    data: {
      tenantId: tenant.id,
      nama: "Bantuan Sosial PKH",
      sumber: "Kemensos RI",
      deskripsi: "Program Keluarga Harapan untuk keluarga kurang mampu",
      tanggalMulai: date(Y, 1, 1),
      status: "AKTIF",
    },
  });

  const bansos2 = await prisma.bansos.create({
    data: {
      tenantId: tenant.id,
      nama: "Sembako Lebaran RT",
      sumber: "Kas RT 003",
      deskripsi: "Pembagian sembako menjelang Hari Raya Idul Fitri untuk warga kurang mampu",
      tanggalMulai: date(Y, 3, 15),
      tanggalSelesai: date(Y, 3, 30),
      status: "SELESAI",
    },
  });

  // Recipients for PKH
  const pkhRecipients = [3, 7, 13, 19, 25]; // warga indices
  for (const wIdx of pkhRecipients) {
    const wId = wargaIds[wIdx] ?? wargaIds[0];
    await prisma.bansosRecipient.create({
      data: {
        tenantId: tenant.id,
        bansosId: bansos1.id,
        wargaId: wId,
        jumlah: "Rp 300.000/bulan",
        tanggalTerima: date(Y, 1, 15),
      },
    });
  }

  // Recipients for Sembako
  const sembakoRecipients = [3, 7, 10, 13, 17, 19, 22, 25];
  for (const wIdx of sembakoRecipients) {
    const wId = wargaIds[wIdx] ?? wargaIds[0];
    await prisma.bansosRecipient.create({
      data: {
        tenantId: tenant.id,
        bansosId: bansos2.id,
        wargaId: wId,
        jumlah: "1 paket sembako",
        tanggalTerima: date(Y, 3, 28),
        catatan: "Sudah diterima",
      },
    });
  }
  console.log(`   ✓ 2 program bansos, ${pkhRecipients.length + sembakoRecipients.length} penerima\n`);

  // ── 14. Siskamling ────────────────────────────────────────────────────────
  console.log("🔒 Membuat Siskamling...");
  const siskamData = [
    { tgl: [Y, 5, 1],  shift: "Malam", petugas: ["Ahmad Hidayat", "Bambang Purnomo"] },
    { tgl: [Y, 5, 2],  shift: "Malam", petugas: ["Candra Wijaya", "Dedi Supriadi"] },
    { tgl: [Y, 5, 3],  shift: "Malam", petugas: ["Eko Prasetyo", "Faisal Rahman"] },
    { tgl: [Y, 5, 4],  shift: "Malam", petugas: ["Gunawan Setiawan", "Heri Susanto"] },
    { tgl: [Y, 5, 5],  shift: "Malam", petugas: ["Irfan Hakim", "Joko Prasetyo"] },
    { tgl: [Y, 5, 6],  shift: "Malam", petugas: ["Kurniawan Adi", "Lukman Hakim"] },
    { tgl: [Y, 5, 7],  shift: "Malam", petugas: ["Muhammad Rizal", "Nugroho Susilo"] },
    { tgl: [Y, 5, 8],  shift: "Malam", petugas: ["Omar Bakri", "Ahmad Hidayat"] },
    { tgl: [Y, 5, 9],  shift: "Malam", petugas: ["Bambang Purnomo", "Candra Wijaya"], kejadian: "Ditemukan motor asing parkir tanpa izin. Sudah dikonfirmasi ke tamu." },
    { tgl: [Y, 5, 10], shift: "Malam", petugas: ["Dedi Supriadi", "Eko Prasetyo"] },
  ] as const;

  for (const s of siskamData) {
    await prisma.siskamling.create({
      data: {
        tenantId: tenant.id,
        tanggal: date(...s.tgl),
        shift: s.shift,
        petugas: [...s.petugas],
        lokasi: "Pos Keamanan RT 003",
        kejadian: "kejadian" in s ? s.kejadian : undefined,
        catatan: "Situasi kondusif",
      },
    });
  }
  console.log(`   ✓ ${siskamData.length} jadwal siskamling\n`);

  // ── 15. Keluhan ───────────────────────────────────────────────────────────
  console.log("📢 Membuat Keluhan...");
  const keluhanData = [
    { pengirim: "Ahmad Hidayat",   kategori: "Infrastruktur", judul: "Lampu Jalan Gang 3 Mati",           isi: "Lampu jalan di gang 3 sudah mati sejak 2 minggu lalu. Mohon segera diperbaiki karena gelap dan rawan kejahatan.", status: "SELESAI", tanggapan: "Lampu sudah diganti oleh petugas pada 3 Mei 2026.", urgent: false, wargaIdx: 0 },
    { pengirim: "Bambang Purnomo", kategori: "Kebersihan",    judul: "Sampah Menumpuk di TPS",            isi: "Sampah di TPS RT sudah menumpuk dan belum diangkut selama 3 hari. Baunya mulai mengganggu.", status: "DIPROSES", tanggapan: "Sudah dikonfirmasi ke petugas kebersihan.", urgent: false, wargaIdx: 4 },
    { pengirim: "Candra Wijaya",   kategori: "Keamanan",      judul: "Ada Orang Tidak Dikenal Mondar-Mandir", isi: "Beberapa hari ini ada orang tidak dikenal yang sering mondar-mandir di depan rumah warga. Mohon ditingkatkan patroli.", status: "DIPROSES", tanggapan: "Tim keamanan sudah diinformasikan.", urgent: true, wargaIdx: 8 },
    { pengirim: "Dedi Supriadi",   kategori: "Sosial",        judul: "Keributan di Malam Hari",            isi: "Ada tetangga yang sering membuat keributan di atas jam 22.00 WIB. Sudah mengganggu istirahat.", status: "SELESAI", tanggapan: "Sudah dilakukan mediasi. Permasalahan selesai.", urgent: false, wargaIdx: 10 },
    { pengirim: "Eko Prasetyo",    kategori: "Infrastruktur", judul: "Selokan Tersumbat",                  isi: "Selokan di depan blok B tersumbat dan air meluap saat hujan. Khawatir menyebabkan banjir.", status: "BARU", tanggapan: undefined, urgent: false, wargaIdx: 12 },
    { pengirim: "Faisal Rahman",   kategori: "Administrasi",  judul: "Data KK Tidak Sesuai",               isi: "Data Kartu Keluarga saya di sistem RT berbeda dengan yang seharusnya. Mohon dikoreksi.", status: "DIPROSES", tanggapan: "Sedang diproses pembaruan data.", urgent: false, wargaIdx: 15 },
    { pengirim: "Heri Susanto",    kategori: "Keamanan",      judul: "Kendaraan Parkir Sembarangan",       isi: "Banyak motor yang parkir di badan jalan sehingga menghambat lalu lintas warga.", status: "BARU", tanggapan: undefined, urgent: false, wargaIdx: 21 },
    { pengirim: "Irfan Hakim",     kategori: "Infrastruktur", judul: "Perbaikan Jalan Berlubang",          isi: "Jalan utama gang 1 banyak yang berlubang dan rusak. Sudah berbahaya untuk kendaraan.", status: "BARU", tanggapan: undefined, urgent: true, wargaIdx: 25 },
  ] as const;

  for (const k of keluhanData) {
    const tgl = date(Y, randInt(3, 5), randInt(1, 28));
    await prisma.keluhan.create({
      data: {
        tenantId: tenant.id,
        wargaId: wargaIds[k.wargaIdx] ?? wargaIds[0],
        pengirim: k.pengirim,
        kategori: k.kategori,
        judul: k.judul,
        isi: k.isi,
        isUrgent: k.urgent,
        status: k.status,
        tanggapan: k.tanggapan ?? undefined,
        tanggalTanggap: k.tanggapan ? new Date(tgl.getTime() + 2 * 86400000) : undefined,
        createdAt: tgl,
      },
    });
  }
  console.log(`   ✓ ${keluhanData.length} keluhan\n`);

  // ── 16. Pengajuan ─────────────────────────────────────────────────────────
  console.log("📋 Membuat Pengajuan...");
  const pengajuanData = [
    { pengirim: "Ahmad Hidayat",   kategori: "Pembangunan", judul: "Pengajuan Perbaikan Pos Keamanan",  isi: "Pos keamanan RT 003 sudah mulai lapuk dan atapnya bocor. Mengajukan perbaikan sebelum musim hujan.", status: "DISETUJUI", wargaIdx: 0 },
    { pengirim: "Bambang Purnomo", kategori: "Sarana",      judul: "Pengadaan Sound System RT",         isi: "Mengajukan pengadaan sound system portable untuk kegiatan RT seperti rapat dan lomba-lomba.", status: "DIPROSES", wargaIdx: 4 },
    { pengirim: "Candra Wijaya",   kategori: "Lingkungan",  judul: "Tanam Pohon Penghijauan",           isi: "Mengajukan program tanam pohon di sepanjang gang RT untuk penghijauan dan keteduhan lingkungan.", status: "MENUNGGU", wargaIdx: 8 },
    { pengirim: "Eko Prasetyo",    kategori: "Kesehatan",   judul: "Pengadaan Kotak P3K Pos Ronda",     isi: "Mengajukan pengadaan kotak P3K lengkap untuk ditempatkan di pos ronda.", status: "DISETUJUI", wargaIdx: 12 },
    { pengirim: "Faisal Rahman",   kategori: "Pendidikan",  judul: "Beasiswa Anak Warga Kurang Mampu",  isi: "Mengajukan program beasiswa untuk anak-anak warga yang kurang mampu agar dapat melanjutkan pendidikan.", status: "MENUNGGU", wargaIdx: 15 },
  ] as const;

  for (const p of pengajuanData) {
    const tgl = date(Y, randInt(2, 5), randInt(1, 28));
    await prisma.pengajuan.create({
      data: {
        tenantId: tenant.id,
        wargaId: wargaIds[p.wargaIdx] ?? wargaIds[0],
        pengirim: p.pengirim,
        kategori: p.kategori,
        judul: p.judul,
        isi: p.isi,
        status: p.status,
        tanggapan: p.status === "DISETUJUI" ? "Pengajuan disetujui. Akan dijadwalkan dalam program kerja bulan depan." : p.status === "DIPROSES" ? "Sedang dikaji oleh pengurus RT." : undefined,
        tanggalTanggap: p.status !== "MENUNGGU" ? new Date(tgl.getTime() + 5 * 86400000) : undefined,
        createdAt: tgl,
      },
    });
  }
  console.log(`   ✓ ${pengajuanData.length} pengajuan\n`);

  // ── 17. Inventaris ────────────────────────────────────────────────────────
  console.log("📦 Membuat Inventaris...");
  const inventarisData = [
    { nama: "Kursi Plastik",          kategori: "Perabot",      jumlah: 50,  kondisi: "Baik",       lokasi: "Gudang RT", perolehan: [2023, 1, 1], nilai: 150000 },
    { nama: "Meja Lipat",             kategori: "Perabot",      jumlah: 8,   kondisi: "Baik",       lokasi: "Gudang RT", perolehan: [2023, 1, 1], nilai: 250000 },
    { nama: "Sound System Portable",  kategori: "Elektronik",   jumlah: 1,   kondisi: "Baik",       lokasi: "Sekretariat RT", perolehan: [2024, 6, 1], nilai: 1500000 },
    { nama: "Mikrofon Wireless",      kategori: "Elektronik",   jumlah: 2,   kondisi: "Baik",       lokasi: "Sekretariat RT", perolehan: [2024, 6, 1], nilai: 350000 },
    { nama: "Proyektor",              kategori: "Elektronik",   jumlah: 1,   kondisi: "Baik",       lokasi: "Sekretariat RT", perolehan: [2024, 9, 1], nilai: 3500000 },
    { nama: "Tenda 3x6 meter",        kategori: "Peralatan",    jumlah: 3,   kondisi: "Baik",       lokasi: "Gudang RT", perolehan: [2022, 7, 1], nilai: 800000 },
    { nama: "Genset 1000 Watt",       kategori: "Elektronik",   jumlah: 1,   kondisi: "Perlu Servis", lokasi: "Gudang RT", perolehan: [2020, 1, 1], nilai: 4000000 },
    { nama: "Alat Kebersihan (set)",  kategori: "Kebersihan",   jumlah: 5,   kondisi: "Baik",       lokasi: "Pos Ronda", perolehan: [2025, 1, 1], nilai: 200000 },
    { nama: "Kotak P3K",              kategori: "Kesehatan",    jumlah: 2,   kondisi: "Baik",       lokasi: "Pos Ronda", perolehan: [2025, 3, 1], nilai: 350000 },
    { nama: "Papan Pengumuman",       kategori: "Administrasi", jumlah: 3,   kondisi: "Baik",       lokasi: "Gang RT 003", perolehan: [2023, 5, 1], nilai: 200000 },
    { nama: "Laptop Sekretariat",     kategori: "Elektronik",   jumlah: 1,   kondisi: "Baik",       lokasi: "Sekretariat RT", perolehan: [2024, 1, 1], nilai: 7500000 },
    { nama: "Printer",                kategori: "Elektronik",   jumlah: 1,   kondisi: "Baik",       lokasi: "Sekretariat RT", perolehan: [2024, 1, 1], nilai: 1200000 },
  ] as const;

  for (const inv of inventarisData) {
    await prisma.inventaris.create({
      data: {
        tenantId: tenant.id,
        namaBarang: inv.nama,
        kategori: inv.kategori,
        jumlah: inv.jumlah,
        kondisi: inv.kondisi,
        lokasi: inv.lokasi,
        tanggalPerolehan: date(...inv.perolehan),
        nilaiPerolehan: inv.nilai,
      },
    });
  }
  console.log(`   ✓ ${inventarisData.length} inventaris\n`);

  // ── 18. Organisasi ────────────────────────────────────────────────────────
  console.log("🏛  Membuat Organisasi...");
  const organisasiData = [
    { nama: "Budi Santoso",      jabatan: "Ketua RT",         urutan: 1, hp: "081234567890" },
    { nama: "H. Mahmud Harun",   jabatan: "Ketua RW",         urutan: 2, hp: "081234567891" },
    { nama: "Ahmad Hidayat",     jabatan: "Bendahara",        urutan: 3, hp: "081234567892" },
    { nama: "Bambang Purnomo",   jabatan: "Sekretaris",       urutan: 4, hp: "082345678901" },
    { nama: "Candra Wijaya",     jabatan: "Sie. Kebersihan",  urutan: 5, hp: "083456789012" },
    { nama: "Dedi Supriadi",     jabatan: "Sie. Keamanan",    urutan: 6, hp: "084567890123" },
    { nama: "Eko Prasetyo",      jabatan: "Sie. Kesehatan",   urutan: 7, hp: "085678901234" },
    { nama: "Faisal Rahman",     jabatan: "Sie. Pembangunan", urutan: 8, hp: "086789012345" },
    { nama: "Heri Susanto",      jabatan: "Koordinator Ronda",urutan: 9, hp: "087890123456" },
  ];

  for (const o of organisasiData) {
    await prisma.organisasi.create({
      data: {
        tenantId: tenant.id,
        nama: o.nama,
        jabatan: o.jabatan,
        urutan: o.urutan,
        nomorHP: o.hp,
        periode: "2025-2028",
        isActive: true,
      },
    });
  }
  console.log(`   ✓ ${organisasiData.length} anggota organisasi\n`);

  // ── 19. Usaha Warga + Product ─────────────────────────────────────────────
  console.log("🛒 Membuat Usaha Warga...");
  const usaha1 = await prisma.usahaWarga.create({
    data: {
      tenantId: tenant.id,
      namaUsaha: "Warung Bu Eka",
      pemilik: "Eka Putri",
      jenis: "Warung Sembako",
      alamat: "Blok A No. 003, RT 003",
      nomorHP: "081234567893",
      deskripsi: "Warung sembako lengkap, buka setiap hari 06.00-21.00",
      isActive: true,
      isMarketplace: true,
    },
  });

  await prisma.product.createMany({
    data: [
      { usahaWargaId: usaha1.id, nama: "Beras Premium 5kg",   harga: 85000, kategori: "Sembako", stok: 50, isAvailable: true },
      { usahaWargaId: usaha1.id, nama: "Minyak Goreng 2L",    harga: 38000, kategori: "Sembako", stok: 30, isAvailable: true },
      { usahaWargaId: usaha1.id, nama: "Gula Pasir 1kg",      harga: 17500, kategori: "Sembako", stok: 40, isAvailable: true },
      { usahaWargaId: usaha1.id, nama: "Telur Ayam 1 kg",     harga: 28000, kategori: "Sembako", stok: 20, isAvailable: true },
      { usahaWargaId: usaha1.id, nama: "Indomie (dus)",       harga: 130000, kategori: "Sembako", stok: 10, isAvailable: true },
    ],
  });

  const usaha2 = await prisma.usahaWarga.create({
    data: {
      tenantId: tenant.id,
      namaUsaha: "Laundry Kiloan Bu Juwita",
      pemilik: "Juwita Sari",
      jenis: "Laundry",
      alamat: "Blok A No. 005, RT 003",
      nomorHP: "081234567894",
      deskripsi: "Laundry kiloan dan satuan. Antar jemput. Buka 08.00-18.00",
      isActive: true,
      isMarketplace: true,
    },
  });

  await prisma.product.createMany({
    data: [
      { usahaWargaId: usaha2.id, nama: "Cuci Kiloan (per kg)",  harga: 8000,  kategori: "Laundry", isAvailable: true },
      { usahaWargaId: usaha2.id, nama: "Cuci Setrika Kiloan",   harga: 12000, kategori: "Laundry", isAvailable: true },
      { usahaWargaId: usaha2.id, nama: "Cuci Satuan Jaket",     harga: 25000, kategori: "Laundry", isAvailable: true },
      { usahaWargaId: usaha2.id, nama: "Cuci Satuan Selimut",   harga: 30000, kategori: "Laundry", isAvailable: true },
    ],
  });

  const usaha3 = await prisma.usahaWarga.create({
    data: {
      tenantId: tenant.id,
      namaUsaha: "Bengkel Motor Pak Heri",
      pemilik: "Heri Susanto",
      jenis: "Bengkel Motor",
      alamat: "Blok B No. 008, RT 003",
      nomorHP: "081234567895",
      deskripsi: "Servis motor segala merek. Berpengalaman 10 tahun. Harga terjangkau.",
      isActive: true,
      isMarketplace: false,
    },
  });

  await prisma.product.createMany({
    data: [
      { usahaWargaId: usaha3.id, nama: "Servis Ringan",     harga: 50000,  kategori: "Servis", isAvailable: true },
      { usahaWargaId: usaha3.id, nama: "Servis Besar",      harga: 150000, kategori: "Servis", isAvailable: true },
      { usahaWargaId: usaha3.id, nama: "Ganti Oli",         harga: 75000,  kategori: "Servis", isAvailable: true },
      { usahaWargaId: usaha3.id, nama: "Tambal Ban",        harga: 20000,  kategori: "Servis", isAvailable: true },
    ],
  });

  console.log("   ✓ 3 usaha warga dengan 13 produk\n");

  // ── 20. PPOB Orders ───────────────────────────────────────────────────────
  console.log("⚡ Membuat PPOB Orders...");
  const ppobData = [
    { pemohon: "Ahmad Hidayat",   jenis: "PLN",           nomor: "535201234567",   jumlah: 100000, status: "BERHASIL", wargaIdx: 0 },
    { pemohon: "Bambang Purnomo", jenis: "PDAM",          nomor: "12345678",       jumlah: 75000,  status: "BERHASIL", wargaIdx: 4 },
    { pemohon: "Candra Wijaya",   jenis: "PULSA",         nomor: "081234567803",   jumlah: 50000,  status: "BERHASIL", wargaIdx: 8 },
    { pemohon: "Dedi Supriadi",   jenis: "BPJS_KESEHATAN",nomor: "0001234567890",  jumlah: 150000, status: "BERHASIL", wargaIdx: 10 },
    { pemohon: "Eko Prasetyo",    jenis: "INTERNET",      nomor: "02177889900",    jumlah: 300000, status: "DIPROSES", wargaIdx: 12 },
    { pemohon: "Faisal Rahman",   jenis: "PLN",           nomor: "535200987654",   jumlah: 200000, status: "MENUNGGU", wargaIdx: 15 },
    { pemohon: "Heri Susanto",    jenis: "PULSA",         nomor: "087890123456",   jumlah: 25000,  status: "BERHASIL", wargaIdx: 21 },
  ] as const;

  const ppobFee: Record<string, number> = { PLN: 2500, PDAM: 2500, PULSA: 1500, BPJS_KESEHATAN: 2000, INTERNET: 2500 };

  for (const p of ppobData) {
    const fee = ppobFee[p.jenis] ?? 1500;
    await prisma.pPOBOrder.create({
      data: {
        tenantId: tenant.id,
        wargaId: wargaIds[p.wargaIdx] ?? wargaIds[0],
        pemohon: p.pemohon,
        jenis: p.jenis,
        nomorTujuan: p.nomor,
        jumlah: p.jumlah,
        adminFee: fee,
        total: p.jumlah + fee,
        status: p.status,
        createdAt: date(Y, randInt(3, 5), randInt(1, 28)),
      },
    });
  }
  console.log(`   ✓ ${ppobData.length} order PPOB\n`);

  // ── 21. Pembangunan ───────────────────────────────────────────────────────
  console.log("🔨 Membuat Program Pembangunan...");
  const pembangunanData = [
    { judul: "Perbaikan Pos Keamanan",          pengusul: "Ahmad Hidayat", estimasi: 5000000,  lokasi: "Gang Utama RT 003",  status: "DALAM_PROSES" },
    { judul: "Pengecatan Tembok Gang",           pengusul: "Budi Santoso",  estimasi: 3000000,  lokasi: "Gang 1-3 RT 003",    status: "DISETUJUI" },
    { judul: "Penambahan Lampu Jalan Solar",     pengusul: "Candra Wijaya", estimasi: 8000000,  lokasi: "Semua Gang RT 003",  status: "DIUSULKAN" },
    { judul: "Pembuatan Taman Kecil",            pengusul: "Bambang Purnomo", estimasi: 2500000, lokasi: "Area Depan Balai RT", status: "DISETUJUI" },
    { judul: "Renovasi Balai Pertemuan RT",      pengusul: "Budi Santoso",  estimasi: 15000000, lokasi: "Balai RT 003",       status: "DIUSULKAN" },
  ] as const;

  for (const p of pembangunanData) {
    await prisma.pembangunan.create({
      data: {
        tenantId: tenant.id,
        judul: p.judul,
        pengusul: p.pengusul,
        estimasiBiaya: p.estimasi,
        lokasi: p.lokasi,
        status: p.status,
        deskripsi: `Program ${p.judul} diusulkan untuk meningkatkan kualitas lingkungan RT 003.`,
      },
    });
  }
  console.log(`   ✓ ${pembangunanData.length} program pembangunan\n`);

  // ── 22. Pos Security Log ──────────────────────────────────────────────────
  console.log("🛡  Membuat Pos Security Log...");
  for (let i = 1; i <= 10; i++) {
    await prisma.posSecurityLog.create({
      data: {
        tenantId: tenant.id,
        tanggal: date(Y, 5, i),
        petugas: rand(["Ahmad Hidayat", "Bambang Purnomo", "Dedi Supriadi", "Heri Susanto", "Gunawan Setiawan"]),
        shift: rand(["Pagi (06-14)", "Siang (14-22)", "Malam (22-06)"]),
        tamuMasuk: randInt(2, 15),
        tamuKeluar: randInt(2, 15),
        kendaraanMasuk: randInt(5, 30),
        kendaraanKeluar: randInt(5, 30),
        kejadian: i === 4 ? "Motor asing terparkir tanpa izin, sudah dikonfirmasi pemilik." : undefined,
        catatan: "Situasi aman dan kondusif.",
      },
    });
  }
  console.log("   ✓ 10 log keamanan\n");

  // ── 23. Tata Tertib ───────────────────────────────────────────────────────
  console.log("📜 Membuat Tata Tertib...");
  const tataTertibData = [
    { judul: "Jam Ketenangan",             isi: "Kegiatan yang menimbulkan suara keras (musik, pesta) dilarang setelah pukul 22.00 WIB dan sebelum pukul 06.00 WIB.", urutan: 1 },
    { judul: "Kebersihan Lingkungan",      isi: "Setiap warga wajib menjaga kebersihan di depan rumah masing-masing dan tidak membuang sampah sembarangan.", urutan: 2 },
    { judul: "Parkir Kendaraan",           isi: "Kendaraan wajib diparkir di area yang telah ditentukan. Dilarang parkir di badan jalan yang menghambat lalu lintas.", urutan: 3 },
    { judul: "Laporan Tamu Menginap",      isi: "Tamu yang menginap lebih dari 1x24 jam wajib dilaporkan kepada pengurus RT selambat-lambatnya 24 jam setelah kedatangan.", urutan: 4 },
    { judul: "Partisipasi Siskamling",     isi: "Setiap Kepala Keluarga wajib ikut serta dalam jadwal ronda/siskamling sesuai giliran yang telah ditetapkan.", urutan: 5 },
    { judul: "Gotong Royong",              isi: "Setiap warga wajib berpartisipasi dalam kegiatan gotong royong yang dijadwalkan oleh pengurus RT minimal sekali sebulan.", urutan: 6 },
    { judul: "Pembayaran Iuran",           isi: "Iuran RT wajib dibayarkan selambat-lambatnya tanggal 25 setiap bulan. Keterlambatan lebih dari 3 bulan dapat dikenakan teguran.", urutan: 7 },
    { judul: "Larangan Aktivitas Ilegal",  isi: "Setiap warga dilarang keras melakukan aktivitas ilegal seperti perjudian, narkoba, dan kegiatan yang melanggar hukum.", urutan: 8 },
    { judul: "Penanganan Perselisihan",    isi: "Perselisihan antar warga diselesaikan secara musyawarah. Jika tidak tercapai kesepakatan, dapat meminta mediasi pengurus RT.", urutan: 9 },
    { judul: "Perubahan Tata Tertib",      isi: "Perubahan tata tertib ini hanya dapat dilakukan melalui rapat warga yang dihadiri minimal 2/3 dari seluruh KK yang terdaftar.", urutan: 10 },
  ];

  for (const t of tataTertibData) {
    await prisma.tataTertib.create({
      data: { tenantId: tenant.id, judul: t.judul, isi: t.isi, urutan: t.urutan, isActive: true },
    });
  }
  console.log(`   ✓ ${tataTertibData.length} tata tertib\n`);

  // ── 24. Program Kerja ─────────────────────────────────────────────────────
  console.log("📋 Membuat Program Kerja...");
  const programKerjaData = [
    { judul: "Revitalisasi Pos Keamanan",          deskripsi: "Perbaikan dan renovasi pos keamanan RT 003",                  tahun: Y, status: "DALAM_PROSES" },
    { judul: "Digitalisasi Administrasi RT",        deskripsi: "Penggunaan sistem digital untuk administrasi dan pelayanan",   tahun: Y, status: "SELESAI" },
    { judul: "Pemberdayaan UMKM Warga",             deskripsi: "Program pelatihan dan pendampingan usaha kecil warga RT",      tahun: Y, status: "RENCANA" },
    { judul: "Penghijauan Lingkungan",              deskripsi: "Program tanam pohon dan perawatan taman di lingkungan RT",     tahun: Y, status: "RENCANA" },
    { judul: "Posyandu Rutin Bulanan",              deskripsi: "Pelayanan kesehatan balita dan ibu hamil setiap bulan",        tahun: Y, status: "BERJALAN" },
    { judul: "Kerja Bakti Bulanan",                 deskripsi: "Gotong royong rutin setiap minggu pertama tiap bulan",         tahun: Y, status: "BERJALAN" },
    { judul: "Pelatihan Keterampilan Warga",        deskripsi: "Pelatihan menjahit, memasak, dan keterampilan lain untuk warga", tahun: Y, status: "RENCANA" },
    { judul: "Lomba HUT RI ke-81",                  deskripsi: "Persiapan dan pelaksanaan lomba 17 Agustusan",                 tahun: Y, status: "RENCANA" },
  ] as const;

  for (const p of programKerjaData) {
    await prisma.programKerja.create({
      data: { tenantId: tenant.id, judul: p.judul, deskripsi: p.deskripsi, tahun: p.tahun, status: p.status },
    });
  }
  console.log(`   ✓ ${programKerjaData.length} program kerja\n`);

  // ── 25. Vaksinasi Data ────────────────────────────────────────────────────
  console.log("💉 Membuat Data Vaksinasi...");
  const vaksinWarga = wargaIds.slice(0, 20);
  const vaksinTypes = ["Sinovac", "AstraZeneca", "Moderna", "Pfizer"];
  for (let i = 0; i < vaksinWarga.length; i++) {
    const doses = i < 15 ? 3 : i < 18 ? 2 : 1;
    for (let d = 1; d <= doses; d++) {
      await prisma.vaksinasiData.create({
        data: {
          tenantId: tenant.id,
          wargaId: vaksinWarga[i],
          dosis: d,
          jenisVaksin: vaksinTypes[i % vaksinTypes.length],
          tanggal: date(2021 + Math.floor((d - 1) / 2), randInt(1, 12), randInt(1, 28)),
          lokasi: rand(["Puskesmas Pancoran Mas", "RSIA Depok", "Balai Desa", "Klinik Sehat"]),
        },
      });
    }
  }
  console.log(`   ✓ Vaksinasi untuk ${vaksinWarga.length} warga\n`);

  // ─────────────────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ SEEDING BERHASIL!");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n📋 Ringkasan data yang dibuat:");
  console.log("  • 1  Tenant  : RT 003 / RW 012 Kel. Pancoran Mas");
  console.log("  • 4  User    : superadmin, admin RT, admin RW, warga");
  console.log("  • 20 Rumah");
  console.log(`  • ${keluargaDef.length} Keluarga (KK)`);
  console.log(`  • ${wargaIds.length} Warga`);
  console.log(`  • ${kendaraanData.length} Kendaraan`);
  console.log(`  • ${tamuData.length} Tamu`);
  console.log(`  • ${suratData.length} Surat`);
  console.log(`  • 4  Tipe Iuran + ${iuranCount} record pembayaran`);
  console.log(`  • ${kasData.length} Transaksi Kas`);
  console.log(`  • ${agendaData.length} Agenda`);
  console.log(`  • ${beritaData.length} Berita`);
  console.log("  • 2  Bansos program");
  console.log(`  • ${siskamData.length} Jadwal Siskamling`);
  console.log(`  • ${keluhanData.length} Keluhan`);
  console.log(`  • ${pengajuanData.length} Pengajuan`);
  console.log(`  • ${inventarisData.length} Inventaris`);
  console.log(`  • ${organisasiData.length} Anggota Organisasi`);
  console.log("  • 3  Usaha Warga + 13 Produk");
  console.log(`  • ${ppobData.length} PPOB Order`);
  console.log(`  • ${pembangunanData.length} Program Pembangunan`);
  console.log("  • 10 Log Keamanan");
  console.log(`  • ${tataTertibData.length} Tata Tertib`);
  console.log(`  • ${programKerjaData.length} Program Kerja`);
  console.log(`  • Vaksinasi untuk ${vaksinWarga.length} warga`);
  console.log("\n🔑 Login demo (password: password123):");
  console.log("  superadmin@rt-online.id  → SUPER_ADMIN (semua tenant)");
  console.log("  admin@rt-online.id       → RT_ADMIN    (kelola RT)");
  console.log("  rw@rt-online.id          → RW_ADMIN    (kelola RW)");
  console.log("  warga@rt-online.id       → RESIDENT    (Ahmad Hidayat)");
  console.log("\n🌐 URL: http://localhost:3000");
  console.log("═══════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
