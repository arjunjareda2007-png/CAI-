import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { SEOHead } from '../components/SEOHead';
import { BrandLogo } from '../components/BrandLogo';

export const AboutPage: React.FC = () => {
  const { settings } = useCMS();
  return (
    <div className="max-w-[920px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden animate-fade-in-up">
      <SEOHead
        title="About Career Alert India & Editorial Standards"
        description="Learn about Career Alert India's mission, source verification standards, and editorial workflow for Indian exam and recruitment updates."
        canonicalPath="/about"
      />
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-10 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#FF7A00]">
              Editorial Mission & Standards
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D] mt-1">
              About {settings.siteName}
            </h1>
          </div>
          <div className="shrink-0 bg-[#F6F8FB] border border-[#E2E8F0] rounded-xl px-4 py-2.5 self-start sm:self-auto">
            <BrandLogo variant="wordmark" size="sm" theme="light" />
          </div>
        </div>

        <p className="text-sm sm:text-base text-[#071A3D]/90 leading-relaxed">
          <strong>{settings.siteName}</strong> ({settings.tagline}) is an independent career and examination information platform built for Indian students, competitive exam aspirants, and job seekers across Central and State recruiting commissions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] card-interactive">
            <h2 className="text-sm font-bold text-[#071A3D]">1. Official Source First</h2>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Every update published on Career Alert India cites the official commission or recruiting organization portal (such as SSC, UPSC, RRBs, IBPS, and State PSCs) so candidates can verify original PDF notifications directly.
            </p>
          </div>
          <div className="p-4 sm:p-5 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] card-interactive">
            <h2 className="text-sm font-bold text-[#071A3D]">2. Zero Speculation Policy</h2>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              We clearly distinguish between officially declared updates and tentative/expected schedules. We never fabricate vacancy numbers, exam dates, or cut-off marks.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] text-xs sm:text-sm text-[#64748B] space-y-2">
          <p className="break-words">
            For editorial inquiries or to report a date correction, contact our desk at{' '}
            <a
              href={`mailto:${settings.contactEmail}`}
              className="text-[#071A3D] font-semibold underline break-all"
            >
              {settings.contactEmail}
            </a>{' '}
            or use our{' '}
            <Link to="/contact" className="text-[#071A3D] font-semibold underline">
              Contact Form
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { settings, submitContactMessage } = useCMS();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [websiteHp, setWebsiteHp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);
    const res = await submitContactMessage({
      name,
      email,
      subject,
      message,
      website_hp: websiteHp,
    });
    setSubmitting(false);
    if (res.ok) {
      setStatusMsg({
        ok: true,
        text: 'Thank you! Your message has been received by the Career Alert India Editorial Desk. Our verification team will review your submission shortly.',
      });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } else {
      setStatusMsg({
        ok: false,
        text: res.error || 'Could not submit your message. Please verify all fields.',
      });
    }
  };

  return (
    <div className="max-w-[880px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden animate-fade-in-up">
      <SEOHead
        title="Contact Us"
        description="Contact the Career Alert India editorial desk for questions, corrections, or official notification updates."
        canonicalPath="/contact"
      />
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-10 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">
              Contact Career Alert India
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 break-words">
              Have a correction, official notification tip, or question? Send a message to our editorial desk or email{' '}
              <a
                href={`mailto:${settings.contactEmail}`}
                className="text-[#071A3D] font-semibold underline break-all"
              >
                {settings.contactEmail}
              </a>
              .
            </p>
          </div>
          <BrandLogo variant="emblem" size="md" className="hidden sm:inline-flex shrink-0" />
        </div>

        {statusMsg && (
          <div
            className={`mt-5 p-4 rounded-lg border flex items-start gap-3 text-xs sm:text-sm animate-scale-in ${
              statusMsg.ok
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            {statusMsg.ok ? (
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Honeypot field for spam protection */}
          <input
            type="text"
            name="website_hp"
            value={websiteHp}
            onChange={(e) => setWebsiteHp(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-name" className="block text-xs font-semibold text-[#071A3D] mb-1">
                Your Name *
              </label>
              <input
                id="c-name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2.5 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="c-email" className="block text-xs font-semibold text-[#071A3D] mb-1">
                Email Address *
              </label>
              <input
                id="c-email"
                type="email"
                required
                maxLength={150}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D] transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="c-subject" className="block text-xs font-semibold text-[#071A3D] mb-1">
              Subject *
            </label>
            <input
              id="c-subject"
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Correction in SSC CGL Exam Date / General Feedback"
              className="w-full px-3.5 py-2.5 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="c-message" className="block text-xs font-semibold text-[#071A3D] mb-1">
              Message *
            </label>
            <textarea
              id="c-message"
              required
              minLength={10}
              maxLength={3000}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide details and official notification URL if reporting an update..."
              className="w-full px-3.5 py-2.5 rounded-md border border-[#E2E8F0] text-sm text-[#071A3D] focus:outline-none focus:border-[#071A3D] transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-[#64748B] inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#138A36] shrink-0" />
              <span>Verified Editorial Desk Submission</span>
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-[#071A3D] hover:bg-[#0D2758] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-all btn-press cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage: React.FC = () => {
  const { settings } = useCMS();
  return (
    <div className="max-w-[880px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden animate-fade-in-up">
      <SEOHead title="Privacy Policy" canonicalPath="/privacy-policy" />
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-10 space-y-4 text-xs sm:text-sm text-[#071A3D] leading-relaxed shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">Privacy Policy</h1>
        <p className="text-[#64748B]">Last Updated: 29 September 2026</p>
        <p>
          <strong>{settings.siteName}</strong> respects your privacy. You can browse all job notifications, exam schedules, admit cards, answer keys, and results anonymously without creating an account.
        </p>
        <h2 className="text-base font-bold pt-2">1. Information We Collect</h2>
        <p>
          When you bookmark updates, your saved item IDs are stored locally in your browser&apos;s <code>localStorage</code>. If you submit an inquiry via our Contact Form, your name, email address, and message are stored securely in our restricted database solely for editorial review.
        </p>
        <h2 className="text-base font-bold pt-2">2. Anonymous Usage Analytics</h2>
        <p>
          We record aggregated, non-personally identifiable interaction events (such as popular search terms and category views) to help our editorial team prioritize high-demand exam updates.
        </p>
        <h2 className="text-base font-bold pt-2">3. External Official Links</h2>
        <p>
          Articles contain direct links to external government and recruiting commission portals (e.g., <code>ssc.gov.in</code>, <code>upsc.gov.in</code>). Please review the privacy policies of those official websites when submitting job applications.
        </p>
      </div>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  const { settings } = useCMS();
  return (
    <div className="max-w-[880px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden animate-fade-in-up">
      <SEOHead title="Terms & Conditions" canonicalPath="/terms" />
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-10 space-y-4 text-xs sm:text-sm text-[#071A3D] leading-relaxed shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">Terms & Conditions</h1>
        <p className="text-[#64748B]">Effective Date: 29 September 2026</p>
        <p>
          By accessing and using <strong>{settings.siteName}</strong>, you agree to these Terms of Use. This platform provides curated summaries, organized date tables, and direct links to official recruitment notifications for informational and educational purposes.
        </p>
        <h2 className="text-base font-bold pt-2">Candidate Responsibility</h2>
        <p>
          Recruitment rules, vacancy counts, and application deadlines may be modified by the conducting commission via official corrigendums. Candidates must always read the official notification PDF on the recruiting organization&apos;s website before paying any fee or submitting an application.
        </p>
      </div>
    </div>
  );
};

export const DisclaimerPage: React.FC = () => {
  const { settings } = useCMS();
  return (
    <div className="max-w-[880px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden animate-fade-in-up">
      <SEOHead title="Official Disclaimer" canonicalPath="/disclaimer" />
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-10 space-y-4 text-xs sm:text-sm text-[#071A3D] leading-relaxed shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">
          Official Verification Disclaimer
        </h1>
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 font-medium">
          <strong>Important Notice:</strong> {settings.siteName} is NOT a government agency and is not affiliated with the Government of India or any State Government commission.
        </div>
        <p>
          All job notifications, exam dates, admit card links, answer keys, and results published on {settings.siteName} are compiled from official government employment news, commission websites, and public press releases for the convenience of Indian students and job seekers.
        </p>
        <p>
          We never charge candidates any money for viewing notifications or accessing official links. Always verify the authenticity of the official website URL before entering personal details or paying examination fees.
        </p>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-[720px] w-full mx-auto px-4 sm:px-6 py-16 text-center overflow-x-hidden animate-fade-in-up">
      <SEOHead title="404 – Page Not Found" />
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-12 shadow-xs">
        <div className="flex justify-center mb-4">
          <BrandLogo variant="emblem" size="lg" />
        </div>
        <div className="font-mono-tabular text-4xl sm:text-5xl font-bold text-[#FF7A00]">
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D] mt-2">
          This page took the wrong career path.
        </h1>
        <p className="text-sm text-[#64748B] mt-2 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved to a new notification URL.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs sm:text-sm font-semibold transition-all btn-press"
          >
            Go Home
          </Link>
          <Link
            to="/latest"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs sm:text-sm font-semibold transition-all btn-press"
          >
            <span>Browse Latest Updates</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
