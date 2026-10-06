import React from 'react';

interface PageShellProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageShell({ actions, children }: PageShellProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <main className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
        {actions && (
          <div className="flex items-center gap-3 flex-wrap mb-4 flex-shrink-0 no-print">
            {actions}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}