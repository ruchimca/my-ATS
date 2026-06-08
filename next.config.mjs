/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Resumes are uploaded through a server action; raise the body limit
      // above the 1 MB default so typical PDF/Word files go through.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
