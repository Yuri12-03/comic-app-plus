export const avatarPresets = [
  { id: "cat", label: "ねこ", color: "#f5dfd3" },
  { id: "dog", label: "いぬ", color: "#eadfc9" },
  { id: "rabbit", label: "うさぎ", color: "#f4dfe7" },
  { id: "bear", label: "くま", color: "#e2d3c2" },
  { id: "penguin", label: "ペンギン", color: "#dce9ec" },
  { id: "fox", label: "きつね", color: "#f7e2bd" },
  { id: "book", label: "本", color: "#dce7d6" },
  { id: "coffee", label: "コーヒー", color: "#e5def0" },
] as const;
export type AvatarPreset = typeof avatarPresets[number]["id"];
export type UserProfile = { id: string; display_name: string; avatar_kind: "preset" | "photo"; avatar_preset: AvatarPreset; avatar_path: string | null };
export function isAvatarPreset(value: string): value is AvatarPreset {
  return avatarPresets.some(item => item.id === value);
}
export function validDisplayName(value: string) {
  return value.length >= 1 && [...value].length <= 30 && !/[\u0000-\u001f\u007f]/.test(value);
}
export function imageContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp";
  return null;
}
