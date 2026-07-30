/** @type {import('next').NextConfig} */
const nextConfig = {
  // tesseract.js spawns a Node worker_thread and resolves its script path
  // relative to node_modules at runtime — bundling it with webpack breaks
  // that resolution, so it must load natively via require() instead.
  // Renamed out of `experimental` in Next 15; the old key is no longer read.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
