import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // rhwp-studio iframe은 same-origin 이므로 별도 CORS/CSP 설정 불필요
  // SharedArrayBuffer가 필요해지면 COOP/COEP 헤더를 추가할 것
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://172.16.165.158:8088/api/:path*", // 오프라인 서버의 실제 API 주소
      },
    ];
  },
};

export default nextConfig;
