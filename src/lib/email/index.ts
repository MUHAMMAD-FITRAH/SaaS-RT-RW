import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// SMTP Configuration
// ---------------------------------------------------------------------------

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "noreply@rt-online.id";

const isSmtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

// Create the transporter lazily so it is only instantiated when needed.
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return _transporter;
}

// ---------------------------------------------------------------------------
// Generic send helper
// ---------------------------------------------------------------------------

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!isSmtpConfigured) {
    console.log("------- EMAIL (SMTP not configured, logging to console) -------");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html}`);
    console.log("----------------------------------------------------------------");
    return { messageId: "console-fallback", accepted: [to] };
  }

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
  });

  return { messageId: info.messageId, accepted: info.accepted };
}

// ---------------------------------------------------------------------------
// Domain-specific email helpers
// ---------------------------------------------------------------------------

interface SuratNotificationParams {
  to: string;
  namaWarga: string;
  nomorSurat: string;
  jenisSurat: string;
  status: string;
}

export async function sendSuratNotification({
  to,
  namaWarga,
  nomorSurat,
  jenisSurat,
  status,
}: SuratNotificationParams) {
  const statusLabel = status === "APPROVED" ? "Disetujui" : status === "REJECTED" ? "Ditolak" : status;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1e40af;">Pembaruan Status Surat</h2>
      <p>Halo <strong>${namaWarga}</strong>,</p>
      <p>Surat Anda telah diperbarui dengan detail berikut:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Nomor Surat</td><td style="padding:8px;border:1px solid #e5e7eb;">${nomorSurat}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Jenis Surat</td><td style="padding:8px;border:1px solid #e5e7eb;">${jenisSurat}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Status</td><td style="padding:8px;border:1px solid #e5e7eb;">${statusLabel}</td></tr>
      </table>
      <p>Silakan login ke portal RT Online untuk melihat detail selengkapnya.</p>
      <p style="color:#6b7280;font-size:12px;">Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[RT Online] Surat ${jenisSurat} - ${statusLabel}`,
    html,
  });
}

interface IuranReminderParams {
  to: string;
  namaWarga: string;
  iuranType: string;
  jumlah: number;
  bulan: string;
  tahun: number;
}

export async function sendIuranReminder({
  to,
  namaWarga,
  iuranType,
  jumlah,
  bulan,
  tahun,
}: IuranReminderParams) {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(jumlah);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1e40af;">Pengingat Pembayaran Iuran</h2>
      <p>Halo <strong>${namaWarga}</strong>,</p>
      <p>Ini adalah pengingat untuk pembayaran iuran Anda:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Jenis Iuran</td><td style="padding:8px;border:1px solid #e5e7eb;">${iuranType}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Periode</td><td style="padding:8px;border:1px solid #e5e7eb;">${bulan} ${tahun}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Jumlah</td><td style="padding:8px;border:1px solid #e5e7eb;">${formatted}</td></tr>
      </table>
      <p>Mohon segera lakukan pembayaran melalui portal RT Online atau langsung ke pengurus RT.</p>
      <p style="color:#6b7280;font-size:12px;">Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[RT Online] Pengingat Iuran ${iuranType} - ${bulan} ${tahun}`,
    html,
  });
}

interface KeluhanResponseParams {
  to: string;
  namaWarga: string;
  judul: string;
  tanggapan: string;
}

export async function sendKeluhanResponse({
  to,
  namaWarga,
  judul,
  tanggapan,
}: KeluhanResponseParams) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1e40af;">Tanggapan Keluhan</h2>
      <p>Halo <strong>${namaWarga}</strong>,</p>
      <p>Keluhan Anda telah mendapat tanggapan dari pengurus RT:</p>
      <div style="background:#f9fafb;border-left:4px solid #1e40af;padding:12px 16px;margin:16px 0;">
        <p style="font-weight:600;margin:0 0 8px 0;">${judul}</p>
        <p style="margin:0;">${tanggapan}</p>
      </div>
      <p>Silakan login ke portal RT Online untuk melihat detail selengkapnya atau memberikan tanggapan lanjutan.</p>
      <p style="color:#6b7280;font-size:12px;">Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[RT Online] Tanggapan Keluhan: ${judul}`,
    html,
  });
}

interface WelcomeEmailParams {
  to: string;
  name: string;
  tenantName: string;
}

export async function sendWelcomeEmail({
  to,
  name,
  tenantName,
}: WelcomeEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1e40af;">Selamat Datang di RT Online!</h2>
      <p>Halo <strong>${name}</strong>,</p>
      <p>Akun Anda telah berhasil didaftarkan di <strong>${tenantName}</strong>.</p>
      <p>Melalui portal RT Online, Anda dapat:</p>
      <ul style="line-height:1.8;">
        <li>Mengajukan surat pengantar secara online</li>
        <li>Memantau dan membayar iuran</li>
        <li>Menyampaikan keluhan atau aspirasi</li>
        <li>Melihat agenda dan berita RT</li>
      </ul>
      <p>
        <a href="${appUrl}/login" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 24px;text-decoration:none;border-radius:6px;">
          Login Sekarang
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;">Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[RT Online] Selamat Datang di ${tenantName}`,
    html,
  });
}
