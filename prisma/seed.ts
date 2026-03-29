import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.iuranPayment.deleteMany();
  await prisma.iuranType.deleteMany();
  await prisma.kasTransaction.deleteMany();
  await prisma.warga.deleteMany();
  await prisma.keluarga.deleteMany();
  await prisma.rumah.deleteMany();
  await prisma.tamu.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const hashedPassword = await hash("password123", 12);

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "RT 003 RW 012 Kel. Pancoran Mas",
      slug: "rt003-rw012-pancoran-mas",
      rtNumber: "003",
      rwNumber: "012",
      kelurahan: "Pancoran Mas",
      kecamatan: "Pancoran Mas",
      kota: "Depok",
      provinsi: "Jawa Barat",
      subscription: {
        create: {
          tier: "TIER_B",
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // ==================== CREATE USERS (4 ROLES) ====================

  // 1. SUPER_ADMIN - Admin Server (Back Office / Developer)
  await prisma.user.create({
    data: {
      email: "superadmin@rt-online.id",
      password: hashedPassword,
      name: "Developer Admin",
      role: "SUPER_ADMIN",
      phone: "081200000001",
    },
  });

  // 2. RT_ADMIN - Admin Back Office (RT / Pengelola)
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@rt-online.id",
      password: hashedPassword,
      name: "Budi Santoso",
      role: "RT_ADMIN",
      phone: "081234567890",
    },
  });

  // 3. RW_ADMIN - Admin Back Office (RW / Lurah)
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "rw@rt-online.id",
      password: hashedPassword,
      name: "Haji Mahmud",
      role: "RW_ADMIN",
      phone: "081234567891",
    },
  });

  // 4. RESIDENT - User (Warga / Installer Apps)
  const residentUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "warga@rt-online.id",
      password: hashedPassword,
      name: "Ahmad Hidayat",
      role: "RESIDENT",
      phone: "081234567892",
    },
  });

  // Create houses
  const houses = [];
  for (let i = 1; i <= 20; i++) {
    const rumah = await prisma.rumah.create({
      data: {
        tenantId: tenant.id,
        nomorRumah: i.toString().padStart(3, "0"),
        blok: i <= 10 ? "A" : "B",
        alamat: `Jl. Kenanga No. ${i}, Pancoran Mas, Depok`,
        statusHuni: "DIHUNI",
        statusMilik: i % 5 === 0 ? "SEWA" : "MILIK_SENDIRI",
      },
    });
    houses.push(rumah);
  }

  // Create families and residents
  const names = [
    { kk: "Ahmad Hidayat", anggota: ["Ahmad Hidayat", "Fatimah Zahra", "Reza Hidayat", "Nadia Hidayat"] },
    { kk: "Bambang Purnomo", anggota: ["Bambang Purnomo", "Dewi Lestari", "Fajar Purnomo"] },
    { kk: "Candra Wijaya", anggota: ["Candra Wijaya", "Eka Putri", "Galih Wijaya", "Hana Wijaya"] },
    { kk: "Dedi Supriadi", anggota: ["Dedi Supriadi", "Intan Permata"] },
    { kk: "Eko Prasetyo", anggota: ["Eko Prasetyo", "Juwita Sari", "Kevin Prasetyo", "Lina Prasetyo", "Maya Prasetyo"] },
    { kk: "Faisal Rahman", anggota: ["Faisal Rahman", "Kartini Dewi", "Nabil Rahman"] },
    { kk: "Gunawan Setiawan", anggota: ["Gunawan Setiawan", "Laras Ayu", "Oscar Setiawan"] },
    { kk: "Heri Susanto", anggota: ["Heri Susanto", "Melati Sari", "Putra Susanto", "Qori Susanto"] },
    { kk: "Irfan Hakim", anggota: ["Irfan Hakim", "Nita Anggraini"] },
    { kk: "Joko Widodo", anggota: ["Joko Widodo", "Olivia Putri", "Rio Widodo"] },
    { kk: "Kurniawan Adi", anggota: ["Kurniawan Adi", "Puspita Sari", "Sari Adi", "Teguh Adi"] },
    { kk: "Lukman Hakim", anggota: ["Lukman Hakim", "Rina Wati", "Umar Hakim"] },
    { kk: "Muhammad Rizal", anggota: ["Muhammad Rizal", "Vina Amelia", "Wulan Rizal"] },
    { kk: "Nugroho Susilo", anggota: ["Nugroho Susilo", "Xenia Putri"] },
    { kk: "Omar Bakri", anggota: ["Omar Bakri", "Yuliana Sari", "Zaki Bakri", "Aisha Bakri"] },
  ];

  const wargaIds: string[] = [];

  for (let i = 0; i < names.length; i++) {
    const family = names[i];
    const kkNumber = `3276${(i + 1).toString().padStart(12, "0")}`;

    const keluarga = await prisma.keluarga.create({
      data: {
        tenantId: tenant.id,
        rumahId: houses[i].id,
        nomorKK: kkNumber,
        kepalaKeluarga: family.kk,
      },
    });

    for (let j = 0; j < family.anggota.length; j++) {
      const nik = `3276${(i * 10 + j + 1).toString().padStart(12, "0")}`;
      const isKepala = j === 0;
      const isFemale = j % 2 === 1;
      const birthYear = isKepala ? 1975 + i : 1978 + i + j * 3;

      const warga = await prisma.warga.create({
        data: {
          tenantId: tenant.id,
          keluargaId: keluarga.id,
          // Link first warga (Ahmad Hidayat) to the RESIDENT user
          userId: i === 0 && j === 0 ? residentUser.id : undefined,
          nik,
          namaLengkap: family.anggota[j],
          tempatLahir: "Depok",
          tanggalLahir: new Date(birthYear, i % 12, (j + 1) * 5),
          jenisKelamin: isFemale ? "PEREMPUAN" : "LAKI_LAKI",
          agama: "ISLAM",
          statusPerkawinan: j < 2 ? "KAWIN" : "BELUM_KAWIN",
          pekerjaan: isKepala ? ["PNS", "Wiraswasta", "Karyawan Swasta", "Guru", "Dokter"][i % 5] : isFemale ? "Ibu Rumah Tangga" : "Pelajar",
          pendidikan: isKepala ? "S1" : j < 2 ? "S1" : "SMA",
          nomorHP: `08${(1000000000 + i * 100 + j).toString()}`,
          statusTinggal: "TETAP",
          statusAktif: "AKTIF",
          isPemilih: birthYear <= 2009,
        },
      });
      wargaIds.push(warga.id);
    }
  }

  // Create iuran types
  const iuranKebersihan = await prisma.iuranType.create({
    data: {
      tenantId: tenant.id,
      nama: "Iuran Kebersihan",
      jumlah: 50000,
      periode: "BULANAN",
    },
  });

  const iuranKeamanan = await prisma.iuranType.create({
    data: {
      tenantId: tenant.id,
      nama: "Iuran Keamanan",
      jumlah: 25000,
      periode: "BULANAN",
    },
  });

  // Create some iuran payments
  const currentYear = new Date().getFullYear();
  for (let month = 1; month <= 3; month++) {
    for (let i = 0; i < Math.min(wargaIds.length, 15); i++) {
      const isPaid = Math.random() > 0.2;
      await prisma.iuranPayment.create({
        data: {
          tenantId: tenant.id,
          iuranTypeId: iuranKebersihan.id,
          wargaId: wargaIds[i],
          bulan: month,
          tahun: currentYear,
          jumlah: 50000,
          tanggalBayar: isPaid ? new Date(currentYear, month - 1, Math.floor(Math.random() * 28) + 1) : null,
          metodeBayar: isPaid ? (Math.random() > 0.5 ? "TUNAI" : "TRANSFER") : null,
        },
      });
    }
  }

  // Create kas transactions
  const kasCategories = [
    { jenis: "MASUK" as const, kategori: "Iuran Bulanan", keterangan: "Penerimaan iuran bulan Januari", jumlah: 750000 },
    { jenis: "MASUK" as const, kategori: "Iuran Bulanan", keterangan: "Penerimaan iuran bulan Februari", jumlah: 680000 },
    { jenis: "MASUK" as const, kategori: "Sumbangan", keterangan: "Sumbangan warga untuk HUT RI", jumlah: 500000 },
    { jenis: "KELUAR" as const, kategori: "Kebersihan", keterangan: "Bayar petugas kebersihan Januari", jumlah: 300000 },
    { jenis: "KELUAR" as const, kategori: "Keamanan", keterangan: "Bayar petugas keamanan Januari", jumlah: 200000 },
    { jenis: "KELUAR" as const, kategori: "Perbaikan", keterangan: "Perbaikan lampu jalan gang 3", jumlah: 150000 },
    { jenis: "KELUAR" as const, kategori: "ATK", keterangan: "Pembelian alat tulis sekretariat", jumlah: 75000 },
    { jenis: "MASUK" as const, kategori: "Iuran Bulanan", keterangan: "Penerimaan iuran bulan Maret", jumlah: 720000 },
  ];

  for (const kas of kasCategories) {
    await prisma.kasTransaction.create({
      data: {
        tenantId: tenant.id,
        tanggal: new Date(currentYear, Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1),
        jenis: kas.jenis,
        kategori: kas.kategori,
        keterangan: kas.keterangan,
        jumlah: kas.jumlah,
        pencatat: "Budi Santoso",
      },
    });
  }

  // Create tata tertib
  const rules = [
    { judul: "Jam Malam", isi: "Kegiatan yang menimbulkan kebisingan dilarang setelah pukul 22:00 WIB." },
    { judul: "Kebersihan Lingkungan", isi: "Setiap warga wajib menjaga kebersihan di depan rumah masing-masing." },
    { judul: "Parkir Kendaraan", isi: "Kendaraan harus diparkir di area yang telah ditentukan, tidak di badan jalan." },
    { judul: "Tamu", isi: "Tamu yang menginap lebih dari 1x24 jam wajib lapor ke RT." },
    { judul: "Keamanan", isi: "Setiap KK wajib ikut serta dalam jadwal ronda/siskamling sesuai giliran." },
  ];

  for (let i = 0; i < rules.length; i++) {
    await prisma.tataTertib.create({
      data: { tenantId: tenant.id, judul: rules[i].judul, isi: rules[i].isi, urutan: i + 1 },
    });
  }

  // Create organisasi
  const pengurus = [
    { nama: "Budi Santoso", jabatan: "Ketua RT", urutan: 1 },
    { nama: "Haji Mahmud", jabatan: "Ketua RW", urutan: 2 },
    { nama: "Ahmad Hidayat", jabatan: "Bendahara", urutan: 3 },
    { nama: "Bambang Purnomo", jabatan: "Sie. Keamanan", urutan: 4 },
    { nama: "Candra Wijaya", jabatan: "Sie. Kebersihan", urutan: 5 },
  ];

  for (const p of pengurus) {
    await prisma.organisasi.create({
      data: { tenantId: tenant.id, ...p, periode: "2024-2027" },
    });
  }

  console.log("Seed completed!");
  console.log("---");
  console.log("Demo accounts (password: password123):");
  console.log("  1. Admin Server (Developer):     superadmin@rt-online.id");
  console.log("  2. Admin RT (Pengelola):          admin@rt-online.id");
  console.log("  3. Admin RW/Lurah:                rw@rt-online.id");
  console.log("  4. Warga (User):                  warga@rt-online.id");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
