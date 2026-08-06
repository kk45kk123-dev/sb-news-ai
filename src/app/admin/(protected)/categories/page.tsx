"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { useCategoryCountsQuery } from "@/lib/query/use-categories";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCategoriesPage() {
  const { data: counts, isLoading } = useCategoryCountsQuery();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [nameDraft, setNameDraft] = React.useState("");

  function openEdit(id: string, currentName: string) {
    setEditing(id);
    setNameDraft(currentName);
  }

  function saveEdit() {
    toast.success(`"${nameDraft}"(으)로 카테고리 이름을 변경했습니다.`);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">카테고리 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">서비스 전반에서 사용되는 뉴스 카테고리 체계입니다.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>카테고리</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>게시된 기사 수</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CATEGORIES.map((c) => {
                const count = counts?.find((x) => x.categoryId === c.id)?.count;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(var(--${c.colorVar}))` }} />
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                    <TableCell className="tabular-nums">{isLoading ? <Skeleton className="h-4 w-8" /> : `${count ?? 0}건`}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c.id, c.name)}>
                        <Pencil className="h-3.5 w-3.5" /> 이름 변경
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리 이름 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">카테고리 이름</Label>
            <Input id="cat-name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
