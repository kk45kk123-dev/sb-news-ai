"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as newsApi from "@/lib/api/news";
import { queryKeys } from "@/lib/query/keys";
import type { News, NewsListParams, NewsListResponse } from "@/lib/schemas/news.schema";

export function useNewsListQuery(params: Partial<NewsListParams> = {}) {
  return useQuery({
    queryKey: queryKeys.news.list(params),
    queryFn: () => newsApi.getNewsList(params),
  });
}

/** Infinite-scroll variant of the list query — each "더보기" click fetches the next page. */
export function useInfiniteNewsListQuery(params: Omit<Partial<NewsListParams>, "page"> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.news.list({ ...params, page: "infinite" as unknown as number }),
    queryFn: ({ pageParam }) => newsApi.getNewsList({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

export function useNewsDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.news.detail(id),
    queryFn: () => newsApi.getNewsDetail(id),
    enabled: !!id,
  });
}

export function useRelatedNewsQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.news.related(id),
    queryFn: () => newsApi.getRelatedNews(id),
    enabled: !!id,
  });
}

export function useSameTopicNewsQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.news.sameTopic(id),
    queryFn: () => newsApi.getSameTopicNews(id),
    enabled: !!id,
  });
}

export function useNewsByIdsQuery(ids: string[]) {
  return useQuery({
    queryKey: ["news", "by-ids", ids],
    queryFn: () => newsApi.getNewsByIds(ids),
    enabled: ids.length > 0,
  });
}

export function usePopularNewsQuery() {
  return useQuery({
    queryKey: queryKeys.news.popular(),
    queryFn: () => newsApi.getPopularNews(),
  });
}

export function useAiRecommendedNewsQuery(limit = 4) {
  return useQuery({
    queryKey: [...queryKeys.news.aiRecommended(), limit],
    queryFn: () => newsApi.getAiRecommendedNews(limit),
  });
}

/** Writes `likeCount` into every cached shape (detail object, or list/array responses containing it). */
function patchLikeCountEverywhere(queryClient: QueryClient, newsId: string, likeCount: number) {
  queryClient.setQueryData(queryKeys.news.detail(newsId), (old: News | null | undefined) =>
    old ? { ...old, likeCount } : old
  );
  queryClient.setQueriesData({ queryKey: ["news", "list"] }, (old: NewsListResponse | undefined) =>
    old ? { ...old, items: old.items.map((n) => (n.id === newsId ? { ...n, likeCount } : n)) } : old
  );
  queryClient.setQueriesData({ queryKey: queryKeys.news.popular() }, (old: News[] | undefined) =>
    old?.map((n) => (n.id === newsId ? { ...n, likeCount } : n))
  );
  queryClient.setQueriesData({ queryKey: queryKeys.news.aiRecommended() }, (old: News[] | undefined) =>
    old?.map((n) => (n.id === newsId ? { ...n, likeCount } : n))
  );
}

export function useLikeMutation(newsId: string, currentLikeCount: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) => newsApi.setLike(newsId, liked),
    onMutate: async (liked: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["news"] });
      const optimisticCount = Math.max(0, currentLikeCount + (liked ? 1 : -1));
      patchLikeCountEverywhere(queryClient, newsId, optimisticCount);
      return { previousCount: currentLikeCount };
    },
    onError: (_err, _liked, context) => {
      if (context) patchLikeCountEverywhere(queryClient, newsId, context.previousCount);
    },
    onSuccess: (serverLikeCount) => {
      patchLikeCountEverywhere(queryClient, newsId, serverLikeCount);
    },
  });
}
