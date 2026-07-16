const emailInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const submitButton = document.getElementById("submit") as HTMLButtonElement;
const errorEl = document.getElementById("error") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function setStatus(text: string, variant: "neutral" | "success" | "warn"): void {
  statusEl.textContent = text;
  statusEl.className = variant;
}

function wifiResultText(wifiState: "on-office" | "off-office" | "error" | undefined): { text: string; variant: "success" | "warn" } {
  switch (wifiState) {
    case "on-office":
      return { text: "✓ Connected to office WiFi — you're punched in.", variant: "success" };
    case "off-office":
      return { text: "Logged in. Not on office WiFi yet — you'll be punched in automatically once connected.", variant: "warn" };
    case "error":
    default:
      return { text: "Logged in, but couldn't reach the attendance server to punch in. Will retry automatically.", variant: "warn" };
  }
}

// Main process pushes this once credentials are verified and it starts
// checking WiFi, so the user sees the process happening rather than the
// window just closing on them.
window.agent.onStatus((message) => setStatus(message, "neutral"));

async function submit(): Promise<void> {
  errorEl.textContent = "";
  setStatus("", "neutral");
  submitButton.disabled = true;
  submitButton.textContent = "Logging in...";
  emailInput.disabled = true;
  passwordInput.disabled = true;

  const result = await window.agent.login(emailInput.value.trim(), passwordInput.value).catch(() => null);

  if (!result || !result.ok) {
    errorEl.textContent = (result && result.error) || "Login failed.";
    submitButton.disabled = false;
    submitButton.textContent = "Log in";
    emailInput.disabled = false;
    passwordInput.disabled = false;
    return;
  }

  const { text, variant } = wifiResultText(result.wifiState);
  setStatus(text, variant);
  submitButton.textContent = "Done";
  setTimeout(() => window.agent.closeLoginWindow(), 1800);
}

submitButton.addEventListener("click", submit);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
});
