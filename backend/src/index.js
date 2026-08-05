require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const roadmapRoutes = require('./routes/roadmap.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const workoutRoutes = require('./routes/workout.routes');
const supplementsRoutes = require('./routes/supplements.routes');
const habitsRoutes = require('./routes/habits.routes');
const financeRoutes = require('./routes/finance.routes');
const resourcesRoutes = require('./routes/resources.routes');
const checklistRoutes = require('./routes/checklist.routes');
const settingsRoutes = require('./routes/settings.routes');
const dataRoutes = require('./routes/data.routes');
const searchRoutes = require('./routes/search.routes');
const summaryRoutes = require('./routes/summary.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(morgan('dev'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/roadmap', roadmapRoutes);
app.use('/api/v1/schedule', scheduleRoutes);
app.use('/api/v1/workout', workoutRoutes);
app.use('/api/v1/supplements', supplementsRoutes);
app.use('/api/v1/habits', habitsRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/resources', resourcesRoutes);
app.use('/api/v1/checklist', checklistRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/data', dataRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/summary', summaryRoutes);

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Moein Dashboard API running on port ${PORT}`);
});

module.exports = app;
