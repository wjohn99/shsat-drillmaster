export function isHsAnswerCorrect(
  selectedSpotId: string | null | undefined,
  correctSpotId: string
): boolean {
  return Boolean(selectedSpotId) && selectedSpotId === correctSpotId;
}
