import type { MetadataRoute } from "next";

// Makes payperread installable as an app (home screen / dock).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "payperread",
    short_name: "payperread",
    description: "Pay per story and podcast on Solana. No subscription.",
    start_url: "/library",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
