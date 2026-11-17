import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarHeart, GitFork, Share2, ShieldCheck, Users, Search } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

const features = [
  { icon: GitFork, title: "Pohon interaktif", desc: "Lihat silsilah secara vertikal atau horizontal, perbesar, geser, dan fokus pada satu orang." },
  { icon: Users, title: "Relasi lengkap", desc: "Orang tua, anak, pasangan, pernikahan kedua, anak angkat, dan saudara terdeteksi otomatis." },
  { icon: Search, title: "Cari & kalkulator hubungan", desc: "Temukan anggota dengan cepat dan ketahui apakah seseorang paman, sepupu, atau ipar Anda." },
  { icon: CalendarHeart, title: "Kalender keluarga", desc: "Jangan lewatkan ulang tahun dan peringatan wafat orang-orang tercinta." },
  { icon: Share2, title: "Bagikan & kolaborasi", desc: "Ajak keluarga sebagai Editor atau Penonton, atau bagikan tautan publik hanya-baca." },
  { icon: ShieldCheck, title: "Privasi terjaga", desc: "Data anggota yang masih hidup dapat disembunyikan dari tampilan publik." },
];

export default async function Home() {
  const session = await auth();
  const t = await getTranslations();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <Logo label={t("app.name")} />
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          {session ? (
            <Button render={<Link href="/trees" />}>{t("nav.myTrees")}</Button>
          ) : (
            <Button variant="outline" render={<Link href="/login" />}>
              {t("nav.login")}
            </Button>
          )}
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Rangkai kisah <span className="text-primary">keluarga besar</span> Anda dalam satu pohon
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">{t("app.tagline")}</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href={session ? "/trees" : "/register"} />}>
              {session ? t("nav.myTrees") : "Mulai gratis"}
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/share/keluarga-wiryo-demo" />}>
              Lihat contoh pohon
            </Button>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6">
              <f.icon className="size-8 text-primary" aria-hidden />
              <h2 className="mt-4 text-xl font-bold">{f.title}</h2>
              <p className="mt-2 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("app.name")}
      </footer>
    </div>
  );
}
