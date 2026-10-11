import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
const compile = path => ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const profile = {};
vm.runInNewContext(compile("src/lib/profile.ts"), { exports: profile });
const uid = "11111111-1111-1111-1111-111111111111";
let context, writes, uploads, removes, failure;
function reset() {
  writes = []; uploads = []; removes = []; failure = "";
  context = { user: { id: uid }, profile: null, failed: false, client: {
    from: () => ({ upsert: async row => { writes.push(row); return { error: failure === "profile" ? new Error("offline") : null }; } }),
    storage: { from: () => ({ upload: async (path, bytes) => { uploads.push({ path, bytes }); return { error: failure === "upload" ? new Error("offline") : null }; }, remove: async paths => { removes.push(...paths); return { error: null }; } }) },
  } };
}
const actions = {};
vm.runInNewContext(compile("src/app/account/settings/profile/actions.ts"), { exports: actions, File, Uint8Array, crypto: webcrypto, require: name => {
  if (name === "next/cache") return { revalidatePath() {} };
  if (name === "next/navigation") return { redirect: path => { throw new Error(`REDIRECT:${path}`); } };
  if (name === "@/lib/profile-server") return { loadUserProfile: async () => context };
  if (name === "@/lib/profile") return profile;
  throw new Error(name);
} });
function form(kind = "preset") {
  const data = new FormData(); data.set("displayName", "テストのねこ"); data.set("avatarKind", kind); data.set("avatarPreset", "cat");
  data.set("userId", "22222222-2222-2222-2222-222222222222");
  return data;
}
reset();
await assert.rejects(actions.saveProfile(true, {}, form()), /REDIRECT:\/account$/);
assert.equal(writes[0].id, uid, "Never use submitted identity");
assert.equal(writes[0].avatar_path, null);
reset(); const invalid = form(); invalid.set("displayName", "");
assert.ok((await actions.saveProfile(false, {}, invalid)).error); assert.equal(writes.length, 0);
reset(); assert.ok((await actions.saveProfile(false, {}, form("photo"))).error); assert.equal(writes.length, 0);
reset(); const disguised = form("photo"); disguised.set("photo", new File(['<svg onload="alert(1)">'], "fake.jpg", { type: "image/jpeg" }));
assert.ok((await actions.saveProfile(false, {}, disguised)).error); assert.equal(uploads.length, 0);
const photoForm = () => { const data = form("photo"); data.set("photo", new File([Uint8Array.from([255,216,255,224])], "profile.jpg", { type: "image/jpeg" })); return data; };
reset(); failure = "upload"; assert.ok((await actions.saveProfile(false, {}, photoForm())).error); assert.equal(writes.length, 0);
reset(); context.profile = { avatar_path: `${uid}/old.jpg` }; failure = "profile";
assert.ok((await actions.saveProfile(false, {}, photoForm())).error);
assert.equal(removes[0], uploads[0].path, "Remove failed new upload"); assert.ok(!removes.includes(context.profile.avatar_path), "Preserve previous photo on failed save");
reset(); context.profile = { avatar_path: `${uid}/old.jpg` };
await assert.rejects(actions.saveProfile(false, {}, photoForm()), /REDIRECT:\/account\/settings\/profile\?saved=1/);
assert.ok(uploads[0].path.startsWith(`${uid}/`)); assert.equal(writes[0].avatar_path, uploads[0].path); assert.equal(removes[0], context.profile.avatar_path);
reset(); context.failed = true; assert.ok((await actions.saveProfile(false, {}, form())).error); assert.equal(writes.length, 0);
console.log("Profile identity, upload validation, error recovery and navigation passed");
