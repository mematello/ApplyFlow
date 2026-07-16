"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Application = any; // Will use any for now to flexibly map from db schema

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  applied: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  screening: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  interview: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  offer: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

export default function DashboardClient({ initialApplications }: { initialApplications: Application[] }) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [filter, setFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<string>("date_applied");
  const [sortAsc, setSortAsc] = useState<boolean>(false); // false = descending by default

  const handleStatusChange = async (id: string, newStatus: string, e: React.ChangeEvent) => {
    e.stopPropagation(); // prevent row click navigation when modifying status
    
    // Find old status for rollback
    const appIndex = applications.findIndex(app => app.id === id);
    if (appIndex === -1) return;
    const oldStatus = applications[appIndex].status;

    // 1. Optimistic UI Update (immediate visual feedback)
    setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));

    // 2. Background API Call
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      
    } catch (err) {
      console.error(err);
      // 3. Rollback on failure!
      alert("Failed to save status update. Reverting change.");
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status: oldStatus } : app));
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/applications/${id}`); // Placeholder route as requested
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc); // toggle
    } else {
      setSortField(field);
      setSortAsc(false); // default desc for new fields
    }
  };

  // Derived state: Filter
  const filteredApps = filter === "All" ? applications : applications.filter(a => a.status === filter);
  
  // Derived state: Sort
  const sortedApps = [...filteredApps].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'priority') {
      const pmap: any = { 'high': 3, 'medium': 2, 'low': 1, null: 0, '': 0 };
      valA = pmap[valA] || 0;
      valB = pmap[valB] || 0;
    } else {
      valA = valA || "";
      valB = valB || "";
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['All', 'draft', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
            <tr>
              <th className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400">Company</th>
              <th className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400">Role</th>
              <th className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400">Status</th>
              <th 
                className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 select-none transition-colors"
                onClick={() => handleSort('date_applied')}
              >
                Date Applied {sortField === 'date_applied' && (sortAsc ? '↑' : '↓')}
              </th>
              <th 
                className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 select-none transition-colors"
                onClick={() => handleSort('priority')}
              >
                Priority {sortField === 'priority' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400">Next Action Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {sortedApps.map(app => (
              <tr 
                key={app.id} 
                onClick={() => handleRowClick(app.id)}
                className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
              >
                <td className="p-4 font-medium text-gray-900 dark:text-zinc-100">{app.company_name}</td>
                <td className="p-4 text-gray-600 dark:text-zinc-300">{app.role}</td>
                <td className="p-4">
                  {/* Status Dropdown masquerading as a colored badge */}
                  <div className={`inline-flex items-center rounded-full text-xs font-semibold select-none border ${STATUS_COLORS[app.status]}`}>
                    <select
                      value={app.status}
                      onClick={(e) => e.stopPropagation()} // Prevent row click
                      onChange={(e) => handleStatusChange(app.id, e.target.value, e)}
                      className="bg-transparent appearance-none border-none outline-none cursor-pointer pl-3 pr-8 py-1.5 focus:ring-0 w-full font-medium"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25em 1.25em'
                      }}
                    >
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="draft">Draft</option>
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="applied">Applied</option>
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="screening">Screening</option>
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="interview">Interview</option>
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="offer">Offer</option>
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="rejected">Rejected</option>
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                </td>
                <td className="p-4 text-gray-500 dark:text-zinc-400">{app.date_applied || "—"}</td>
                <td className="p-4">
                  {app.priority ? (
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                      app.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                      app.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' :
                      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                    }`}>
                      {app.priority.toUpperCase()}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-4 text-gray-500 dark:text-zinc-400">{app.next_action_date || "—"}</td>
              </tr>
            ))}
            {sortedApps.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-zinc-400">
                  No applications match the "{filter}" filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
