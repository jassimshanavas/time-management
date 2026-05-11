import type { Goal } from '@/types';

type GoalProjectShape = Pick<Goal, 'projectId' | 'projectIds'>;

export const getGoalProjectIds = (goal: GoalProjectShape) => {
  if (goal.projectIds && goal.projectIds.length > 0) {
    return Array.from(new Set(goal.projectIds.filter(Boolean)));
  }

  return goal.projectId ? [goal.projectId] : [];
};

export const goalMatchesProject = (goal: GoalProjectShape, projectId: string) =>
  getGoalProjectIds(goal).includes(projectId);

export const isPersonalGoal = (goal: GoalProjectShape) => getGoalProjectIds(goal).length === 0;
