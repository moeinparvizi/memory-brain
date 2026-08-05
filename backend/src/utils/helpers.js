const getCurrentJalaliMonth = () => {
  const now = new Date();
  const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
  }).format(now);
  return jalaliDate.replace('/', '-');
};

const getWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - ((dayOfWeek + 1) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const paginate = (queryArgs, page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return {
    ...queryArgs,
    skip: (p - 1) * l,
    take: l,
  };
};

module.exports = { getCurrentJalaliMonth, getWeekRange, paginate };
