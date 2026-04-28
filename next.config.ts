import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // rhwp-studio iframe은 same-origin 이므로 별도 CORS/CSP 설정 불필요
  // SharedArrayBuffer가 필요해지면 COOP/COEP 헤더를 추가할 것
};

export default nextConfig;
