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
    <div className="max-w-4xl mx-auto p-8 text-zinc-100">
      <h1 className="text-3xl font-bold mb-8">New Job Application</h1>

      {toast && (
        <div className={`mb-6 p-4 rounded-md text-sm font-medium ${toast.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-800' : 'bg-red-900/50 text-red-200 border border-red-800'}`}>
          {toast.message}
        </div>
      )}

      {/* Extraction Section */}
      <div className="mb-10 bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Paste Job Description</label>
        <textarea
          className="w-full h-40 p-3 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-500"
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
      <form onSubmit={handleSave} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-zinc-800 pb-4">Application Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Company Name</label>
              <input required type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Role</label>
              <input required type="text" name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Salary Range</label>
              <input type="text" name="salary_range" value={formData.salary_range} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Job Link</label>
              <input type="url" name="job_link" value={formData.job_link} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Source (e.g. LinkedIn)</label>
              <input type="text" name="source" value={formData.source} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none">
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
              <label className="block text-sm text-zinc-400 mb-1">Date Applied</label>
              <input type="date" name="date_applied" value={formData.date_applied} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Recruiter Name</label>
              <input type="text" name="recruiter_name" value={formData.recruiter_name} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Contact Info</label>
              <input type="text" name="contact_info" value={formData.contact_info} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Resume Version</label>
              <input type="text" name="resume_version" value={formData.resume_version} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Full width elements */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tech Stack</label>
            <div className="p-2 min-h-[42px] rounded-md bg-zinc-800 border border-zinc-700 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-blue-500">
              {formData.tech_stack.map((tech, idx) => (
                <span key={idx} className="bg-zinc-700 text-sm px-2 py-1 rounded flex items-center gap-1">
                  {tech}
                  <button type="button" onClick={() => removeTech(tech)} className="text-zinc-400 hover:text-white">&times;</button>
                </span>
              ))}
              <input
                type="text"
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={handleTechKeyDown}
                placeholder="Type and press Enter or comma..."
                className="bg-transparent border-none outline-none flex-1 text-sm min-w-[150px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none h-24" />
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
            <input type="checkbox" id="cover_letter_sent" name="cover_letter_sent" checked={formData.cover_letter_sent} onChange={handleInputChange} className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="cover_letter_sent" className="text-sm text-zinc-300">Cover Letter Sent</label>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Application"}
          </button>
        </div>
      </form>
    </div>
  );
}
