/** Private staff access is an explicit server-only allowlist, never a username. */
export function telegramOperatorIds(primaryChatId: string): string[] {
  const primary = process.env.TELEGRAM_OPERATOR_ID?.trim();
  const valid = (id: string) =>
    /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
  if (!primary || !valid(primary) || primary !== primaryChatId)
    throw new Error("Configure the primary private operator");
  const configured = process.env.TELEGRAM_OPERATOR_IDS;
  if (configured === undefined || !configured.trim()) return [primary];
  const ids = configured.split(",").map((id) => id.trim());
  if (
    ids.length > 20 ||
    ids.some((id) => !valid(id)) ||
    new Set(ids).size !== ids.length ||
    !ids.includes(primary)
  )
    throw new Error("Configure an explicit private operator allowlist");
  return ids;
}
