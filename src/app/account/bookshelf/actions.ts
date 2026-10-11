"use server";
import { revalidatePath } from "next/cache";
import { requireBookshelfUser } from "@/lib/bookshelf-server";

export type ShelfSettingState = { error?: string };
export async function updateSeriesSetting(_previous: ShelfSettingState, form: FormData): Promise<ShelfSettingState> {
  const { client } = await requireBookshelfUser();
  const id = String(form.get("seriesId") ?? "");
  const [setting, value] = String(form.get("change") ?? "").split(":");
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id) || !["public", "recommended"].includes(setting) || !["true", "false"].includes(value)) {
    return { error: "設定を選び直してください。" };
  }
  const { error } = await client.rpc("set_comic_series_setting", { p_series: id, p_setting: setting, p_value: value === "true" });
  if (error) return { error: "設定を保存できませんでした。もう一度お試しください。" };
  revalidatePath("/account/bookshelf", "layout");
  revalidatePath("/account/friends", "layout");
  return {};
}
