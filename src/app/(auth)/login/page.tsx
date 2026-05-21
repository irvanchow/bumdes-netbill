"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah");
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan saat login");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Bill BumdesNET</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sistem Billing Internet Desa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg border border-red-100 dark:border-red-900">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="admin@bumdes.id"
              className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-input text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-input text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-xs mt-6">
          &copy; 2026 BumDes Jelijih Punggang. All rights reserved.
        </p>
      </div>
    </div>
  );
}
