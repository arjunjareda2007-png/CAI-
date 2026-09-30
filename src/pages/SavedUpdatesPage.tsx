import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowRight, Search, Trash2, X } from 'lucide-react';
import { useCMS } from '../context/CMSContext';
import { SEOHead } from '../components/SEOHead';
import { UpdateCard } from '../components/UpdateCard';

export const SavedUpdatesPage: React.FC = () => {
  const { publishedPosts, bookmarks, clearBookmarks } = useCMS();
  const [filterQuery, setFilterQuery] = useState('');

  const savedPosts = useMemo(
    () => publishedPosts.filter((p) => bookmarks.includes(p.id) || bookmarks.includes(p.slug)),
    [publishedPosts, bookmarks]
  );

  const filteredSavedPosts = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return savedPosts;
    return savedPosts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.organization.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q)
    );
  }, [savedPosts, filterQuery]);

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

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#071A3D]">
                Your Saved Career Updates ({savedPosts.length})
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Updates you bookmark are stored in your browser for quick offline-ready reference.
              </p>
            </div>

            {savedPosts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                {savedPosts.length > 1 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Filter saved updates..."
                      aria-label="Filter saved updates"
                      className="pl-8 pr-7 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F6F8FB] text-xs text-[#071A3D] placeholder:text-[#64748B] focus:outline-none focus:border-[#071A3D] focus:bg-white"
                    />
                    {filterQuery && (
                      <button
                        type="button"
                        onClick={() => setFilterQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071A3D] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={clearBookmarks}
                  className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] hover:border-[#DC2626] text-xs font-semibold text-[#64748B] hover:text-[#DC2626] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            )}
          </div>
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
        ) : filteredSavedPosts.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center max-w-lg mx-auto">
            <h2 className="text-base font-bold text-[#071A3D]">No Matching Saved Updates</h2>
            <p className="text-xs text-[#64748B] mt-1">
              None of your bookmarked updates match &ldquo;{filterQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="mt-4 px-4 py-2 rounded-md bg-[#071A3D] text-white text-xs font-semibold cursor-pointer"
            >
              Show All Saved Updates
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSavedPosts.map((post, idx) => (
              <UpdateCard key={post.id || `${post.slug}-${idx}`} post={post} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
