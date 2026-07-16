"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewApplicationPage() {
  const router = useRouter();
  
  // State
  const [jobDescription, setJobDescription] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    company_name: "",
    role: "",
    tech_stack: [] as string[],
    salary_range: "",
    location: "",
    source: "",
    recruiter_name: "",
    contact_info: "",
    notes: "",
    date_applied: new Date().toISOString().split('T')[0],
    status: "draft",
    job_link: "",
    priority: "",
    resume_version: "",
    cover_letter_sent: false,
    raw_jd: "",
  });
  
  const [techInput, setTechInput] = useState("");

  const handleExtract = async () => {
    if (!jobDescription) return;
    setIsExtracting(true);
    setToast(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error((data.error || "Failed to extract data") + (data.details ? `\nDetails: ${JSON.stringify(data.details)}` : ""));
      }
      
      // The API returns the parsed schema inside a `data` envelope
      const extracted = data.data || data; 
      
      setFormData(prev => ({
        ...prev,
        company_name: extracted.company_name || "",
        role: extracted.role || "",
        tech_stack: extracted.tech_stack || [],
        salary_range: extracted.salary_range || "",
        location: extracted.location || "",
        source: extracted.source || "",
        recruiter_name: extracted.recruiter_name || "",
        contact_info: extracted.contact_info || "",
        notes: extracted.notes || "",
        raw_jd: jobDescription
      }));
      setToast({ message: "Extraction complete!", type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToast(null);
    try {
      const payload = {
        ...formData,
        // Nullify empty strings for priority since it's an optional enum
        priority: formData.priority || null,
        raw_jd: jobDescription, // Ensure raw_jd is included
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to save application");
      }
      
      setToast({ message: "Application saved successfully!", type: 'success' });
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handlers for dynamic state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTechKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = techInput.trim();
      if (val && !formData.tech_stack.includes(val)) {
        setFormData(prev => ({ ...prev, tech_stack: [...prev.tech_stack, val] }));
      }
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      tech_stack: prev.tech_stack.filter(t => t !== tech)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-8 text-gray-900 dark:text-zinc-100">
      <h1 className="text-3xl font-bold mb-8">New Job Application</h1>

      {toast && (
        <div className={`mb-6 p-4 rounded-md text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {/* Extraction Section */}
      <div className="mb-10 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Paste Job Description</label>
        <textarea
          className="w-full h-40 p-3 rounded-md bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:text-zinc-500"
          placeholder="Paste the full job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || !jobDescription.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExtracting ? "Extracting with AI..." : "✨ Extract Data"}
          </button>
        </div>
      </div>

      {/* Manual & Extracted Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4 text-gray-900 dark:text-zinc-100">Application Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Company Name</label>
              <input required type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Role</label>
              <input required type="text" name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Salary Range</label>
              <input type="text" name="salary_range" value={formData.salary_range} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600 dark:text-zinc-400">Job Link</label>
                {formData.job_link && (
                  <a href={formData.job_link.startsWith('http') ? formData.job_link : `https://${formData.job_link}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    Open <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  </a>
                )}
              </div>
              <input type="url" name="job_link" value={formData.job_link} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Source (e.g. LinkedIn)</label>
              <input type="text" name="source" value={formData.source} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100">
                <option value="draft">Draft</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Date Applied</label>
              <input type="date" name="date_applied" value={formData.date_applied} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100">
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Recruiter Name</label>
              <input type="text" name="recruiter_name" value={formData.recruiter_name} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Contact Info</label>
              <input type="text" name="contact_info" value={formData.contact_info} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Resume Version</label>
              <input type="text" name="resume_version" value={formData.resume_version} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
            </div>
          </div>
        </div>

        {/* Full width elements */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Tech Stack</label>
            <div className="p-2 min-h-[42px] rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-blue-500">
              {formData.tech_stack.map((tech, idx) => (
                <span key={idx} className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 text-sm px-2 py-1 rounded flex items-center gap-1">
                  {tech}
                  <button type="button" onClick={() => removeTech(tech)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:text-zinc-100">&times;</button>
                </span>
              ))}
              <input
                type="text"
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={handleTechKeyDown}
                placeholder="Type and press Enter or comma..."
                className="bg-transparent border-none outline-none flex-1 text-sm min-w-[150px] text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none h-24 text-gray-900 dark:text-zinc-100" />
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <input type="checkbox" id="cover_letter_sent" name="cover_letter_sent" checked={formData.cover_letter_sent} onChange={handleInputChange} className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="cover_letter_sent" className="text-sm text-gray-700 dark:text-zinc-300">Cover Letter Sent</label>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSaving ? "Saving..." : "Save Application"}
          </button>
        </div>
      </form>
    </div>
  );
}
