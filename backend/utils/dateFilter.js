const getDateRange = (range) => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  let start;

  switch (range) {
    case "daily":
      start = startOfToday;
      break;
    case "weekly":
      // Sunday 00:00 of this week (don't mutate `now`, keep midnight)
      start = new Date(startOfToday);
      start.setDate(startOfToday.getDate() - startOfToday.getDay());
      break;
    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "yearly":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1); // default monthly
  }

  // End of today: entries saved with a later time today (e.g. 12:00) must count
  const end = new Date(startOfToday);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export default getDateRange;
