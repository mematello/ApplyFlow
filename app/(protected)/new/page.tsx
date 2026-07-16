"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import ResumePreviewModal from "../../../components/ResumePreviewModal";
import { Sparkles } from "lucide-react";

export default function NewApplicationPage() {
  const router = useRouter();
  
  // State
  const [jobDescription, setJobDescription] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<string>>(new Set());

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
    role_fit: "",
    culture_fit: "",
    cover_letter_sent: false,
    raw_jd: "",
  });
  
  const [techInput, setTechInput] = useState("");
  const [resumes, setResumes] = useState<{ id: string, version_label: string, is_current: boolean, extracted_text: string | null }[]>([]);
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);

  const [aiModels, setAiModels] = useState<any[]>([]);
  const [preferredModel, setPreferredModel] = useState<string>("");
  const [activeModelName, setActiveModelName] = useState<string>("");
  const [isUpdatingModel, setIsUpdatingModel] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchResumes = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('resumes')
        .select('id, version_label, is_current, extracted_text')
        .eq('user_id', user.id);
        
      if (data) {
        setResumes(data);
        const current = data.find(r => r.is_current);
        if (current) {
          setFormData(prev => ({ ...prev, resume_version: current.version_label }));
        }
      }
    };
    
    const fetchActiveModel = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          const { data: modelsData, preferredModel: prefModel } = data;
          
          setAiModels(modelsData);
          setPreferredModel(prefModel);
          
          const orderedModels = [
            ...modelsData.filter((m: any) => m.name === prefModel),
            ...modelsData.filter((m: any) => m.name !== prefModel)
          ];
          const active = orderedModels.find((m: any) => {
            const mb = m.blocked_until && new Date(m.blocked_until) > new Date();
            const me = m.request_count >= m.dailyLimit;
            return !mb && !me;
          });
          
          if (active) {
            setActiveModelName(active.name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch active model", err);
      }
    };
    
    fetchResumes();
    fetchActiveModel();
  }, []);

  const handleModelChange = async (newModel: string) => {
    setPreferredModel(newModel);
    setIsUpdatingModel(true);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ preferred_model: newModel }).eq('id', user.id);
      }
      
      const orderedModels = [
        ...aiModels.filter((m: any) => m.name === newModel),
        ...aiModels.filter((m: any) => m.name !== newModel)
      ];
      const active = orderedModels.find((m: any) => {
        const mb = m.blocked_until && new Date(m.blocked_until) > new Date();
        const me = m.request_count >= m.dailyLimit;
        return !mb && !me;
      });
      if (active) {
        setActiveModelName(active.name);
      }
    } catch (err) {
      console.error("Failed to update preferred model", err);
    } finally {
      setIsUpdatingModel(false);
    }
  };

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
        if (res.status === 429) {
          if (data.error === 'all_models_exhausted') {
             const min = Math.ceil((data.retryAfterSeconds || 60) / 60);
             throw new Error(`All AI models are currently at capacity. Please try again after ${min} minute${min !== 1 ? 's' : ''}.`);
          } else if (data.error === 'quota_exceeded') {
             const min = Math.ceil((data.retryAfterSeconds || 60) / 60);
             throw new Error(`Daily limit reached for ${data.model || 'model'}. Try again in ${min} minute${min !== 1 ? 's' : ''}.`);
          }
        }
        throw new Error((data.error || "Failed to extract data") + (data.details ? `\nDetails: ${JSON.stringify(data.details)}` : ""));
      }
      
      // Update active model name if API fallback happened
      if (data.model_used) {
        setActiveModelName(data.model_used);
      }
      
      // The API returns the parsed schema inside a `data` envelope
      const extracted = data.data || data; 
      
      // Extraction completed successfully
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
      setIsExtracting(false);

      // Run match phase if current resume text exists
      const currentResume = resumes.find(r => r.is_current);
      if (currentResume && currentResume.extracted_text) {
        setToast({ message: "Extraction complete! Analyzing fit with your resume...", type: 'success' });
        setIsMatching(true);
        try {
          const matchRes = await fetch("/api/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescription, resumeText: currentResume.extracted_text })
          });
          const matchData = await matchRes.json();
          if (matchData.model_used) {
            setActiveModelName(matchData.model_used);
          }

          if (matchRes.ok && matchData.data) {
            const m = matchData.data;
            const newSuggested = new Set<string>();

            let newNotes = extracted.notes || "";
            if (m.notes) {
              newNotes += newNotes ? `\n\n${m.notes}` : m.notes;
            }

            setFormData(prev => {
              const updated = { ...prev };
              if (m.role_fit !== null) { updated.role_fit = String(m.role_fit); newSuggested.add("role_fit"); }
              if (m.culture_fit !== null) { updated.culture_fit = String(m.culture_fit); newSuggested.add("culture_fit"); }
              if (m.priority !== null) { updated.priority = m.priority; newSuggested.add("priority"); }
              if (newNotes !== prev.notes) { updated.notes = newNotes; newSuggested.add("notes"); }
              return updated;
            });
            
            setAiSuggestedFields(newSuggested);
            setToast({ message: "Extraction & Match Analysis complete!", type: 'success' });
          } else {
             if (matchRes.status === 429) {
               if (matchData.error === 'all_models_exhausted') {
                 const min = Math.ceil((matchData.retryAfterSeconds || 60) / 60);
                 setToast({ message: `Extraction complete! (All AI models are at capacity. Try again in ${min} min.)`, type: 'error' });
               } else if (matchData.error === 'quota_exceeded') {
                 const min = Math.ceil((matchData.retryAfterSeconds || 60) / 60);
                 setToast({ message: `Extraction complete! (Daily limit reached for ${matchData.model || 'model'}. Try again in ${min} min.)`, type: 'error' });
               }
             } else {
               setToast({ message: "Extraction complete! (Match analysis failed)", type: 'error' });
             }
          }
        } catch (matchErr) {
          console.error("Match error:", matchErr);
          setToast({ message: "Extraction complete! (Match analysis failed)", type: 'error' });
        } finally {
          setIsMatching(false);
        }
      } else {
         // No resume to match against
         setToast({ message: "Extraction complete!", type: 'success' });
      }

    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
      setIsExtracting(false); // Ensure it's reset on error
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
        role_fit: formData.role_fit ? parseInt(String(formData.role_fit)) : null,
        culture_fit: formData.culture_fit ? parseInt(String(formData.culture_fit)) : null,
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
    
    if (aiSuggestedFields.has(name)) {
      setAiSuggestedFields(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }

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
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                disabled={isUpdatingModel}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {preferredModel || "Select Model"}
                <svg className={`w-4 h-4 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isModelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsModelDropdownOpen(false)}></div>
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 z-20 overflow-hidden transform origin-bottom-left transition-all">
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Select AI Engine
                      </div>
                      {aiModels.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
                      ) : (
                        aiModels.map((m: any) => {
                          const isBlocked = m.blocked_until && new Date(m.blocked_until) > new Date();
                          const isExhausted = m.request_count >= m.dailyLimit;
                          const unavailable = isBlocked || isExhausted;
                          const isSelected = preferredModel === m.name;
                          
                          return (
                            <button
                              key={m.name}
                              type="button"
                              disabled={unavailable}
                              onClick={() => {
                                handleModelChange(m.name);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
                                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50'}
                                ${unavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{m.name}</span>
                                <span className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                  {unavailable ? (isBlocked ? 'Temporarily Blocked' : 'Daily Limit Reached') : `${m.request_count}/${m.dailyLimit} requests used`}
                                </span>
                              </div>
                              {isSelected && <Sparkles className="w-4 h-4" />}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {activeModelName && activeModelName !== preferredModel && (
              <span className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded border border-amber-200 dark:border-amber-900/50">
                Falling back to {activeModelName}
              </span>
            )}
          </div>
          
          <div className="flex justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            {isMatching && (
              <div className="px-4 py-2 text-blue-600 dark:text-blue-400 font-medium animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Analyzing fit...
              </div>
            )}
            <button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || isMatching || !jobDescription.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExtracting ? "Extracting with AI..." : isMatching ? "Analyzing fit..." : "✨ Extract Data"}
            </button>
          </div>
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
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">
                Priority
                {aiSuggestedFields.has('priority') && <Sparkles className="w-3 h-3 text-blue-500 inline ml-1" title="AI suggested" />}
              </label>
              <select name="priority" value={formData.priority} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-white dark:bg-zinc-900 border ${aiSuggestedFields.has('priority') ? 'border-blue-400 dark:border-blue-500' : 'border-gray-300 dark:border-zinc-700'} focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100 transition-colors`}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">
                  Role Fit (1-5)
                  {aiSuggestedFields.has('role_fit') && <Sparkles className="w-3 h-3 text-blue-500 inline ml-1" title="AI suggested" />}
                </label>
                <input type="number" min="1" max="5" name="role_fit" value={formData.role_fit} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-white dark:bg-zinc-900 border ${aiSuggestedFields.has('role_fit') ? 'border-blue-400 dark:border-blue-500' : 'border-gray-300 dark:border-zinc-700'} focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100 transition-colors`} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">
                  Culture Fit (1-5)
                  {aiSuggestedFields.has('culture_fit') && <Sparkles className="w-3 h-3 text-blue-500 inline ml-1" title="AI suggested" />}
                </label>
                <input type="number" min="1" max="5" name="culture_fit" value={formData.culture_fit} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-white dark:bg-zinc-900 border ${aiSuggestedFields.has('culture_fit') ? 'border-blue-400 dark:border-blue-500' : 'border-gray-300 dark:border-zinc-700'} focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100 transition-colors`} />
              </div>
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
              <div className="flex gap-2">
                <input type="text" name="resume_version" value={formData.resume_version} onChange={handleInputChange} className="flex-1 p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
                {resumes.find(r => r.version_label === formData.resume_version) && (
                  <button type="button" onClick={() => setPreviewResumeId(resumes.find(r => r.version_label === formData.resume_version)!.id)} className="px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded border border-gray-300 dark:border-zinc-700 text-sm font-medium transition-colors">
                    Preview
                  </button>
                )}
              </div>
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
            <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">
              Notes
              {aiSuggestedFields.has('notes') && <Sparkles className="w-3 h-3 text-blue-500 inline ml-1" title="AI suggested" />}
            </label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} className={`w-full p-2 rounded-md bg-white dark:bg-zinc-900 border ${aiSuggestedFields.has('notes') ? 'border-blue-400 dark:border-blue-500' : 'border-gray-300 dark:border-zinc-700'} focus:ring-2 focus:ring-blue-500 outline-none h-48 text-gray-900 dark:text-zinc-100 transition-colors`} />
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

      <ResumePreviewModal resumeId={previewResumeId} onClose={() => setPreviewResumeId(null)} />
    </div>
  );
}
