"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { createClient } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import ResumePreviewModal from "../../../components/ResumePreviewModal";
import ResumeUploader from "../../../components/ResumeUploader";
import { updatePreferredProvider, saveApiKey, deleteApiKey } from './actions';
import * as xlsx from 'xlsx';
import { getApplications } from '../../../lib/local/applications';
import { ClearLocalDataButton } from '../../../components/ClearLocalDataButton';

import { Application, Resume, Profile, AIModel, ApiKey } from '../../../lib/types';

export default function SettingsClient({ 
  initialProfile, 
  applications,
  resumes: initialResumes,
  apiKeys: initialApiKeys,
  userEmail 
}: { 
  initialProfile: Profile; 
  applications: Application[];
  resumes: Resume[];
  apiKeys?: ApiKey[];
  userEmail: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // AI Providers State
  const [preferredProvider, setPreferredProvider] = useState<string>(initialProfile.preferred_provider || 'google');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys || []);
  const hasGoogleKey = apiKeys.some(k => k.provider === 'google');
  const [newKeyProvider, setNewKeyProvider] = useState('google');
  const [newApiKeyValue, setNewApiKeyValue] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState({ text: '', type: '' });

  // Handlers for AI Providers
  const handleUpdatePreferredProvider = async (provider: string) => {
    setPreferredProvider(provider);
    await updatePreferredProvider(provider);
    router.refresh();
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKeyValue.trim()) {
      setKeyMessage({ text: 'API key cannot be empty.', type: 'error' });
      return;
    }
    setIsSavingKey(true);
    setKeyMessage({ text: '', type: '' });
    
    const result = await saveApiKey(newKeyProvider, newApiKeyValue);
    if (result.error) {
      setKeyMessage({ text: result.error, type: 'error' });
      setNewApiKeyValue('');
    } else {
      setKeyMessage({ text: 'API key saved successfully!', type: 'success' });
      setNewApiKeyValue('');
      // Optimistically update the list
      const existingKeyIndex = apiKeys.findIndex(k => k.provider === newKeyProvider);
      const newKeyEntry = { provider: newKeyProvider, created_at: new Date().toISOString() };
      if (existingKeyIndex >= 0) {
        const newKeys = [...apiKeys];
        newKeys[existingKeyIndex] = newKeyEntry;
        setApiKeys(newKeys);
      } else {
        setApiKeys([...apiKeys, newKeyEntry]);
      }
      router.refresh();
    }
    setIsSavingKey(false);
  };

  const handleDeleteApiKey = async (provider: string) => {
    if (!window.confirm(`Are you sure you want to delete your ${provider} API key?`)) return;
    const result = await deleteApiKey(provider);
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      setApiKeys(apiKeys.filter(k => k.provider !== provider));
      router.refresh();
    }
  };

  // AI Models State
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [preferredModel, setPreferredModel] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    setMounted(true);
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          setAiModels(data.data);
          setPreferredModel(data.preferredModel);
        }
      } catch (err) {
        console.error("Failed to fetch models", err);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  // Profile Form
  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Resumes state
  const [resumes, setResumes] = useState(initialResumes);
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);

  // Deletion Form
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [hasLocalData, setHasLocalData] = useState(false);

  useEffect(() => {
    getApplications().then((apps) => {
      setHasLocalData(apps && apps.length > 0);
    }).catch(err => {
      console.error("Failed to check local data:", err);
    });
  }, []);

  const isSavingProfileRef = useRef(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfileRef.current) return;
    isSavingProfileRef.current = true;
    setIsSavingProfile(true);
    setProfileMessage("");

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', initialProfile.id);

      if (error) {
        setProfileMessage(`Error: ${error.message}`);
      } else {
        setProfileMessage("Profile updated successfully!");
        router.refresh();
      }
    } finally {
      isSavingProfileRef.current = false;
      setIsSavingProfile(false);
    }
  };

  const handleModelChange = async (modelName: string) => {
    setPreferredModel(modelName);
    
    // Update local state optimistic
    setAiModels(prev => prev.map(m => ({ ...m, is_preferred: m.name === modelName })));

    try {
       await supabase.from('profiles').update({ preferred_model: modelName }).eq('id', initialProfile.id);
    } catch (e) {
       console.error("Failed to save preferred model", e);
    }
  };

  const handleExportData = (format: 'csv' | 'json' | 'xlsx') => {
    if (!applications || applications.length === 0) {
      alert("No applications to export.");
      return;
    }

    const fieldAllowlist = [
      'company_name',
      'role',
      'status',
      'date_applied',
      'location',
      'salary_range',
      'currency',
      'job_link',
      'source',
      'recruiter_name',
      'contact_info',
      'next_action',
      'next_action_date',
      'priority',
      'role_fit',
      'culture_fit',
      'interview_stage',
      'interview_notes',
      'rejection_reason',
      'notes',
      'tech_stack',
      'resume_version',
      'cover_letter_sent',
      'created_at',
      'updated_at'
    ];

    const processedData = applications.map(app => {
      const processed: Record<string, unknown> = {};
      
      fieldAllowlist.forEach(field => {
        let val = app[field as keyof Application];
        
        if (field === 'tech_stack' && Array.isArray(val)) {
          val = val.join(', ');
        }
        
        processed[field] = val !== null && val !== undefined ? val : "";
      });

      type AppWithStages = Application & { interview_stages?: { stage_name: string; stage_date: string }[] };
      const stages = (app as AppWithStages).interview_stages || [];
      if (stages.length > 0) {
        const sortedStages = [...stages].sort((a, b) => {
          const dateA = a.stage_date ? new Date(a.stage_date).getTime() : 0;
          const dateB = b.stage_date ? new Date(b.stage_date).getTime() : 0;
          return dateA - dateB;
        });
        
        const stagesString = sortedStages.map(s => {
          const dateStr = s.stage_date ? new Date(s.stage_date).toLocaleDateString() : 'No date';
          return `${s.stage_name} (${dateStr})`;
        }).join(' | ');
        
        processed['all_interview_stages'] = stagesString;
      } else {
        processed['all_interview_stages'] = "";
      }

      if (format === 'json') {
        processed['raw_jd'] = app.raw_jd || "";
      }

      return processed;
    });

    let blob: Blob;
    const filename = `applications_export.${format}`;

    if (format === 'csv') {
      const headers = Object.keys(processedData[0]);
      const csvContent = [
        headers.join(','),
        ...processedData.map(row => 
          headers.map(header => {
            const val = row[header];
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
    } else if (format === 'json') {
      blob = new Blob([JSON.stringify(processedData, null, 2)], { type: 'application/json' });
      
    } else if (format === 'xlsx') {
      const worksheet = xlsx.utils.json_to_sheet(processedData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Applications");
      
      const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } else {
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadSuccess = (newResume: Resume, wasSetAsCurrent: boolean) => {
    router.refresh();
    if (wasSetAsCurrent) {
       setResumes(prev => prev.map(r => ({ ...r, is_current: false })).concat(newResume).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } else {
       setResumes(prev => [newResume, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setResumes(prev => prev.filter(r => r.id !== id));
      router.refresh();
    } catch (err: unknown) {
      alert("Failed to delete resume: " + (err as Error).message);
    }
  }

  const handleSetCurrentResume = async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current: true })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setResumes(prev => prev.map(r => ({ ...r, is_current: r.id === id })));
      router.refresh();
    } catch (err: unknown) {
      alert("Failed to update current resume: " + (err as Error).message);
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteEmail !== userEmail) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
      
      await supabase.auth.signOut();
      router.push('/login?message=Your+account+has+been+deleted.');
    } catch (err: unknown) {
      setDeleteError((err as Error).message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Profile Section */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Profile</h2>
        <form onSubmit={handleSaveProfile} className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 w-full text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none mb-4"
          />
          <button
            type="submit"
            disabled={isSavingProfile || fullName === initialProfile.full_name}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            {isSavingProfile ? "Saving..." : "Save Profile"}
          </button>
          {profileMessage && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{profileMessage}</p>}
        </form>
      </section>

      {/* AI Provider Settings */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Google Gemini API Key (BYOK)</h2>
        <p className="text-gray-600 dark:text-zinc-400 mb-2 text-sm">
          Securely provide your own Google Gemini API key to bypass global usage limits.
        </p>
        <p className="text-gray-500 dark:text-zinc-500 mb-6 text-xs">
          Don&apos;t have an API key? Get one for free at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI Studio</a>.
        </p>
        
        {/* Preferred Provider Selection */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3">Active Provider</h3>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Google Gemini
            </span>
            <span className="text-xs text-gray-500 dark:text-zinc-400">Default for extraction & matching</span>
          </div>
        </div>

        {/* Saved Keys */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3">Saved API Keys</h3>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400">No custom API keys saved. Using global fallback.</p>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.provider} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 capitalize">{key.provider}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Added: {new Date(key.created_at).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteApiKey(key.provider)}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Key Form */}
        <div className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-md border border-gray-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-4">Update API Key</h3>
          <form onSubmit={handleSaveApiKey} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-2">Provider</label>
              <div className="flex items-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Google Gemini
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">API Key</label>
              <input 
                type="password"
                placeholder="Enter your API key..."
                value={newApiKeyValue}
                onChange={(e) => setNewApiKeyValue(e.target.value)}
                className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 w-full text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingKey || !newApiKeyValue.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
            >
              {isSavingKey ? "Verifying & Saving..." : "Save API Key"}
            </button>
            {keyMessage.text && (
              <p className={`text-sm mt-2 ${keyMessage.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {keyMessage.text}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* AI Model Selection Section */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">AI Model Selection</h2>
        <p className="text-gray-600 dark:text-zinc-400 mb-6 text-sm">Select your preferred model for resume extraction and matching. If your preferred model is exhausted, the system will automatically fall back to the next available one.</p>
        
        {isLoadingModels ? (
           <div className="text-sm text-gray-500">Loading models...</div>
        ) : (
          <div className="space-y-4">
            {hasGoogleKey && (
              <div className="p-3 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400">
                BYOK Active — your own quota, not shared limits
              </div>
            )}
            {aiModels.map(model => {
              const isBlocked = !hasGoogleKey && model.blocked_until && new Date(model.blocked_until) > new Date();
              const isExhausted = !hasGoogleKey && model.request_count >= model.dailyLimit;
              const unavailable = isBlocked || isExhausted;
              const isPreferred = model.name === preferredModel;
              
              let statusText = `${model.request_count} / ${model.dailyLimit} used today`;
              if (isBlocked && model.blocked_until) {
                statusText = `Blocked until ${new Date(model.blocked_until).toLocaleTimeString()}`;
              } else if (isExhausted) {
                statusText = `Daily limit reached`;
              }
              
              // Find active model: the first one in priority order (preferred first, then default order) that is not unavailable
              const orderedModels = [
                ...aiModels.filter(m => m.name === preferredModel),
                ...aiModels.filter(m => m.name !== preferredModel)
              ];
              const activeModel = orderedModels.find(m => {
                const mb = !hasGoogleKey && m.blocked_until && new Date(m.blocked_until) > new Date();
                const me = !hasGoogleKey && m.request_count >= m.dailyLimit;
                return !mb && !me;
              });
              
              const isCurrentlyActiveFallback = unavailable && isPreferred && activeModel;

              return (
                <div 
                  key={model.name} 
                  className={`p-4 rounded-md border ${isPreferred ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'} ${unavailable ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      id={`model-${model.name}`}
                      name="ai_model"
                      checked={isPreferred}
                      onChange={() => handleModelChange(model.name)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label htmlFor={`model-${model.name}`} className="block font-medium text-gray-900 dark:text-zinc-100 cursor-pointer">
                        {model.name}
                        {isPreferred && <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">Preferred</span>}
                        {unavailable && <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 rounded-full">Unavailable</span>}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{model.description}</p>
                      
                      {!hasGoogleKey && (
                        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <div className="flex-1 max-w-xs h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${unavailable ? 'bg-red-500' : 'bg-blue-500'}`} 
                              style={{ width: `${Math.min(100, (model.request_count / model.dailyLimit) * 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${unavailable ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-zinc-400'}`}>
                            {statusText}
                          </span>
                        </div>
                      )}
                      
                      {isCurrentlyActiveFallback && (
                         <div className="mt-3 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900/50">
                           Currently unavailable. Falling back to <strong>{activeModel.name}</strong>.
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Appearance</h2>
        <div className="flex gap-4">
          {mounted && ['light', 'dark', 'system'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded-md font-medium capitalize border transition-colors ${
                theme === t 
                  ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent' 
                  : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Resumes Section */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Resumes</h2>
        
        <div className="mb-8">
          <ResumeUploader onSuccess={handleUploadSuccess} />
        </div>

        {/* List of Resumes */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Saved Resumes</h3>
          {resumes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400">No resumes uploaded yet.</p>
          ) : (
            resumes.map(r => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm">
                <div className="mb-3 sm:mb-0">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setPreviewResumeId(r.id)}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400 text-left"
                    >
                      {r.version_label}
                    </button>
                    {r.is_current && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">Current</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Uploaded: {new Date(r.created_at).toLocaleDateString()}
                    {r.extracted_text === null && <span className="text-red-500 ml-2">(Text extraction failed)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {!r.is_current && (
                    <button 
                      onClick={() => handleSetCurrentResume(r.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      Set as current
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteResume(r.id)}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Data Export */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Data Export</h2>
        <p className="text-gray-600 dark:text-zinc-400 mb-4">Download a complete copy of all your tracked applications.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExportData('csv')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
          >
            Export as CSV
          </button>
          <button
            onClick={() => handleExportData('json')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
          >
            Export as JSON
          </button>
          <button
            onClick={() => handleExportData('xlsx')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
          >
            Export as XLSX
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-500 mb-6 border-b border-red-100 dark:border-red-900/30 pb-4">Danger Zone</h2>
        <p className="text-gray-600 dark:text-zinc-400 mb-4">
          Permanently delete your account and all associated applications. This action cannot be undone.
        </p>

        {deleteStep === 0 && (
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setDeleteStep(1)}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/50 rounded-md font-medium transition-colors"
            >
              Delete Account
            </button>
            
            {hasLocalData && (
              <ClearLocalDataButton />
            )}
          </div>
        )}

        {deleteStep === 1 && (
          <div className="w-full bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-100 dark:border-red-900/50">
            <p className="font-medium text-red-800 dark:text-red-400 mb-4">
              Are you sure you want to delete your account? This cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteStep(0)}
                className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {deleteStep === 2 && (
          <div className="w-full bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-100 dark:border-red-900/50">
            <label className="block text-sm font-medium text-red-800 dark:text-red-400 mb-2">
              Type <span className="font-bold select-all">{userEmail}</span> to confirm
            </label>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              className="rounded border border-red-300 dark:border-red-800/50 bg-white dark:bg-zinc-900 p-2 w-full text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 outline-none mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={() => { setDeleteStep(0); setDeleteEmail(""); setDeleteError(""); }}
                className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteEmail !== userEmail}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:opacity-50 disabled:bg-red-400 transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
          </div>
        )}
      </section>
      <ResumePreviewModal resumeId={previewResumeId} onClose={() => setPreviewResumeId(null)} />
    </div>
  );
}
