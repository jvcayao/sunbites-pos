import type { KioskStudent } from "@/types/kiosk";

export const kioskApi = {
  lookup: async (qrCode: string): Promise<KioskStudent> => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ qr_code: qrCode }),
      },
    );

    if (!response.ok) {
      throw new Error(String(response.status));
    }

    return response.json();
  },
};
