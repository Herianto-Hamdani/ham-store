export function getScheduledThemeMode(date = new Date()): "light" | "dark" {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const clock = hours * 100 + minutes;

  return clock >= 600 && clock <= 1800 ? "light" : "dark";
}
