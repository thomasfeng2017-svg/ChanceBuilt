import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Hosts allowed to reach the dev server through a tunnel.
   *
   * Needed when showing work in progress to the client over a
   * `cloudflared tunnel --url http://localhost:3000` link: without it Next
   * refuses the cross-origin dev requests and the page loads without styles or
   * client JS. Quick tunnels get a random subdomain each run, hence wildcards.
   *
   * Dev only. No effect on a production build.
   */
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.loca.lt"],

  /**
   * `public/` is served by the CDN and is NOT bundled into the serverless
   * functions. Logo.tsx checks the filesystem to decide between the vector
   * lockup, the monogram and the drawn fallback, so without this the deployed
   * site silently renders the placeholder mark instead of the real logo.
   *
   * Only the brand folder is included. Pulling in all of public/ would put
   * ~15MB of photography into every function for no benefit, since those are
   * fetched over HTTP by the browser rather than read by the server.
   */
  outputFileTracingIncludes: {
    "/**": ["./public/brand/**"],
  },

  experimental: {
    serverActions: {
      /**
       * Server Actions additionally verify that Origin matches Host, and this
       * site runs cart, checkout, booking and the entire admin through them.
       * Over a tunnel the browser sends the tunnel domain while the server
       * sees localhost, so without this every action fails with "Invalid
       * Server Actions request" and the UI simply looks broken.
       */
      allowedOrigins: [
        "localhost:3000",
        "*.trycloudflare.com",
        "*.ngrok-free.app",
        "*.loca.lt",
      ],
    },
  },
};

export default nextConfig;
