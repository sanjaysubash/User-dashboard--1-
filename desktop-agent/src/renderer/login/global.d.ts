interface Window {
  agent: {
    login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  };
}
