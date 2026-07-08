export function buildThreadHeaderSubtitle(input: {
  readonly projectTitle: string | null;
  readonly environmentLabel: string | null;
  readonly connectionStateLabel: string | null;
}): string {
  return [input.projectTitle, input.environmentLabel, input.connectionStateLabel]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" · ");
}
