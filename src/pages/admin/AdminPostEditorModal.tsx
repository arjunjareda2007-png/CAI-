import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Save,
  AlertCircle,
} from 'lucide-react';
import {
  Post,
  PostCategorySlug,
  PostStatus,
  PostBadge,
  ImportantDateItem,
  VacancyRow,
  EligibilityDetails,
  FeeRow,
  ImportantLinkItem,
  FAQItem,
  SyllabusSectionItem,
} from '../../types/cms';
import { POST_TEMPLATES } from '../../data/seedData';
import { generateSlug, sanitizeUrl, formatIndianDate } from '../../utils/statusAndSanitize';

interface AdminPostEditorModalProps {
  initialPost?: Partial<Post> | null;
  onClose: () => void;
  onSave: (
    postData: Partial<Post> & { title: string; category: PostCategorySlug },
    changeSummary?: string
  ) => Promise<void>;
}

const AUTOSAVE_KEY = 'cai_admin_post_editor_autosave_v1';

export const AdminPostEditorModal: React.FC<AdminPostEditorModalProps> = ({
  initialPost,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<
    'basic' | 'dates_fees' | 'eligibility_vacancy' | 'links_steps' | 'seo_faqs' | 'preview'
  >('basic');

  const [title, setTitle] = useState(initialPost?.title || '');
  const [slug, setSlug] = useState(initialPost?.slug || '');
  const [manualSlug, setManualSlug] = useState(Boolean(initialPost?.slug));
  const [category, setCategory] = useState<PostCategorySlug>(initialPost?.category || 'jobs');
  const [subcategory, setSubcategory] = useState(initialPost?.subcategory || '');
  const [organization, setOrganization] = useState(initialPost?.organization || '');
  const [state, setState] = useState(initialPost?.state || 'All India');
  const [totalVacancies, setTotalVacancies] = useState<string>(
    initialPost?.totalVacancies !== undefined ? String(initialPost.totalVacancies) : ''
  );
  const [qualification, setQualification] = useState(initialPost?.qualification || '');
  const [salary, setSalary] = useState(initialPost?.salary || '');
  const [summary, setSummary] = useState(initialPost?.summary || '');
  const [content, setContent] = useState(initialPost?.content || '<p></p>');
  const [badge, setBadge] = useState<PostBadge>(initialPost?.badge || 'NEW');
  const [status, setStatus] = useState<PostStatus>(initialPost?.status || 'published');
  const [scheduledFor, setScheduledFor] = useState(initialPost?.scheduledFor || '');

  const [featured, setFeatured] = useState(Boolean(initialPost?.featured));
  const [isDemo] = useState(false);

  // Dates
  const [applicationStart, setApplicationStart] = useState(initialPost?.applicationStart || '');
  const [applicationEnd, setApplicationEnd] = useState(initialPost?.applicationEnd || '');
  const [examDate, setExamDate] = useState(initialPost?.examDate || '');
  const [admitCardDate, setAdmitCardDate] = useState(initialPost?.admitCardDate || '');
  const [resultDate, setResultDate] = useState(initialPost?.resultDate || '');
  const [resultStatus, setResultStatus] = useState<Post['resultStatus']>(
    initialPost?.resultStatus || 'none'
  );
  const [answerKeyType, setAnswerKeyType] = useState<Post['answerKeyType']>(
    initialPost?.answerKeyType || 'none'
  );
  const [objectionDeadline, setObjectionDeadline] = useState(
    initialPost?.objectionDeadline || ''
  );
  const [importantDates, setImportantDates] = useState<ImportantDateItem[]>(
    initialPost?.importantDates || []
  );

  // Fees & Eligibility
  const [fees, setFees] = useState<FeeRow[]>(initialPost?.fees || []);
  const [eligibility, setEligibility] = useState<EligibilityDetails>(
    initialPost?.eligibility || {
      education: '',
      ageMin: '18 Years',
      ageMax: '30 Years',
      ageRelaxation: 'Age relaxation applicable as per Government rules.',
      nationality: 'Indian Citizen',
      experience: '',
      otherRequirements: '',
    }
  );

  // Vacancy, Syllabus, Selection, Steps
  const [vacancies, setVacancies] = useState<VacancyRow[]>(initialPost?.vacancies || []);
  const [syllabusSections, setSyllabusSections] = useState<SyllabusSectionItem[]>(
    initialPost?.syllabusSections || []
  );
  const [selectionProcess, setSelectionProcess] = useState<string[]>(
    initialPost?.selectionProcess || []
  );
  const [howToApply, setHowToApply] = useState<string[]>(initialPost?.howToApply || []);

  // Official Links
  const [officialSourceUrl, setOfficialSourceUrl] = useState(
    initialPost?.officialSourceUrl || ''
  );
  const [importantLinks, setImportantLinks] = useState<ImportantLinkItem[]>(
    initialPost?.importantLinks || [
      { id: 'lnk-1', label: 'Apply Online', url: '', type: 'apply' },
      { id: 'lnk-2', label: 'Download Official Notification PDF', url: '', type: 'notification' },
      { id: 'lnk-3', label: 'Official Website', url: '', type: 'website' },
    ]
  );

  // FAQs & SEO
  const [faqs, setFaqs] = useState<FAQItem[]>(initialPost?.faqs || []);
  const [tagsText, setTagsText] = useState((initialPost?.tags || []).join(', '));
  const [seoTitle, setSeoTitle] = useState(initialPost?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialPost?.seoDescription || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialPost?.canonicalUrl || '');
  const [ogImage, setOgImage] = useState(initialPost?.ogImage || '');

  const [changeSummary, setChangeSummary] = useState(
    initialPost?.id ? 'Updated article details and dates' : 'Initial publication'
  );
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string>('');

  // Auto-slug generation
  useEffect(() => {
    if (!manualSlug && title) {
      setSlug(generateSlug(title));
    }
  }, [title, manualSlug]);

  // Autosave to localStorage every 5 seconds when editing
  useEffect(() => {
    if (!title.trim()) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({
            title,
            slug,
            category,
            organization,
            summary,
            savedAt: new Date().toLocaleTimeString(),
          })
        );
        setAutosaveStatus(`Draft autosaved at ${new Date().toLocaleTimeString()}`);
      } catch {
        // ignore storage errors
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [title, slug, category, organization, summary]);

  const applyContentTemplate = (templateId: string) => {
    const found = POST_TEMPLATES.find((t) => t.id === templateId || t.category === templateId);
    if (!found) return;
    const tpl = found.defaults;
    if (tpl.category) setCategory(tpl.category);
    if (tpl.badge) setBadge(tpl.badge);
    if (tpl.state) setState(tpl.state);
    if (tpl.resultStatus) setResultStatus(tpl.resultStatus);
    if (tpl.answerKeyType) setAnswerKeyType(tpl.answerKeyType);
    if (tpl.importantDates) setImportantDates([...tpl.importantDates]);
    if (tpl.fees) setFees([...tpl.fees]);
    if (tpl.vacancies) setVacancies([...tpl.vacancies]);
    if (tpl.syllabusSections) setSyllabusSections([...tpl.syllabusSections]);
    if (tpl.selectionProcess) setSelectionProcess([...tpl.selectionProcess]);
    if (tpl.howToApply) setHowToApply([...tpl.howToApply]);
    if (tpl.importantLinks) setImportantLinks([...tpl.importantLinks]);
  };

  const insertHtmlSnippet = (snippet: string) => {
    setContent((prev: string) => `${prev}\n${snippet}`);
  };

  const handleSaveSubmit = async (overrideStatus?: PostStatus) => {
    setValidationError(null);
    if (!title.trim()) {
      setValidationError('Post title is required.');
      return;
    }
    if (!organization.trim()) {
      setValidationError('Organization / Recruiting Board name is required.');
      return;
    }
    if (!summary.trim()) {
      setValidationError('Short summary is required for cards and SEO.');
      return;
    }

    if (officialSourceUrl.trim() && !sanitizeUrl(officialSourceUrl.trim())) {
      setValidationError('Official Source URL must begin with https:// or http://');
      return;
    }

    const validLinks = importantLinks.filter((l) => l.url.trim() && l.url.trim() !== 'https://');
    for (const l of validLinks) {
      if (!sanitizeUrl(l.url.trim())) {
        setValidationError(`Link "${l.label || l.url}" must begin with https:// or http://`);
        return;
      }
    }

    setSaving(true);
    try {
      const finalStatus = overrideStatus || status;
      const parsedVacancies = Number(totalVacancies.replace(/[^0-9]/g, '')) || 0;

      await onSave(
        {
          id: initialPost?.id,
          title: title.trim(),
          slug: slug.trim() || generateSlug(title),
          category,
          subcategory: subcategory.trim(),
          organization: organization.trim(),
          state: state.trim() || 'All India',
          totalVacancies: parsedVacancies > 0 ? parsedVacancies : undefined,
          qualification: qualification.trim(),
          salary: salary.trim(),
          summary: summary.trim(),
          content,
          badge,
          status: finalStatus,
          scheduledFor: finalStatus === 'scheduled' ? scheduledFor : '',
          featured,
          isDemo,
          applicationStart: applicationStart.trim(),
          applicationEnd: applicationEnd.trim(),
          examDate: examDate.trim(),
          admitCardDate: admitCardDate.trim(),
          resultDate: resultDate.trim(),
          resultStatus,
          answerKeyType,
          objectionDeadline: objectionDeadline.trim(),
          importantDates,
          fees,
          eligibility,
          vacancies,
          syllabusSections,
          selectionProcess: selectionProcess.filter((s) => s.trim().length > 0),
          howToApply: howToApply.filter((s) => s.trim().length > 0),
          officialSourceUrl: officialSourceUrl.trim(),
          importantLinks: validLinks,
          faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
          tags: tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          seoTitle: seoTitle.trim() || `${title.trim()} | Career Alert India`,
          seoDescription: seoDescription.trim() || summary.trim(),
          canonicalUrl: canonicalUrl.trim(),
          ogImage: ogImage.trim(),
        },
        changeSummary
      );
      localStorage.removeItem(AUTOSAVE_KEY);
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto overflow-x-hidden">
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Top Modal Header */}
        <div className="px-3 sm:px-5 py-3 bg-[#071A3D] text-white flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="px-2 py-0.5 rounded bg-[#FF7A00] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0">
              {initialPost?.id ? 'Edit Post' : 'New Update'}
            </span>
            <h2 className="text-xs sm:text-base font-bold truncate min-w-0">
              {title || 'Untitled Career Update'}
            </h2>
            {autosaveStatus && (
              <span className="hidden lg:inline-block text-[11px] text-white/70 shrink-0">
                • {autosaveStatus}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  applyContentTemplate(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              aria-label="Load structured content template"
              className="max-w-[160px] sm:max-w-none px-2 sm:px-2.5 py-1.5 rounded bg-white/10 border border-white/20 text-[11px] sm:text-xs text-white focus:outline-none truncate"
            >
              <option value="" disabled className="text-slate-900">
                + Load Template...
              </option>
              {POST_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id} className="text-slate-900">
                  Template: {tpl.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'preview' ? 'basic' : 'preview')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 text-[11px] sm:text-xs font-semibold text-white transition-colors"
            >
              {activeTab === 'preview' ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>Editor</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>Preview</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white"
              aria-label="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="bg-[#F6F8FB] border-b border-[#E2E8F0] px-5 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'basic', label: '1. Core Info & Content' },
            { id: 'dates_fees', label: '2. Dates, Fees & Eligibility' },
            { id: 'eligibility_vacancy', label: '3. Vacancy Breakdown & Syllabus' },
            { id: 'links_steps', label: '4. Official Links & How to Apply' },
            { id: 'seo_faqs', label: '5. FAQs, SEO & Revision Note' },
            { id: 'preview', label: '6. Live Article Preview' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[#FF7A00] text-[#071A3D] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#071A3D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {validationError && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-300 flex items-center gap-2 text-xs text-red-900">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'basic' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., SSC CGL 2026 Notification – 14,582 Group B & C Vacancies"
                    className="w-full px-3.5 py-2 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Primary Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PostCategorySlug)}
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] bg-white"
                  >
                    <option value="jobs">Government Jobs</option>
                    <option value="exams">Competitive Exams</option>
                    <option value="admit-card">Admit Cards</option>
                    <option value="results">Exam Results</option>
                    <option value="answer-key">Answer Keys</option>
                    <option value="syllabus">Syllabus & Pattern</option>
                    <option value="notifications">Official Notifications</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    SEO URL Slug *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setManualSlug(true);
                        setSlug(generateSlug(e.target.value));
                      }}
                      className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] font-mono-tabular text-xs text-[#071A3D]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setManualSlug(false);
                        setSlug(generateSlug(title));
                      }}
                      className="px-2.5 py-1.5 rounded border border-[#E2E8F0] text-[11px] font-semibold text-[#071A3D] hover:bg-slate-50 whitespace-nowrap"
                    >
                      Auto-Generate
                    </button>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Organization / Commission *
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="SSC, UPSC, RRB, IBPS, SBI..."
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D]"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    State / Coverage
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="All India, Rajasthan, UP..."
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Total Vacancies (Numeric)
                  </label>
                  <input
                    type="text"
                    value={totalVacancies}
                    onChange={(e) => setTotalVacancies(e.target.value)}
                    placeholder="14582"
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Qualification Summary
                  </label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="Graduate / 12th Pass"
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Salary / Pay Level
                  </label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="Pay Level 4 to 7 (₹25,500 - ₹1,42,400)"
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Subcategory / Sector
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="Central Govt / Banking / Police"
                    className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#071A3D]"
                  />
                </div>
              </div>

              {/* Status, Badges & Visibility Flags */}
              <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Highlight Badge
                  </label>
                  <select
                    value={badge}
                    onChange={(e) => setBadge(e.target.value as PostBadge)}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#071A3D]"
                  >
                    <option value="NEW">NEW</option>
                    <option value="IMPORTANT">IMPORTANT</option>
                    <option value="RESULT">RESULT</option>
                    <option value="ADMIT CARD">ADMIT CARD</option>
                    <option value="ANSWER KEY">ANSWER KEY</option>
                    <option value="LAST DATE">LAST DATE</option>
                    <option value="UPDATED">UPDATED</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="NONE">None</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Publication Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PostStatus)}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#071A3D]"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Private)</option>
                    <option value="scheduled">Scheduled Publish</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="md:col-span-6 flex flex-wrap items-center gap-4 pt-4 md:pt-0">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#071A3D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="rounded text-[#071A3D]"
                    />
                    <span>Featured Priority</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#071A3D] mb-1">
                  Short Summary (Displayed on Cards & Meta Description) *
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Concise 1–2 sentence overview with vacancy count, qualification, and application window..."
                  className="w-full px-3.5 py-2 rounded-md border border-[#E2E8F0] text-xs sm:text-sm text-[#071A3D]"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-[#071A3D]">
                    Detailed Notification Overview Body (Sanitized HTML Supported)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet('<h3>Key Highlights</h3>\n<ul>\n  <li>Point 1</li>\n</ul>')
                      }
                      className="px-2 py-1 rounded bg-[#F6F8FB] border border-[#E2E8F0] text-[11px] font-semibold text-[#071A3D] hover:bg-slate-100"
                    >
                      + Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet(
                          '<p><strong>Important Note:</strong> Candidates must read the official PDF before applying online.</p>'
                        )
                      }
                      className="px-2 py-1 rounded bg-[#F6F8FB] border border-[#E2E8F0] text-[11px] font-semibold text-[#071A3D] hover:bg-slate-100"
                    >
                      + Callout Note
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-[#E2E8F0] font-mono-tabular text-xs text-[#071A3D]"
                />
              </div>
            </div>
          )}

          {activeTab === 'dates_fees' && (
            <div className="space-y-6">
              {/* Standard Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Application Start Date
                  </label>
                  <input
                    type="text"
                    value={applicationStart}
                    onChange={(e) => setApplicationStart(e.target.value)}
                    placeholder="2026-09-15"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Application Last Date (ISO YYYY-MM-DD for countdown)
                  </label>
                  <input
                    type="text"
                    value={applicationEnd}
                    onChange={(e) => setApplicationEnd(e.target.value)}
                    placeholder="2026-10-25"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Exam Date / Schedule
                  </label>
                  <input
                    type="text"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    placeholder="2026-12-10"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Important Dates Table */}
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                    Important Dates Table Rows
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setImportantDates([
                        ...importantDates,
                        {
                          id: `dt-${Date.now()}`,
                          label: '',
                          dateValue: '',
                          isHighlight: false,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071A3D] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Date Row</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {importantDates.map((item, idx) => (
                    <div key={item.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const next = [...importantDates];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setImportantDates(next);
                        }}
                        placeholder="Event (e.g., Last Date for Fee Payment)"
                        className="sm:col-span-5 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="text"
                        value={item.dateValue}
                        onChange={(e) => {
                          const next = [...importantDates];
                          next[idx] = { ...next[idx], dateValue: e.target.value };
                          setImportantDates(next);
                        }}
                        placeholder="Date (e.g., 25 October 2026)"
                        className="sm:col-span-4 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <label className="sm:col-span-2 inline-flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isHighlight)}
                          onChange={(e) => {
                            const next = [...importantDates];
                            next[idx] = { ...next[idx], isHighlight: e.target.checked };
                            setImportantDates(next);
                          }}
                        />
                        <span>Highlight</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setImportantDates(importantDates.filter((_, i) => i !== idx))
                        }
                        className="sm:col-span-1 text-[#DC2626] hover:bg-red-50 p-1.5 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Application Fee Rows */}
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                    Application Fee Table Rows
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setFees([
                        ...fees,
                        { id: `fee-${Date.now()}`, category: '', amount: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071A3D] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Fee Row</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {fees.map((fee, idx) => (
                    <div key={fee.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={fee.category}
                        onChange={(e) => {
                          const next = [...fees];
                          next[idx] = { ...next[idx], category: e.target.value };
                          setFees(next);
                        }}
                        placeholder="Category (e.g., General / OBC / EWS)"
                        className="sm:col-span-7 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="text"
                        value={fee.amount}
                        onChange={(e) => {
                          const next = [...fees];
                          next[idx] = { ...next[idx], amount: e.target.value };
                          setFees(next);
                        }}
                        placeholder="Amount (e.g., ₹100/-)"
                        className="sm:col-span-4 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setFees(fees.filter((_, i) => i !== idx))}
                        className="sm:col-span-1 text-[#DC2626] hover:bg-red-50 p-1.5 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligibility & Age Block */}
              <div className="border border-[#E2E8F0] rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                  Eligibility & Age Limit Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                      Minimum Age
                    </label>
                    <input
                      type="text"
                      value={eligibility.ageMin}
                      onChange={(e) => setEligibility({ ...eligibility, ageMin: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                      Maximum Age
                    </label>
                    <input
                      type="text"
                      value={eligibility.ageMax}
                      onChange={(e) => setEligibility({ ...eligibility, ageMax: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={eligibility.nationality}
                      onChange={(e) =>
                        setEligibility({ ...eligibility, nationality: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                    Educational Qualification Details
                  </label>
                  <input
                    type="text"
                    value={eligibility.education}
                    onChange={(e) =>
                      setEligibility({ ...eligibility, education: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                    Age Relaxation Rules
                  </label>
                  <input
                    type="text"
                    value={eligibility.ageRelaxation}
                    onChange={(e) =>
                      setEligibility({ ...eligibility, ageRelaxation: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eligibility_vacancy' && (
            <div className="space-y-6">
              {/* Vacancy Breakdown */}
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                    Post-Wise Vacancy Breakdown Rows
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setVacancies([
                        ...vacancies,
                        {
                          id: `vac-${Date.now()}`,
                          postName: '',
                          department: '',
                          vacancies: 0,
                          qualification: '',
                          ageLimit: '18-30 Years',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071A3D] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Vacancy Row</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {vacancies.map((row, idx) => (
                    <div key={row.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={row.postName}
                        onChange={(e) => {
                          const next = [...vacancies];
                          next[idx] = { ...next[idx], postName: e.target.value };
                          setVacancies(next);
                        }}
                        placeholder="Post Name"
                        className="sm:col-span-3 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="text"
                        value={row.department}
                        onChange={(e) => {
                          const next = [...vacancies];
                          next[idx] = { ...next[idx], department: e.target.value };
                          setVacancies(next);
                        }}
                        placeholder="Department / Ministry"
                        className="sm:col-span-3 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="number"
                        value={row.vacancies}
                        onChange={(e) => {
                          const next = [...vacancies];
                          next[idx] = { ...next[idx], vacancies: Number(e.target.value) || 0 };
                          setVacancies(next);
                        }}
                        placeholder="Vacancies"
                        className="sm:col-span-2 px-2 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="text"
                        value={row.qualification}
                        onChange={(e) => {
                          const next = [...vacancies];
                          next[idx] = { ...next[idx], qualification: e.target.value };
                          setVacancies(next);
                        }}
                        placeholder="Qualification"
                        className="sm:col-span-3 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setVacancies(vacancies.filter((_, i) => i !== idx))}
                        className="sm:col-span-1 text-[#DC2626] p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Syllabus Sections */}
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                    Syllabus & Exam Pattern Sections
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setSyllabusSections([
                        ...syllabusSections,
                        { id: `syl-${Date.now()}`, subject: '', topics: '', marks: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071A3D] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject Row</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {syllabusSections.map((row, idx) => (
                    <div key={row.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={row.subject}
                        onChange={(e) => {
                          const next = [...syllabusSections];
                          next[idx] = { ...next[idx], subject: e.target.value };
                          setSyllabusSections(next);
                        }}
                        placeholder="Subject / Paper"
                        className="sm:col-span-3 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="text"
                        value={row.topics}
                        onChange={(e) => {
                          const next = [...syllabusSections];
                          next[idx] = { ...next[idx], topics: e.target.value };
                          setSyllabusSections(next);
                        }}
                        placeholder="Key Syllabus Topics"
                        className="sm:col-span-6 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="text"
                        value={row.marks || ''}
                        onChange={(e) => {
                          const next = [...syllabusSections];
                          next[idx] = { ...next[idx], marks: e.target.value };
                          setSyllabusSections(next);
                        }}
                        placeholder="Marks / Weightage"
                        className="sm:col-span-2 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSyllabusSections(syllabusSections.filter((_, i) => i !== idx))
                        }
                        className="sm:col-span-1 text-[#DC2626] p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'links_steps' && (
            <div className="space-y-6">
              <div className="bg-[#F6F8FB] p-4 rounded-lg border border-[#E2E8F0]">
                <label className="block text-xs font-bold text-[#071A3D] mb-1">
                  Official Portal Verification URL *
                </label>
                <input
                  type="url"
                  value={officialSourceUrl}
                  onChange={(e) => setOfficialSourceUrl(e.target.value)}
                  placeholder="https://ssc.gov.in"
                  className="w-full px-3 py-2 rounded border border-[#E2E8F0] bg-white text-xs font-mono-tabular"
                />
              </div>

              {/* Dynamic Official Action Links */}
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                    Official Action Links (Apply Online, Notification PDF, Admit Card, Result)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setImportantLinks([
                        ...importantLinks,
                        { id: `lnk-${Date.now()}`, label: '', url: 'https://', type: 'apply' },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071A3D] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Action Link</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {importantLinks.map((lnk, idx) => (
                    <div key={lnk.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={lnk.label}
                        onChange={(e) => {
                          const next = [...importantLinks];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setImportantLinks(next);
                        }}
                        placeholder="Button Label (e.g., Apply Online)"
                        className="sm:col-span-4 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <input
                        type="url"
                        value={lnk.url}
                        onChange={(e) => {
                          const next = [...importantLinks];
                          next[idx] = { ...next[idx], url: e.target.value };
                          setImportantLinks(next);
                        }}
                        placeholder="https://..."
                        className="sm:col-span-5 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs font-mono-tabular"
                      />
                      <select
                        value={lnk.type}
                        onChange={(e) => {
                          const next = [...importantLinks];
                          next[idx] = {
                            ...next[idx],
                            type: e.target.value as ImportantLinkItem['type'],
                          };
                          setImportantLinks(next);
                        }}
                        className="sm:col-span-2 px-2 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white"
                      >
                        <option value="apply">Apply Online</option>
                        <option value="notification">Notification PDF</option>
                        <option value="website">Official Website</option>
                        <option value="admit-card">Admit Card</option>
                        <option value="result">Result</option>
                        <option value="answer-key">Answer Key</option>
                        <option value="syllabus">Syllabus PDF</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setImportantLinks(importantLinks.filter((_, i) => i !== idx))
                        }
                        className="sm:col-span-1 text-[#DC2626] p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Apply Steps */}
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                    Step-by-Step Application Instructions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setHowToApply([...howToApply, ''])}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071A3D] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {howToApply.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-mono-tabular text-xs font-bold text-[#64748B] w-6">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const next = [...howToApply];
                          next[idx] = e.target.value;
                          setHowToApply(next);
                        }}
                        placeholder="Instruction step..."
                        className="flex-1 px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setHowToApply(howToApply.filter((_, i) => i !== idx))}
                        className="text-[#DC2626] p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seo_faqs' && (
            <div className="space-y-6">
              {/* FAQs Builder */}
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#071A3D]">
                    Structured FAQ Items (Generates Schema.org FAQPage JSON-LD)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setFaqs([...faqs, { id: `faq-${Date.now()}`, question: '', answer: '' }])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071A3D] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add FAQ</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={faq.id || idx} className="p-3 rounded bg-[#F6F8FB] border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const next = [...faqs];
                            next[idx] = { ...next[idx], question: e.target.value };
                            setFaqs(next);
                          }}
                          placeholder="Question (e.g., What is the last date to apply?)"
                          className="flex-1 px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                          className="text-[#DC2626] p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => {
                          const next = [...faqs];
                          next[idx] = { ...next[idx], answer: e.target.value };
                          setFaqs(next);
                        }}
                        placeholder="Clear, verified answer..."
                        className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Custom SEO Meta Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Defaults to Post Title | Career Alert India"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Custom SEO Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Defaults to Short Summary..."
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Search Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="SSC CGL 2026, Graduate Jobs, Central Govt"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#071A3D] mb-1">
                    Revision Audit Note
                  </label>
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Describe what changed in this revision..."
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="bg-[#F6F8FB] border border-[#E2E8F0] rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A00]">
                  Live Candidate View Preview
                </span>
                <span className="font-mono-tabular text-xs text-[#64748B]">
                  URL: /{category}/{slug || 'untitled'}
                </span>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-[#071A3D] text-white text-xs font-bold">
                    {organization || 'Organization'}
                  </span>
                  {badge !== 'NONE' && (
                    <span className="px-2 py-0.5 rounded bg-[#FF7A00] text-white text-[11px] font-bold">
                      {badge}
                    </span>
                  )}
                  <span className="text-xs text-[#64748B]">{state}</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-[#071A3D]">
                  {title || 'Untitled Notification'}
                </h1>
                <p className="text-sm text-[#64748B]">{summary}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded bg-[#F6F8FB] border border-[#E2E8F0]">
                    <div className="text-[11px] text-[#64748B] uppercase">Vacancies</div>
                    <div className="text-sm font-bold text-[#071A3D] mt-0.5">
                      {totalVacancies || 'Refer Notice'}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-[#F6F8FB] border border-[#E2E8F0]">
                    <div className="text-[11px] text-[#64748B] uppercase">Qualification</div>
                    <div className="text-sm font-bold text-[#071A3D] mt-0.5">
                      {qualification || 'Refer Notice'}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-[#F6F8FB] border border-[#E2E8F0]">
                    <div className="text-[11px] text-[#64748B] uppercase">Last Date</div>
                    <div className="text-sm font-bold text-[#071A3D] mt-0.5">
                      {formatIndianDate(applicationEnd)}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-[#F6F8FB] border border-[#E2E8F0]">
                    <div className="text-[11px] text-[#64748B] uppercase">Official Portal</div>
                    <div className="text-xs font-bold text-[#138A36] mt-0.5 truncate">
                      {officialSourceUrl || organization}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="px-5 py-3.5 bg-[#F6F8FB] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-semibold text-[#64748B] hover:text-[#071A3D]"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveSubmit('draft')}
              className="px-4 py-2 rounded-md border border-[#071A3D] bg-white hover:bg-slate-50 text-xs font-semibold text-[#071A3D]"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveSubmit('published')}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-[#138A36] hover:bg-[#10752D] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Publish Update Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
