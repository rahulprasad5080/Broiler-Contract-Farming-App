import type { ListResponse } from "./types";

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<ListResponse<T>>,
  limit = 100,
) {
  const firstPage = await fetchPage(1, limit);
  const totalPages = Math.max(1, firstPage.meta.totalPages || 1);

  if (totalPages === 1) {
    return firstPage;
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2, limit)),
  );

  return {
    data: [firstPage.data, ...rest.map((page) => page.data)].flat(),
    meta: {
      ...firstPage.meta,
      page: 1,
      limit: firstPage.meta.total,
      total: firstPage.meta.total,
      totalPages: 1,
    },
  } as ListResponse<T>;
}
