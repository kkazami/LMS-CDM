const schoolClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila", hour: "numeric", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit",
});

export function isFirstLoginSession(sessionCreatedAt?: Date | null, firstLoginAt?: Date | null) {
  return Boolean(sessionCreatedAt && firstLoginAt && firstLoginAt >= sessionCreatedAt);
}

export function getDashboardGreeting(fullName: string, now: Date, seed: string, firstLogin = false) {
  const name = fullName.trim().split(/\s+/)[0] || "there";
  const parts = schoolClock.formatToParts(now);
  const hour = Number(parts.find(part => part.type === "hour")?.value);
  const choices = firstLogin
    ? [`Welcome aboard, ${name}.`, `Your first chapter starts here, ${name}.`, `A fresh start, ${name}. Let’s begin.`]
    : hour < 5 || hour >= 21
      ? [`A quiet moment to learn, ${name}.`, `Late-night ideas, ${name}?`, `One more spark of curiosity, ${name}.`]
      : hour < 12
        ? [`Good morning, ${name}.`, `A fresh day, a fresh idea, ${name}.`, `What will you discover today, ${name}?`]
        : hour < 17
          ? [`Good afternoon, ${name}.`, `Ready for your next bright idea, ${name}?`, `A little progress goes a long way, ${name}.`]
          : [`Good evening, ${name}.`, `Your next chapter awaits, ${name}.`, `Let’s make room for one good idea, ${name}.`];
  // Keep the variation stable within this school day and session, including SSR.
  let variation = 0;
  for (const character of seed + parts.filter(part => ["year", "month", "day"].includes(part.type)).map(part => part.value).join("")) {
    variation = (variation * 31 + character.codePointAt(0)!) >>> 0;
  }
  return choices[variation % choices.length];
}
