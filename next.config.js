/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdf-lib', 'posthog-node'],
};

module.exports = nextConfig;
