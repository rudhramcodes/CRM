const paginate = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  let sort = { createdAt: -1 };
  if (query.sortBy) {
    const order = query.sortOrder === 'asc' ? 1 : -1;
    sort = { [query.sortBy]: order };
  }

  return { page, limit, skip, sort };
};

export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getPaginationMeta = (total, page, limit) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

export default paginate;
