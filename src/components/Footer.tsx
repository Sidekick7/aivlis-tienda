import Link from "next/link";
import { storeConfig } from "@/config/store";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/aivlis.ind",
    external: true,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@aivlis.ind",
    external: true,
  },
  {
    label: "WhatsApp",
    href: "/contacto",
    external: false,
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black px-5 py-5 text-white md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="font-bold tracking-[0.3em] transition hover:opacity-80"
        >
          AIVLIS
        </Link>

        <div className="flex flex-col gap-3 text-zinc-300 md:flex-row md:items-center md:gap-8">
          <p>
            WhatsApp:{" "}
            <span className="text-white">
              {storeConfig.whatsappNumber || "a definir"}
            </span>
          </p>

          <div className="flex flex-wrap gap-2">
            {socialLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 px-4 text-xs font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 px-4 text-xs font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
