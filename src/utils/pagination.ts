export interface PaginationParams {
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function applyPagination<T>(items: T[], params: PaginationParams): PaginationResult<T> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  if (page > totalPages && totalItems > 0) {
    throw new Error(
      `Page ${page} exceeds total pages (${totalPages}). Please use a page number between 1 and ${totalPages}.`
    );
  }

  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    page,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}

export function formatPaginationMessage(
  result: PaginationResult<any>,
  prefix: string,
  suffix?: string
): string {
  const parts = [
    `${prefix} ${result.totalItems} items`,
    `(showing page ${result.page}/${result.totalPages}`,
    `${result.items.length} items`,
  ];

  if (suffix) {
    parts.push(suffix);
  }

  return parts.join(parts.length > 3 ? ', ' : ' ') + ')';
}
