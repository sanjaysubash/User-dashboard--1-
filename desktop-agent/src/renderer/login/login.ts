export {};

declare global {
  interface Window {
    agent: {
      login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

const emailInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const submitButton = document.getElementById("submit") as HTMLButtonElement;
const errorEl = document.getElementById("error") as HTMLDivElement;

async function submit(): Promise<void> {
  errorEl.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Logging in...";
  try {
    const result = await window.agent.login(emailInput.value.trim(), passwordInput.value);
    if (!result.ok) errorEl.textContent = result.error || "Login failed.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Log in";
  }
}

submitButton.addEventListener("click", submit);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
});
