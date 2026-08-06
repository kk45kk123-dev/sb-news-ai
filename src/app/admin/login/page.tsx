"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { adminLoginSchema, type AdminLoginInput } from "@/lib/schemas/user.schema";
import { DEMO_ADMINS, useAdminAuth } from "@/context/admin-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = { admin: "관리자", viewer: "일반회원" };

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  async function onSubmit(values: AdminLoginInput) {
    try {
      const admin = await login(values);
      toast.success(`${admin.name}님(${ROLE_LABEL[admin.role]})으로 로그인했습니다.`);
      router.push("/admin");
    } catch {
      toast.error("로그인에 실패했습니다.");
    }
  }

  function fillDemo(email: string) {
    setValue("email", email);
    setValue("password", "demo1234");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <CardTitle>관리자 로그인</CardTitle>
          <CardDescription>SB NEWS AI 디지털전략부 관리 콘솔</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" placeholder="admin@sbfederation.or.kr" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              로그인
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">데모 계정으로 빠르게 로그인</p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(DEMO_ADMINS).map(([email, meta]) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => fillDemo(email)}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  <span className="font-medium text-foreground">{meta.name}</span>
                  <Badge variant="outline">{ROLE_LABEL[meta.role]}</Badge>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
