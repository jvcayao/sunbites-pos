"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { useAuthStore } from "@/lib/store/auth";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

const EchoContext = createContext<InstanceType<typeof Echo> | null>(null);

interface EchoProviderProps {
  children: React.ReactNode;
}

export function EchoProvider({ children }: EchoProviderProps) {
  const [echo, setEcho] = useState<InstanceType<typeof Echo> | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    window.Pusher = Pusher;

    const instance = new Echo({
      broadcaster: "reverb",
      key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
      wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
      wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
      wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
      forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http") === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEcho(instance);

    return () => {
      instance.disconnect();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEcho(null);
    };
  }, [token]);

  return <EchoContext.Provider value={token ? echo : null}>{children}</EchoContext.Provider>;
}

export function useEcho(): InstanceType<typeof Echo> | null {
  return useContext(EchoContext);
}
