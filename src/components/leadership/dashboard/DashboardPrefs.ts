/** Dashboard widget IDs */
export const WIDGET_IDS = [
  'myTeams',
  'myTasks',
  'blockedTasks',
  'teamList',
  'myMessages',
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export type MyTasksFilter = 'all' | 'in_progress';

export interface DashboardPrefs {
  widgetIds: WidgetId[];
  myTasksFilter: MyTasksFilter;
}

const STORAGE_KEY = 'ld_dashboard_prefs';

const DEFAULT_PREFS: DashboardPrefs = {
  widgetIds: [...WIDGET_IDS],
  myTasksFilter: 'all',
};

export function getDashboardPrefs(): DashboardPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<DashboardPrefs>;
    const widgetIds = Array.isArray(parsed.widgetIds)
      ? parsed.widgetIds.filter((id): id is WidgetId => WIDGET_IDS.includes(id as WidgetId))
      : DEFAULT_PREFS.widgetIds;
    const myTasksFilter =
      parsed.myTasksFilter === 'in_progress' ? 'in_progress' : 'all';
    return { widgetIds, myTasksFilter };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setDashboardPrefs(prefs: DashboardPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save dashboard prefs:', e);
  }
}

export const WIDGET_LABELS: Record<WidgetId, string> = {
  myTeams: 'My Teams',
  myTasks: 'My Tasks',
  blockedTasks: 'Blocked Tasks',
  teamList: 'Team list',
  myMessages: 'My Messages',
};
