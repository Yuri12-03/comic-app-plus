import { AuthPage } from "@/components/auth-page";
export default async function Signup({searchParams}:{searchParams:Promise<{next?:string}>}) {
  return <AuthPage mode="signup" next={(await searchParams).next} />;
}
