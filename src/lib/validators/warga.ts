import { z } from "zod";

export const wargaSchema = z.object({
  nik: z.string().min(16, "NIK harus 16 digit").max(16, "NIK harus 16 digit"),
  namaLengkap: z.string().min(2, "Nama minimal 2 karakter"),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.string().optional(),
  jenisKelamin: z.enum(["LAKI_LAKI", "PEREMPUAN"]).optional(),
  golonganDarah: z.string().optional(),
  agama: z.enum(["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU", "LAINNYA"]).optional(),
  statusPerkawinan: z.enum(["BELUM_KAWIN", "KAWIN", "CERAI_HIDUP", "CERAI_MATI"]).optional(),
  pekerjaan: z.string().optional(),
  pendidikan: z.string().optional(),
  kewarganegaraan: z.string().default("WNI"),
  nomorHP: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  statusTinggal: z.enum(["TETAP", "KONTRAK", "KOST", "LAINNYA"]).default("TETAP"),
  keluargaId: z.string().optional(),
  catatan: z.string().optional(),
});

export type WargaInput = z.infer<typeof wargaSchema>;

export const rumahSchema = z.object({
  nomorRumah: z.string().min(1, "Nomor rumah harus diisi"),
  blok: z.string().optional(),
  alamat: z.string().min(1, "Alamat harus diisi"),
  rt: z.string().optional(),
  rw: z.string().optional(),
  statusHuni: z.enum(["DIHUNI", "TIDAK_DIHUNI", "DISEWAKAN"]).default("DIHUNI"),
  statusMilik: z.enum(["MILIK_SENDIRI", "SEWA", "KONTRAK", "LAINNYA"]).default("MILIK_SENDIRI"),
  luasTanah: z.number().optional(),
  luasBangunan: z.number().optional(),
  catatan: z.string().optional(),
});

export type RumahInput = z.infer<typeof rumahSchema>;

export const keluargaSchema = z.object({
  rumahId: z.string().min(1, "Rumah harus dipilih"),
  nomorKK: z.string().min(16, "Nomor KK harus 16 digit").max(16, "Nomor KK harus 16 digit"),
  kepalaKeluarga: z.string().min(2, "Nama kepala keluarga minimal 2 karakter"),
});

export type KeluargaInput = z.infer<typeof keluargaSchema>;
