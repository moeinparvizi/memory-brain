function phaseProgress(phase) {
  if (!phase.tasks?.length) return phase.progress;
  return Math.round(phase.tasks.filter(task => task.done).length / phase.tasks.length * 100);
}

module.exports = phaseProgress;
