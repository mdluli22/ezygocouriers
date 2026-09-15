import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "EzyGo Couriers",
    short_name: "EzyGo",
    description:
      "Book and track reliable courier deliveries across Cape Town.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#2f4f4f",
    categories: ["business", "navigation", "productivity"],
    icons: [
      {
        src: "/EzyGoIcon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/EzyGoIcon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/EzyGoIcon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/EzyGoIcon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Book a delivery",
        short_name: "New delivery",
        description: "Start a new courier booking.",
        url: "/dashboard/deliveries/new",
        icons: [
          {
            src: "/EzyGoIcon.png",
            sizes: "1024x1024",
            type: "image/png",
          },
        ],
      },
      {
        name: "My deliveries",
        short_name: "Deliveries",
        description: "View and track your EzyGo deliveries.",
        url: "/dashboard",
        icons: [
          {
            src: "/EzyGoIcon.png",
            sizes: "1024x1024",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
