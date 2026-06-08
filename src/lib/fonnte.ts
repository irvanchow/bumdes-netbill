// Helper untuk kirim pesan WA via API Fonnte.
// Docs: https://docs.fonnte.com/

const FONNTE_ENDPOINT = "https://api.fonnte.com/send";

export type FonnteResult = {
  ok: boolean;
  status: number;
  detail: unknown;
};

/** Normalisasi nomor HP ke format internasional Indonesia (62xxx). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export async function sendFonnteMessage(
  phone: string,
  message: string,
  token?: string
): Promise<FonnteResult> {
  const authToken = token ?? process.env.FONNTE_TOKEN;

  if (!authToken) {
    return {
      ok: false,
      status: 0,
      detail: { error: "FONNTE_TOKEN tidak diset di environment" },
    };
  }

  const target = normalizePhone(phone);

  if (!target || target.length < 10) {
    return {
      ok: false,
      status: 0,
      detail: { error: `Nomor HP tidak valid: ${phone}` },
    };
  }

  try {
    const formData = new FormData();
    formData.append("target", target);
    formData.append("message", message);
    formData.append("countryCode", "62");

    const response = await fetch(FONNTE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: authToken,
      },
      body: formData,
    });

    const detail = await response.json().catch(() => ({ raw: "non-json response" }));

    return {
      ok: response.ok && (detail as { status?: boolean }).status !== false,
      status: response.status,
      detail,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}
