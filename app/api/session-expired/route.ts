import { signOut } from "@/auth";

/** Dipanggil bila sesi merujuk ke pengguna yang sudah tidak ada: hapus cookie lalu ke halaman masuk. */
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
