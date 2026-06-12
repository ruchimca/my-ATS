/** @type {import('next').NextConfig} */
const nextConfig = {
  // mammoth reads its own files at runtime; keep it out of the bundle.
  serverExternalPackages: ["mammoth"],
  experimental: {
    serverActions: {
      // Resumes are uploaded through a server action; raise the body limit
      // above the 1 MB default so typical PDF/Word files go through.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
