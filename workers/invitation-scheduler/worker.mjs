export default {
  async scheduled(_controller, env) {
    const endpoint = new URL(env.LMS_EMAIL_ENDPOINT);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.pathname !== "/api/internal/email/process" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      !env.CRON_SECRET ||
      env.CRON_SECRET.length < 32
    ) {
      throw new Error("Invalid invitation scheduler configuration.");
    }
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(55000),
      headers: { Authorization: "Bearer " + env.CRON_SECRET },
    });
    if (!response.ok)
      throw new Error("Invitation processing returned HTTP " + response.status);
  },
};
