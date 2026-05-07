// src/utils/pagination.js
// Cursor-based pagination for Prisma.
// Cursor pagination is better than OFFSET because it stays fast
// even with millions of rows (OFFSET scans everything before the page).

function parsePaginationParams(query) {
  const limit = Math.min(parseInt(query.limit, 10) || 20, 100);
  const cursor = query.cursor || null;
  return { limit, cursor };
}

// Builds Prisma take/skip/cursor arguments
function buildCursorQuery(cursor, limit) {
  const query = { take: limit + 1 }; // fetch one extra to know if there's a next page
  if (cursor) {
    query.cursor = { id: cursor };
    query.skip = 1; // skip the cursor itself
  }
  return query;
}

// Takes raw results (limit+1 items), returns data + pagination info
function buildPaginationResult(items, limit) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { data, pagination: { nextCursor, hasMore } };
}

module.exports = { parsePaginationParams, buildCursorQuery, buildPaginationResult };
