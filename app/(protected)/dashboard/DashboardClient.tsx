"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';

import { Application } from '../../../lib/types';
import { fetchApplications, updateApplicationStatus } from '../../../lib/data-source';

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  applied: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  screening: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  interview: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  offer: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  ghosted: "bg-gray-200 text-gray-600 border-gray-300 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600",
};

export default function DashboardClient({ initialApplications, isLocal }: { initialApplications: Application[], isLocal?: boolean }) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [filter, setFilter] = useState<string>("Active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState<boolean>(false); // false = descending by default
  const [isLoading, setIsLoading] = useState<boolean>(isLocal === true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    const savedPageSize = localStorage.getItem('dashboard_page_size');
    if (savedPageSize) {
      setPageSize(Number(savedPageSize));
    }
  }, []);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = Number(e.target.value);
    setPageSize(size);
    setCurrentPage(1);
    localStorage.setItem('dashboard_page_size', size.toString());
  };

  useEffect(() => {
    if (isLocal) {
      fetchApplications(null)
        .then(data => {
          setApplications(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load local applications', err);
          setIsLoading(false);
        });
    }
  }, [isLocal]);

  const isUpdatingRef = useRef<Set<string>>(new Set());

  const handleStatusChange = async (id: string, newStatus: string, e: React.ChangeEvent) => {
    e.stopPropagation(); // prevent row click navigation when modifying status
    
    if (isUpdatingRef.current.has(id)) return;
    
    // Find old status for rollback
    const appIndex = applications.findIndex(app => app.id === id);
    if (appIndex === -1) return;
    const oldStatus = applications[appIndex].status;

    isUpdatingRef.current.add(id);

    // 1. Optimistic UI Update (immediate visual feedback)
    setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));

    // 2. Background API Call
    try {
      // In local mode, user is null. We simulate passing user or null to the abstraction.
      // Since this is a client component, we pass null if isLocal is true, otherwise fake a user object just to let data-source know we are authenticated (since data-source.ts just checks if user exists).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dummyUser = isLocal ? null : { id: 'auth' } as any; 
      await updateApplicationStatus(dummyUser, id, newStatus);
    } catch (err) {
      console.error(err);
      // 3. Rollback on failure!
      alert("Failed to save status update. Reverting change.");
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status: oldStatus } : app));
    } finally {
      isUpdatingRef.current.delete(id);
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

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading your applications...</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {isLocal && (
          <div className="w-full max-w-2xl mb-8 p-4 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 rounded-lg text-sm text-left">
            <strong>You are in local mode.</strong> Data is saved to this device only and will be lost if you clear your browser data. <Link href="/signup" className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-300">Sign up to cloud sync</Link>.
          </div>
        )}
        <h2 className="text-2xl font-bold mb-4">No applications yet</h2>
        <p className="text-gray-600 dark:text-zinc-400 mb-8 max-w-md">
          You haven&apos;t tracked any job applications yet. Paste your first job description to get started!
        </p>
        <Link href="/new" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-sm">
          Track New Application
        </Link>
      </div>
    );
  }

  // Derived state: Filter (Status + Search)
  let filteredApps = applications;
  if (filter === "Active") {
    filteredApps = filteredApps.filter(a => !['rejected', 'withdrawn', 'ghosted'].includes(a.status));
  } else if (filter !== "All") {
    filteredApps = filteredApps.filter(a => a.status === filter);
  }
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filteredApps = filteredApps.filter(a => 
      (a.company_name?.toLowerCase().includes(q)) || 
      (a.role?.toLowerCase().includes(q))
    );
  }
  
  // Derived state: Sort
  const sortedApps = [...filteredApps].sort((a, b) => {
    let valA = a[sortField as keyof Application];
    let valB = b[sortField as keyof Application];

    if (sortField === 'priority') {
      const pmap: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1, 'null': 0, '': 0 };
      valA = pmap[String(valA)] || 0;
      valB = pmap[String(valB)] || 0;
    } else if (sortField === 'company_name' || sortField === 'role') {
      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();
    } else {
      valA = String(valA || "");
      valB = String(valB || "");
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;

    // Fallback sort
    const createA = String(a.created_at || "");
    const createB = String(b.created_at || "");
    if (createA < createB) return 1;
    if (createA > createB) return -1;
    
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedApps.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedApps = sortedApps.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="w-4 h-4 inline-block opacity-0 group-hover:opacity-30 transition-opacity"><ChevronDown className="w-4 h-4" /></span>;
    return (
      <span className="w-4 h-4 inline-block text-gray-900 dark:text-zinc-200">
        {sortAsc ? <ChevronUp className="w-4 h-4 animate-in fade-in zoom-in duration-200" /> : <ChevronDown className="w-4 h-4 animate-in fade-in zoom-in duration-200" />}
      </span>
    );
  };

  return (
    <div>
      {isLocal && (
        <div className="mb-6 p-4 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 rounded-lg text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <span><strong>You are in local mode.</strong> Data is saved to this device only and will be lost if you clear your browser data.</span>
          <Link href="/signup" className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-300 whitespace-nowrap min-h-[44px] sm:min-h-0 flex items-center">Sign up to cloud sync</Link>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search company or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-colors shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar items-center">
          {['Active', 'All'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                filter === status ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {status}
            </button>
          ))}
          
          <div className="relative">
            <select
              value={['Active', 'All'].includes(filter) ? "" : filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`appearance-none pl-4 pr-10 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${
                !['Active', 'All'].includes(filter) 
                  ? 'bg-gray-900 text-white border border-transparent dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <option value="" disabled className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">Filter by status</option>
              {['draft', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn', 'ghosted'].map(status => (
                <option key={status} value={status} className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDown className={`w-4 h-4 transition-colors ${!['Active', 'All'].includes(filter) ? 'text-gray-300 dark:text-zinc-600' : 'text-gray-400 dark:text-zinc-500'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm md:overflow-x-auto">
        <table className="w-full text-left border-collapse block md:table min-w-full md:min-w-[800px]">
          <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 hidden md:table-header-group">
            <tr>
              <th 
                className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 select-none transition-colors group whitespace-nowrap"
                onClick={() => handleSort('company_name')}
              >
                <div className="flex items-center gap-1">Company <SortIcon field="company_name" /></div>
              </th>
              <th 
                className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 select-none transition-colors group whitespace-nowrap"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-1">Role <SortIcon field="role" /></div>
              </th>
              <th className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 whitespace-nowrap">Status</th>
              <th 
                className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 select-none transition-colors group whitespace-nowrap"
                onClick={() => handleSort('date_applied')}
              >
                <div className="flex items-center gap-1">Date Applied <SortIcon field="date_applied" /></div>
              </th>
              <th 
                className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 select-none transition-colors group whitespace-nowrap"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">Priority <SortIcon field="priority" /></div>
              </th>
              <th className="p-4 text-sm font-medium text-gray-500 dark:text-zinc-400 whitespace-nowrap">Next Action Date</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group divide-y divide-gray-100 dark:divide-zinc-800">
            {paginatedApps.map(app => (
              <tr 
                key={app.id} 
                onClick={() => handleRowClick(app.id)}
                className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all duration-150 cursor-pointer group animate-in fade-in flex flex-col md:table-row p-4 md:p-0 border-b md:border-b-0 border-gray-100 dark:border-zinc-800 last:border-0"
              >
                <td className="md:p-4 font-medium text-gray-900 dark:text-zinc-100 text-lg md:text-base block md:table-cell mb-1 md:mb-0">
                  {app.company_name}
                </td>
                <td className="md:p-4 text-gray-600 dark:text-zinc-300 block md:table-cell mb-3 md:mb-0">
                  {app.role}
                </td>
                <td className="md:p-4 block md:table-cell mb-3 md:mb-0">
                  {/* Status Dropdown masquerading as a colored badge */}
                  <div className={`inline-flex items-center rounded-full text-xs font-semibold select-none border ${STATUS_COLORS[app.status]}`}>
                    <select
                      value={app.status}
                      onClick={(e) => e.stopPropagation()} // Prevent row click
                      onChange={(e) => handleStatusChange(app.id, e.target.value, e)}
                      className="bg-transparent appearance-none border-none outline-none cursor-pointer pl-3 pr-8 py-1.5 focus:ring-0 font-medium"
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
                      <option className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100" value="ghosted">Ghosted</option>
                    </select>
                  </div>
                </td>
                <td className="md:p-4 text-gray-500 dark:text-zinc-400 block md:table-cell text-sm md:text-base mb-1 md:mb-0">
                  <span className="md:hidden font-medium text-gray-700 dark:text-zinc-300 mr-2">Applied:</span>
                  {app.date_applied || "—"}
                </td>
                <td className="md:p-4 block md:table-cell mb-2 md:mb-0">
                  <div className="flex items-center">
                    <span className="md:hidden font-medium text-gray-700 dark:text-zinc-300 mr-2 text-sm">Priority:</span>
                    {app.priority ? (
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                        app.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                        app.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' :
                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                      }`}>
                        {app.priority.toUpperCase()}
                      </span>
                    ) : <span className="text-gray-500 md:hidden">—</span>}
                    {!app.priority && <span className="hidden md:inline text-gray-500">—</span>}
                  </div>
                </td>
                <td className="md:p-4 text-gray-500 dark:text-zinc-400 block md:table-cell text-sm md:text-base">
                  <span className="md:hidden font-medium text-gray-700 dark:text-zinc-300 mr-2">Next Action:</span>
                  {app.next_action_date || "—"}
                </td>
              </tr>
            ))}
            {sortedApps.length === 0 && (
              <tr className="animate-in fade-in block md:table-row">
                <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-zinc-400 block md:table-cell">
                  {searchQuery ? "No applications found matching your search and filter." : "No applications match the current filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {sortedApps.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
            <div className="flex items-center gap-2 mb-4 sm:mb-0">
              <span className="text-sm text-gray-600 dark:text-zinc-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1.5"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-zinc-400">
              <span>Page {safeCurrentPage} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
