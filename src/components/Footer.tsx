import Link from "next/link";
import { storeConfig } from "@/config/store";

const socialLinks = [
  {
    label: "Instagram",
    href: "/contacto",
  },
  {
    label: "TikTok",
    href: "/contacto",
  },
  {
    label: "WhatsApp",
    href: "/contacto",
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

          <div className="flex flex-wrap gap-4">
            {socialLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
