export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/paket/:path*", "/pelanggan/:path*", "/tagihan/:path*", "/pembayaran/:path*", "/laporan/:path*", "/settings/:path*"],
};
