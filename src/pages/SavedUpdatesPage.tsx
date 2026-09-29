import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowRight } from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { SEOHead } from '../components/SEOHead';
import { UpdateCard } from '../components/UpdateCard';

export const SavedUpdatesPage: React.FC = () => {
  const { publishedPosts, bookmarks } = useCMS();

  const savedPosts = useMemo(
    () => publishedPosts.filter((p) => bookmarks.includes(p.id)),
    [publishedPosts, bookmarks]
  );

  return (
    <>
      <SEOHead
        title="Saved Updates & Bookmarks"
        description="Access your bookmarked government job notifications, exams, admit cards, and results on Career Alert India."
        canonicalPath="/saved"
      />

      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <nav aria-label="Breadcrumb" className="text-xs text-[#64748B] mb-2">
            <Link to="/" className="hover:text-[#071A3D]">
              Home
            </Link>
            <span className="mx-2">→</span>
            <span className="text-[#071A3D] font-medium">Saved Bookmarks</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">
            Your Saved Career Updates ({savedPosts.length})
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Updates you bookmark are stored in your browser for quick offline-ready reference.
          </p>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        {savedPosts.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center max-w-lg mx-auto">
            <Bookmark className="w-8 h-8 text-[#FF7A00] mx-auto mb-3" />
            <h2 className="text-lg font-bold text-[#071A3D]">No Saved Updates Yet</h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 leading-relaxed">
              Tap the bookmark icon on any job notification, exam date, admit card, or result to keep track of important deadlines here.
            </p>
            <Link
              to="/latest"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#071A3D] text-white text-xs font-semibold"
            >
              <span>Browse Latest Updates</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedPosts.map((post, idx) => (
              <UpdateCard key={post.id || `${post.slug}-${idx}`} post={post} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
