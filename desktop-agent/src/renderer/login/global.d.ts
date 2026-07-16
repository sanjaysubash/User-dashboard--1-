interface Window {
  agent: {
    login: (
      email: string,
      password: string
    ) => Promise<{
      ok: boolean;
      error?: string;
      wifiState?: "on-office" | "off-office" | "error";
    }>;
    closeLoginWindow: () => void;
    onStatus: (cb: (message: string) => void) => void;
  };
}
