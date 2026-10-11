import { AuthPage } from "@/components/auth-page";
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}) {
  return <AuthPage mode="login" next={(await searchParams).next} />;
}
