"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fallbackHomeContent,
  getHomeContent,
} from "@/lib/homeContent";

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        fill="currentColor"
        d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7.35A4.65 4.65 0 1 1 12 16.65 4.65 4.65 0 0 1 12 7.35Zm0 2A2.65 2.65 0 1 0 12 14.65 2.65 2.65 0 0 0 12 9.35ZM17.15 6.65a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        fill="currentColor"
        d="M16.6 2c.27 2.28 1.56 3.63 3.74 3.78v3.06a7.13 7.13 0 0 1-3.7-.97v6.98c0 3.54-2.23 6.05-5.7 6.05-3.25 0-5.28-2.18-5.28-5.1 0-3.28 2.55-5.6 6.35-5.33v3.14c-1.67-.25-3.08.56-3.08 2.05 0 1.2.84 2.02 2.02 2.02 1.37 0 2.33-.83 2.33-2.64V2h3.32Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        fill="currentColor"
        d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.48h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.77l-.44 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06Z"
      />
    </svg>
  );
}

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState(
    fallbackHomeContent.socialLinks
  );

  useEffect(() => {
    getHomeContent()
      .then((content) => setSocialLinks(content.socialLinks))
      .catch(() => {});
  }, []);

  const footerLinks = [
    {
      label: "Instagram",
      href: socialLinks.instagramUrl,
      icon: InstagramIcon,
    },
    {
      label: "Facebook",
      href: socialLinks.facebookUrl,
      icon: FacebookIcon,
    },
    {
      label: "TikTok",
      href: socialLinks.tiktokUrl,
      icon: TikTokIcon,
    },
  ];

  return (
    <footer className="border-t border-zinc-800 bg-[#0c0c0c] px-5 py-4 text-white md:px-10">
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1fr)] md:items-center">
        <Link
          href="/"
          className="flex w-fit transition hover:opacity-80 md:ml-10 lg:ml-16"
          aria-label="AIVLIS"
        >
          <Image
            src="/aiv.png"
            alt="AIVLIS"
            width={420}
            height={90}
            className="h-auto w-[150px] object-contain sm:w-[190px] lg:w-[230px]"
          />
        </Link>

        <div className="flex flex-col items-start gap-2 md:items-center">
          <p className="font-brand text-2xl uppercase text-white">
            Nuestras redes
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {footerLinks.map((link) => {
              const Icon = link.icon;

              return (
                <a
                  key={link.label}
                  href={link.href || "#"}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
