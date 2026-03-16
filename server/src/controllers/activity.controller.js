const { listProjectActivities } = require("../services/activity.service");
const catchAsync = require("../utils/catchAsync");

// ---------------------------------------------------------------------------
// GET /api/projects/:projectId/activities?page=1&limit=20
// ---------------------------------------------------------------------------
const getProjectActivities = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { page, limit } = req.query;

  const result = await listProjectActivities(
    projectId,
    req.user,
    page,
    limit
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

// ---------------------------------------------------------------------------
// Exports — name must match what the route file references
// ---------------------------------------------------------------------------
module.exports = {
  getProjectActivities,
};
