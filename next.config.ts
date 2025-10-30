import type { NextConfig } from "next";
import { env } from "process";

const allowedDevOrigins = env.REPLIT_DOMAINS?.split(",").filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

module.exports = nextConfig;
