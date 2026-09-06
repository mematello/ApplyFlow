"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/client';
import ResumePreviewModal from '../../../../components/ResumePreviewModal';
import { createPortal } from 'react-dom';

import { ArrowLeft, Trash2 } from 'lucide-react';
import { useRef } from 'react';

import { Application } from '../../../../lib/types';
import { updateApplication, deleteApplication, fetchApplicationById } from '../../../../lib/data-source';
import { normalizeTitleCase, normalizeSalaryInput } from '../../../../lib/utils/format';
import { useUnsavedChangesWarning } from '../../../../hooks/useUnsavedChangesWarning';
import UnsavedChangesModal from '../../../../components/UnsavedChangesModal';

export default function ApplicationDetailClient({ initialApplication, isLocal, appId }: { initialApplication: Application | null, isLocal?: boolean, appId?: string }) {
  const router = useRouter();
  
  const [applicationData, setApplicationData] = useState<Application | null>(initialApplication);
  const [isLoading, setIsLoading] = useState(isLocal && !initialApplication);
  
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(isDirty);
  
  const [formData, setFormData] = useState({
    company_name: initialApplication?.company_name || "",
    role: initialApplication?.role || "",
    tech_stack: initialApplication?.tech_stack || [],
    salary_range: initialApplication?.salary_range || "",
    currency: initialApplication?.currency || "PHP",
    location: initialApplication?.location || "",
    source: initialApplication?.source || "",
    job_link: initialApplication?.job_link || "",
    recruiter_name: initialApplication?.recruiter_name || "",
    contact_info: initialApplication?.contact_info || "",
    
    status: initialApplication?.status || "draft",
    priority: initialApplication?.priority || "",
    date_applied: initialApplication?.date_applied || "",
    next_action: initialApplication?.next_action || "",
    next_action_date: initialApplication?.next_action_date || "",
    resume_version: initialApplication?.resume_version || "",
    cover_letter_sent: initialApplication?.cover_letter_sent || false,

    interview_stage: initialApplication?.interview_stage || "",
    interview_notes: initialApplication?.interview_notes || "",
    role_fit: initialApplication?.role_fit || "",
    culture_fit: initialApplication?.culture_fit || "",
    rejection_reason: initialApplication?.rejection_reason || "",
    notes: initialApplication?.notes || "",
    reminder_enabled: initialApplication?.reminder_enabled || false,
  });

  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);

  const [techInput, setTechInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [resumes, setResumes] = useState<{ id: string, version_label: string }[]>([]);
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('resumes')
        .select('id, version_label')
        .eq('user_id', user.id);
        
      if (data) {
        setResumes(data);
      }
    };
    fetchResumes();
  }, []);

  useEffect(() => {
    if (isLocal && !initialApplication && appId) {
      const loadLocalApp = async () => {
        try {
          const app = await fetchApplicationById(null, appId);
          if (app) {
            setApplicationData(app);
            setFormData({
              company_name: app.company_name || "",
              role: app.role || "",
              tech_stack: app.tech_stack || [],
              salary_range: app.salary_range || "",
              currency: app.currency || "PHP",
              location: app.location || "",
              source: app.source || "",
              job_link: app.job_link || "",
              recruiter_name: app.recruiter_name || "",
              contact_info: app.contact_info || "",
              status: app.status || "draft",
              priority: app.priority || "",
              date_applied: app.date_applied || "",
              next_action: app.next_action || "",
              next_action_date: app.next_action_date || "",
              resume_version: app.resume_version || "",
              cover_letter_sent: app.cover_letter_sent || false,
              interview_stage: app.interview_stage || "",
              interview_notes: app.interview_notes || "",
              role_fit: app.role_fit || "",
              culture_fit: app.culture_fit || "",
              rejection_reason: app.rejection_reason || "",
              notes: app.notes || "",
              reminder_enabled: app.reminder_enabled || false,
            });
          }
        } catch (err) {
          console.error("Failed to load local application", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadLocalApp();
    }
  }, [isLocal, initialApplication, appId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setIsDirty(true);
    setToast(null);
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
        setIsDirty(true);
        setToast(null);
        setFormData(prev => ({ ...prev, tech_stack: [...prev.tech_stack, val] }));
      }
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    setIsDirty(true);
    setToast(null);
    setFormData(prev => ({ ...prev, tech_stack: prev.tech_stack.filter((t: string) => t !== tech) }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsDirty(true);
    const { name, value } = e.target;
    if (name === "company_name" || name === "role") {
      setFormData(prev => ({ ...prev, [name]: normalizeTitleCase(value) }));
    }
    if (name === "salary_range") {
      setFormData(prev => ({ ...prev, [name]: normalizeSalaryInput(value) }));
    }
    if (name === "role_fit" || name === "culture_fit") {
      const num = parseInt(value);
      if (!isNaN(num)) {
        const clamped = Math.max(1, Math.min(5, num));
        setFormData(prev => ({ ...prev, [name]: String(clamped) }));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationData?.id) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setToast(null);

    const payload = {
      ...formData,
      priority: formData.priority || null,
      role_fit: formData.role_fit ? parseInt(String(formData.role_fit)) : null,
      culture_fit: formData.culture_fit ? parseInt(String(formData.culture_fit)) : null,
      date_applied: formData.date_applied || null,
      next_action_date: formData.next_action_date || null,
    };

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      await updateApplication(user, applicationData.id, payload);
      
      setIsDirty(false);
      setToast({ message: "Application updated successfully!", type: 'success' });
    } catch (err: unknown) {
      setToast({ message: (err as Error).message, type: 'error' });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const [isDeleteModalMounted, setIsDeleteModalMounted] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const openDeleteModal = () => {
    setIsDeleteModalMounted(true);
    setTimeout(() => setIsDeleteModalVisible(true), 10);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setTimeout(() => setIsDeleteModalMounted(false), 200);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDeleteModal();
    };
    if (isDeleteModalMounted) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDeleteModalMounted]);

  const executeDelete = async () => {
    if (!applicationData?.id) return;
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    setIsDeleting(true);
    closeDeleteModal();
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      await deleteApplication(user, applicationData.id);
      
      setIsDirty(false);
      router.push('/dashboard');
    } catch (err: unknown) {
      setToast({ message: (err as Error).message, type: 'error' });
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  const deleteModalContent = isDeleteModalMounted ? (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isDeleteModalVisible ? 'opacity-100' : 'opacity-0'}`} 
      onClick={closeDeleteModal}
    >
      <div 
        className={`bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm p-6 overflow-hidden flex flex-col transition-all duration-200 ${isDeleteModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} 
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Delete Application</h3>
        <p className="text-gray-600 dark:text-zinc-400 mb-6">Are you sure you want to delete this application? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={closeDeleteModal}
            className="px-4 py-2 text-gray-700 dark:text-zinc-300 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={executeDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (isLoading) {
    return <div className="max-w-5xl mx-auto p-4 md:p-8 flex justify-center py-20 text-gray-500">Loading application details...</div>;
  }

  if (!applicationData) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 text-center py-20">
        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-4">Application Not Found</h2>
        <Link href="/dashboard" className="text-blue-600 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 text-gray-900 dark:text-zinc-100 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-2 flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">{formData.role} at {formData.company_name}</h1>
        </div>
        <button
          type="button"
          onClick={openDeleteModal}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {toast && (
        <div className={`mb-6 p-4 rounded-md text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Extracted Fields */}
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Extracted Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Company Name</label><input required type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} onBlur={handleBlur} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Role</label><input required type="text" name="role" value={formData.role} onChange={handleInputChange} onBlur={handleBlur} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Salary Range</label>
              <div className="flex gap-2">
                <select name="currency" value={formData.currency} onChange={handleInputChange} className="w-24 p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100">
                  <option value="PHP">PHP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                  <option value="SGD">SGD</option>
                  <option value="JPY">JPY</option>
                  <option value="INR">INR</option>
                  <option value="AED">AED</option>
                </select>
                <input type="text" name="salary_range" value={formData.salary_range || ''} onChange={handleInputChange} onBlur={handleBlur} className="flex-1 min-w-0 p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
              </div>
            </div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Location</label><input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
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
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Source</label><input type="text" name="source" value={formData.source} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Recruiter Name</label><input type="text" name="recruiter_name" value={formData.recruiter_name} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Contact Info</label><input type="text" name="contact_info" value={formData.contact_info} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
          </div>
          <div className="mt-6">
            <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Tech Stack</label>
            <div className="p-2 min-h-[42px] rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-blue-500">
              {formData.tech_stack.map((tech: string, idx: number) => (
                <span key={idx} className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 text-sm px-2 py-1 rounded flex items-center gap-1">
                  {tech} <button type="button" onClick={() => removeTech(tech)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:text-zinc-100">&times;</button>
                </span>
              ))}
              <input type="text" value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={handleTechKeyDown} placeholder="Type and press Enter..." className="bg-transparent border-none outline-none flex-1 text-sm min-w-[150px] text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:text-zinc-500" />
            </div>
          </div>
        </section>

        {/* Tracking Fields */}
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Tracking Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100">
                <option value="draft">Draft</option><option value="applied">Applied</option><option value="screening">Screening</option>
                <option value="interview">Interview</option><option value="offer">Offer</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100">
                <option value="">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Date Applied</label><input type="date" name="date_applied" value={formData.date_applied} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Next Action</label><input type="text" name="next_action" value={formData.next_action} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Next Action Date</label>
              <div className="flex flex-col gap-3">
                <input type="date" name="next_action_date" value={formData.next_action_date} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="reminder_enabled" name="reminder_enabled" checked={formData.reminder_enabled} onChange={handleInputChange} className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="reminder_enabled" className="text-sm font-medium text-gray-700 dark:text-zinc-300">Enable Email Reminder</label>
                </div>
              </div>
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
          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" id="cover_letter_sent" name="cover_letter_sent" checked={formData.cover_letter_sent} onChange={handleInputChange} className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="cover_letter_sent" className="text-sm text-gray-700 dark:text-zinc-300">Cover Letter Sent</label>
          </div>
        </section>

        {/* Evaluation Fields */}
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Evaluation & Interviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Interview Stage</label><input type="text" name="interview_stage" value={formData.interview_stage} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" placeholder="e.g. Phone Screen, Technical, Final" /></div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Rejection Reason</label><input type="text" name="rejection_reason" value={formData.rejection_reason} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Role Fit (1-5)</label><input type="number" min="1" max="5" name="role_fit" value={formData.role_fit} onChange={handleInputChange} onBlur={handleBlur} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
            <div><label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Culture Fit (1-5)</label><input type="number" min="1" max="5" name="culture_fit" value={formData.culture_fit} onChange={handleInputChange} onBlur={handleBlur} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-zinc-100" /></div>
          </div>
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Interview Notes</label>
              <textarea name="interview_notes" value={formData.interview_notes} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none min-h-48 md:min-h-24 resize-y text-gray-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">General Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full p-2 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none min-h-48 md:min-h-24 resize-y text-gray-900 dark:text-zinc-100" />
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 sticky bottom-4 z-10 pt-4 pointer-events-none">
          {toast && (
            <div className={`px-4 py-2 rounded-md text-sm font-medium shadow-md pointer-events-auto transition-opacity ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {toast.message}
            </div>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors shadow-lg pointer-events-auto"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <ResumePreviewModal resumeId={previewResumeId} onClose={() => setPreviewResumeId(null)} />
      <UnsavedChangesModal
        isOpen={showModal}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
      {typeof document !== "undefined" && createPortal(deleteModalContent, document.body)}
    </div>
  );
}
