"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useCategories } from "@/context/categories-context";
import { newsEditFormSchema, type NewsEditFormInput } from "@/lib/schemas/news.schema";
import { useNewsDetailQuery } from "@/lib/query/use-news";
import { useUpdateNewsMutation } from "@/lib/query/use-admin";
import type { News } from "@/lib/schemas/news.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewsThumbnail } from "@/components/news/news-thumbnail";

export default function AdminNewsEditPage() {
  const params = useParams<{ id: string }>();
  const { data: news, isLoading } = useNewsDetailQuery(params.id);

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!news) {
    return <p className="text-sm text-muted-foreground">기사를 찾을 수 없습니다.</p>;
  }

  // Keying by news.id and only mounting the form once `news` is loaded means
  // useForm's defaultValues are correct on first render — no async reset() vs.
  // Controller-registration race to worry about.
  return <EditForm key={news.id} news={news} />;
}

function EditForm({ news }: { news: News }) {
  const categories = useCategories();
  const router = useRouter();
  const updateMutation = useUpdateNewsMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewsEditFormInput>({
    resolver: zodResolver(newsEditFormSchema),
    defaultValues: {
      title: news.title,
      categoryId: news.categoryId,
      status: news.status,
      summaryLine1: news.summaryBullets[0] ?? "",
      summaryLine2: news.summaryBullets[1] ?? "",
      summaryLine3: news.summaryBullets[2] ?? "",
      keywords: news.keywords.join(", "),
      body: news.body,
      imageUrl: news.imageUrl ?? "",
      glossary: news.glossary,
    },
  });

  const imageUrlValue = watch("imageUrl");
  const glossaryFields = useFieldArray({ control, name: "glossary" });

  async function onSubmit(values: NewsEditFormInput) {
    updateMutation.mutate(
      {
        id: news.id,
        patch: {
          title: values.title,
          categoryId: values.categoryId,
          status: values.status,
          summaryBullets: [values.summaryLine1, values.summaryLine2, values.summaryLine3],
          keywords: values.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          body: values.body,
          imageUrl: values.imageUrl.trim() === "" ? null : values.imageUrl.trim(),
          glossary: values.glossary
            .map((g) => ({ term: g.term.trim(), definition: g.definition.trim(), context: g.context }))
            .filter((g) => g.term && g.definition),
        },
      },
      {
        onSuccess: () => {
          toast.success("기사가 수정되었습니다.");
          router.push("/admin/news");
        },
        onError: () => toast.error("수정에 실패했습니다."),
      }
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/news" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 뉴스 관리로 돌아가기
      </Link>

      <div>
        <h1 className="text-page-title">기사 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">{news.title}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">제목</Label>
              <Input id="title" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="imageUrl">대표 이미지 URL (선택)</Label>
              <Input id="imageUrl" placeholder="https://example.com/image.jpg" {...register("imageUrl")} />
              {errors.imageUrl && <p className="text-xs text-destructive">{errors.imageUrl.message}</p>}
              <p className="text-xs text-muted-foreground">비워두면 카테고리 색상의 기본 썸네일이 표시됩니다.</p>
              <NewsThumbnail
                categoryId={news.categoryId}
                gradient={news.thumbnailGradient}
                imageUrl={imageUrlValue}
                className="aspect-[16/9] w-full max-w-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>카테고리</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>게시 상태</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">게시됨</SelectItem>
                        <SelectItem value="scheduled">예약됨</SelectItem>
                        <SelectItem value="draft">임시저장</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="summaryLine1">AI 요약 (3줄)</Label>
              <Input id="summaryLine1" {...register("summaryLine1")} />
              {errors.summaryLine1 && <p className="text-xs text-destructive">{errors.summaryLine1.message}</p>}
              <Input id="summaryLine2" {...register("summaryLine2")} />
              {errors.summaryLine2 && <p className="text-xs text-destructive">{errors.summaryLine2.message}</p>}
              <Input id="summaryLine3" {...register("summaryLine3")} />
              {errors.summaryLine3 && <p className="text-xs text-destructive">{errors.summaryLine3.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="keywords">핵심 키워드 (쉼표로 구분)</Label>
              <Input id="keywords" {...register("keywords")} />
              {errors.keywords && <p className="text-xs text-destructive">{errors.keywords.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>경제·금융 용어 주석 (선택, 최대 10개)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={glossaryFields.fields.length >= 10}
                  onClick={() => glossaryFields.append({ term: "", definition: "" })}
                >
                  <Plus className="h-3.5 w-3.5" /> 용어 추가
                </Button>
              </div>
              {glossaryFields.fields.length === 0 && (
                <p className="text-xs text-muted-foreground">등록된 용어 주석이 없습니다.</p>
              )}
              {glossaryFields.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 rounded-lg border border-border p-3">
                  <div className="flex-1 space-y-2">
                    <Input placeholder="용어 (예: 잉여현금흐름)" {...register(`glossary.${index}.term`)} />
                    <Textarea
                      rows={2}
                      placeholder="쉬운 설명 (한두 문장)"
                      {...register(`glossary.${index}.definition`)}
                    />
                    {field.context && (
                      <p className="text-[11px] text-muted-foreground">
                        AI가 남긴 맥락(수정 불가): {field.context}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => glossaryFields.remove(index)}
                    aria-label="용어 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {errors.glossary?.message && <p className="text-xs text-destructive">{errors.glossary.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">본문</Label>
              <Textarea id="body" rows={10} {...register("body")} />
              {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/news")}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                저장
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
