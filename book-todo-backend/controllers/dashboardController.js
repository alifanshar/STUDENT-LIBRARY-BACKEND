const ReadingProgress = require('../models/ReadingProgress');

const dashboardController = {
  async getDashboardData(req, res) {
    try {
      const [stats, recentlyCompleted, currentlyReading] = await Promise.all([
        ReadingProgress.getReadingStats(),
        ReadingProgress.getRecentlyCompleted(5),
        ReadingProgress.getCurrentlyReading()
      ]);

      res.json({
        success: true,
        data: {
          statistics: stats,
          recently_completed: recentlyCompleted,
          currently_reading: currentlyReading
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data',
        error: error.message
      });
    }
  }
};

module.exports = dashboardController;