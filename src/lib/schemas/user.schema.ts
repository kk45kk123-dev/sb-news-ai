import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const loginSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 형식이 아닙니다." }),
  password: z.string().min(8, { message: "비밀번호는 8자 이상이어야 합니다." }),
});
export type LoginInput = z.infer<typeof loginSchema>;

// 12자 정책은 src/server/auth/constants.ts의 MIN_PASSWORD_LENGTH와 반드시 일치해야 한다 —
// 서버 상수는 클라이언트 번들에 들어가면 안 되는 경로(src/server/**)라 값만 복제해서 쓴다.
export const signupSchema = z
  .object({
    name: z.string().min(2, { message: "이름은 2자 이상 입력해주세요." }),
    email: z.string().email({ message: "올바른 이메일 형식이 아닙니다." }),
    password: z.string().min(12, { message: "비밀번호는 12자 이상이어야 합니다." }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

/** 본인 프로필의 이름 변경 — 공개 사이트(/profile)와 관리자 콘솔 계정 모두 이 스키마로 검증한다. */
export const updateProfileSchema = z.object({
  name: z.string().min(2, { message: "이름은 2자 이상 입력해주세요." }).max(100, { message: "이름은 100자 이내로 입력해주세요." }),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const adminRoleSchema = z.enum(["admin", "viewer"]);
export type AdminRole = z.infer<typeof adminRoleSchema>;

export const adminSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: adminRoleSchema,
  lastLoginAt: z.string().nullable(),
});
export type Admin = z.infer<typeof adminSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 형식이 아닙니다." }),
  password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
