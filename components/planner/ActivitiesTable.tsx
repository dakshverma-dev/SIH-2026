import type { ScheduleActivity } from '@/lib/types';

export function ActivitiesTable({ activities }: { activities: ScheduleActivity[] }) {
  return (
    <div className="overflow-x-auto rounded-[12px] bg-pure-white p-6">
      <table className="w-full text-left font-sans text-sm">
        <thead>
          <tr className="border-b border-fog text-moss-shadow">
            <th className="py-2 pr-4 font-mono text-xs uppercase">WBS</th>
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4">Planned</th>
            <th className="py-2 pr-4">Progress</th>
            <th className="py-2 pr-4">Dependencies</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr
              key={activity.id}
              data-critical-path={activity.isCriticalPath}
              className={
                activity.isCriticalPath
                  ? 'border-b border-fog bg-teal-accent/5'
                  : 'border-b border-fog'
              }
            >
              <td className="py-3 pr-4 font-mono text-xs">{activity.wbsCode}</td>
              <td className="py-3 pr-4">{activity.description}</td>
              <td className="py-3 pr-4 text-moss-shadow">
                {activity.plannedStart} &rarr; {activity.plannedFinish}
              </td>
              <td className="py-3 pr-4">
                <div className="h-2 w-32 overflow-hidden rounded-[4px] bg-fog">
                  <div
                    className="h-full bg-teal-accent"
                    style={{ width: `${activity.currentProgressPercent}%` }}
                  />
                </div>
              </td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-1">
                  {activity.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="rounded-[4px] bg-fog/50 px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
