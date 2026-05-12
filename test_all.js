const BASE = 'http://localhost:3000';

async function testAPI(cookie, url, label) {
  try {
    const res = await fetch(`${BASE}${url}`, { headers: { Cookie: cookie } });
    const data = await res.json();
    const count = Array.isArray(data.data) ? data.data.length : (data.data?.iuranTypes ? 'types:' + data.data.iuranTypes.length : 'obj');
    console.log(`  ${res.status === 200 ? 'PASS' : 'FAIL'} ${label} (${url}) => ${res.status} | count: ${count}`);
    return { ok: res.status === 200, status: res.status };
  } catch(e) {
    console.log(`  FAIL ${label} (${url}) => ERROR: ${e.message}`);
    return { ok: false };
  }
}

async function testPOST(cookie, url, body, label) {
  try {
    const res = await fetch(`${BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log(`  ${res.status < 300 ? 'PASS' : 'FAIL'} POST ${label} => ${res.status} | ${data.success ? 'OK' : data.error}`);
    return data;
  } catch(e) {
    console.log(`  FAIL POST ${label} => ERROR: ${e.message}`);
    return null;
  }
}

async function testPage(url, label) {
  try {
    const res = await fetch(`${BASE}${url}`);
    const ok = res.status === 200;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} Page ${label} (${url}) => ${res.status}`);
    return ok;
  } catch(e) {
    console.log(`  FAIL Page ${label} => ERROR: ${e.message}`);
    return false;
  }
}

async function login(email) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie().join('; ') : '';

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookies
    },
    body: `email=${encodeURIComponent(email)}&password=password123&csrfToken=${csrfToken}&callbackUrl=%2Fdashboard&json=true`,
    redirect: 'manual'
  });

  const allCookies = [
    ...(csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : []),
    ...(loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [])
  ].join('; ');

  const sessionRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: allCookies } });
  const session = await sessionRes.json();
  return { cookie: allCookies, session };
}

async function main() {
  // Login as Admin RT
  console.log('\n=== LOGIN AS ADMIN RT ===');
  const admin = await login('admin@rt-online.id');
  console.log(`Login: ${admin.session.user ? 'PASS ' + admin.session.user.email + ' (' + admin.session.user.role + ')' : 'FAIL'}`);

  if (!admin.session.user) {
    console.log('Login failed, aborting');
    return;
  }

  const cookie = admin.cookie;

  console.log('\n=== API Tests (Batch 1 & 2) ===');
  await testAPI(cookie, '/api/v1/tamu', 'Tamu');
  await testAPI(cookie, '/api/v1/kendaraan', 'Kendaraan');
  await testAPI(cookie, '/api/v1/organisasi', 'Organisasi');
  await testAPI(cookie, '/api/v1/inventaris', 'Inventaris');
  await testAPI(cookie, '/api/v1/agenda', 'Agenda');
  await testAPI(cookie, '/api/v1/berita', 'Berita');
  await testAPI(cookie, '/api/v1/bansos', 'Bansos');
  await testAPI(cookie, '/api/v1/siskamling', 'Siskamling');
  await testAPI(cookie, '/api/v1/keluhan', 'Keluhan');

  console.log('\n=== API Tests (Batch 3 - New) ===');
  await testAPI(cookie, '/api/v1/kas', 'Kas');
  await testAPI(cookie, '/api/v1/iuran', 'Iuran');
  await testAPI(cookie, '/api/v1/usaha-warga', 'Usaha Warga');
  await testAPI(cookie, '/api/v1/pembangunan', 'Pembangunan');
  await testAPI(cookie, '/api/v1/pos-security', 'Pos Security (expect 403 Tier C)');

  console.log('\n=== API Tests (Reports) ===');
  await testAPI(cookie, '/api/v1/laporan/keuangan', 'Laporan Keuangan');
  await testAPI(cookie, '/api/v1/laporan/surat', 'Laporan Surat');

  console.log('\n=== POST Tests (Create) ===');
  await testPOST(cookie, '/api/v1/tamu', {
    nama: 'Test Tamu', alamat: 'Jl. Test 123', tujuan: 'Berkunjung', nomorHP: '081234567890'
  }, 'Tamu');
  await testPOST(cookie, '/api/v1/kas', {
    jenis: 'MASUK', kategori: 'Test', keterangan: 'Test transaksi', jumlah: 50000, tanggal: '2026-03-29'
  }, 'Kas');
  await testPOST(cookie, '/api/v1/iuran', {
    action: 'create_type', nama: 'Iuran Kebersihan', jumlah: 25000, periode: 'BULANAN'
  }, 'Iuran Type');
  await testPOST(cookie, '/api/v1/usaha-warga', {
    namaUsaha: 'Warung Test', pemilik: 'Budi Test', jenis: 'Makanan', alamat: 'Jl. Raya 1'
  }, 'Usaha Warga');
  await testPOST(cookie, '/api/v1/pembangunan', {
    judul: 'Perbaikan Jalan', deskripsi: 'Perbaikan jalan gang 5', pengusul: 'Budi', estimasiBiaya: 5000000, lokasi: 'Gang 5'
  }, 'Pembangunan');
  await testPOST(cookie, '/api/v1/agenda', {
    judul: 'Rapat RT', deskripsi: 'Rapat bulanan', tanggalMulai: '2026-04-01T09:00:00', tanggalSelesai: '2026-04-01T11:00:00', lokasi: 'Balai RT'
  }, 'Agenda');
  await testPOST(cookie, '/api/v1/keluhan', {
    judul: 'Lampu Jalan Mati', deskripsi: 'Lampu gang 3 mati', kategori: 'Infrastruktur'
  }, 'Keluhan');

  console.log('\n=== Page Render Tests ===');
  const pages = [
    ['/dashboard', 'Dashboard'], ['/tamu', 'Tamu'], ['/kendaraan', 'Kendaraan'],
    ['/organisasi', 'Organisasi'], ['/inventaris', 'Inventaris'], ['/agenda', 'Agenda'],
    ['/berita', 'Berita'], ['/bansos', 'Bansos'], ['/siskamling', 'Siskamling'],
    ['/keluhan', 'Keluhan'], ['/keuangan/kas', 'Kas RT'], ['/keuangan/iuran', 'Iuran'],
    ['/usaha-warga', 'Usaha Warga'], ['/pembangunan', 'Pembangunan'],
    ['/pos-security', 'Pos Security'], ['/profil-saya', 'Profil Saya'],
    ['/surat-saya', 'Surat Saya'], ['/iuran-saya', 'Iuran Saya'],
    ['/laporan/warga', 'Laporan Warga'], ['/laporan/keuangan', 'Laporan Keuangan'],
    ['/laporan/surat', 'Laporan Surat'], ['/laporan/monitoring', 'Laporan Monitoring'],
    ['/admin/tenants', 'Admin Tenants'], ['/admin/users', 'Admin Users'],
    ['/admin/subscriptions', 'Admin Subscriptions'],
  ];
  for (const [url, label] of pages) {
    await testPage(url, label);
  }

  // Login as Warga
  console.log('\n=== ROLE ACCESS TESTS (Warga) ===');
  const warga = await login('warga@rt-online.id');
  console.log(`Login: ${warga.session.user ? 'PASS ' + warga.session.user.email + ' (' + warga.session.user.role + ')' : 'FAIL'}`);

  if (warga.session.user) {
    const wc = warga.cookie;
    const w1 = await fetch(`${BASE}/api/v1/profil-saya`, { headers: { Cookie: wc } });
    console.log(`  ${w1.status === 200 ? 'PASS' : 'FAIL'} Warga -> profil-saya => ${w1.status}`);
    const w2 = await fetch(`${BASE}/api/v1/surat-saya`, { headers: { Cookie: wc } });
    console.log(`  ${w2.status === 200 ? 'PASS' : 'FAIL'} Warga -> surat-saya => ${w2.status}`);
    const w3 = await fetch(`${BASE}/api/v1/iuran-saya?tahun=2026`, { headers: { Cookie: wc } });
    console.log(`  ${w3.status === 200 ? 'PASS' : 'FAIL'} Warga -> iuran-saya => ${w3.status}`);
    const w4 = await fetch(`${BASE}/api/v1/admin/tenants`, { headers: { Cookie: wc } });
    console.log(`  ${w4.status === 403 ? 'PASS' : 'FAIL'} Warga -> admin/tenants => ${w4.status} (expect 403)`);
    const w5 = await fetch(`${BASE}/api/v1/kas`, { headers: { Cookie: wc } });
    console.log(`  ${w5.status === 403 ? 'PASS' : 'FAIL'} Warga -> kas => ${w5.status} (expect 403)`);
  }

  // Login as Super Admin
  console.log('\n=== ROLE ACCESS TESTS (Super Admin) ===');
  const superAdmin = await login('superadmin@rt-online.id');
  console.log(`Login: ${superAdmin.session.user ? 'PASS ' + superAdmin.session.user.email + ' (' + superAdmin.session.user.role + ')' : 'FAIL'}`);
  if (superAdmin.session.user) {
    const sc = superAdmin.cookie;
    const s1 = await fetch(`${BASE}/api/v1/admin/tenants`, { headers: { Cookie: sc } });
    console.log(`  ${s1.status === 200 ? 'PASS' : 'FAIL'} SuperAdmin -> admin/tenants => ${s1.status}`);
    const s2 = await fetch(`${BASE}/api/v1/admin/users`, { headers: { Cookie: sc } });
    console.log(`  ${s2.status === 200 ? 'PASS' : 'FAIL'} SuperAdmin -> admin/users => ${s2.status}`);
    const s3 = await fetch(`${BASE}/api/v1/admin/subscriptions`, { headers: { Cookie: sc } });
    console.log(`  ${s3.status === 200 ? 'PASS' : 'FAIL'} SuperAdmin -> admin/subscriptions => ${s3.status}`);
  }

  // Login as RW Admin
  console.log('\n=== ROLE ACCESS TESTS (RW Admin) ===');
  const rwAdmin = await login('rw@rt-online.id');
  console.log(`Login: ${rwAdmin.session.user ? 'PASS ' + rwAdmin.session.user.email + ' (' + rwAdmin.session.user.role + ')' : 'FAIL'}`);
  if (rwAdmin.session.user) {
    const rc = rwAdmin.cookie;
    const r1 = await fetch(`${BASE}/api/v1/laporan/warga`, { headers: { Cookie: rc } });
    console.log(`  ${r1.status === 200 ? 'PASS' : 'FAIL'} RW -> laporan/warga => ${r1.status}`);
    const r2 = await fetch(`${BASE}/api/v1/laporan/keuangan`, { headers: { Cookie: rc } });
    console.log(`  ${r2.status === 200 ? 'PASS' : 'FAIL'} RW -> laporan/keuangan => ${r2.status}`);
    const r3 = await fetch(`${BASE}/api/v1/laporan/surat`, { headers: { Cookie: rc } });
    console.log(`  ${r3.status === 200 ? 'PASS' : 'FAIL'} RW -> laporan/surat => ${r3.status}`);
  }

  console.log('\n=== ALL TESTS COMPLETE ===\n');
}

main().catch(console.error);
