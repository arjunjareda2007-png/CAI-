import React, { useEffect } from 'react';
import { useCMS } from '../context/CMSContext';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = 'website',
  noIndex = false,
  structuredData,
}) => {
  const { settings } = useCMS();

  const fullTitle = title
    ? `${title} | ${settings.siteName}`
    : settings.defaultSeoTitle || `${settings.siteName} – ${settings.tagline}`;
  const metaDesc = description || settings.defaultSeoDescription;

  const preferredOrigin =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    !window.location.hostname.includes('run.app')
      ? window.location.origin
      : 'https://cai.foldedpage.in';

  const resolvedPath =
    canonicalPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const currentUrl = `${preferredOrigin}${resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`}`;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const robotsDirective = noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    setMeta('meta[name="title"]', 'name', 'title', fullTitle);
    setMeta('meta[name="description"]', 'name', 'description', metaDesc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', metaDesc);
    setMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMeta('meta[property="og:url"]', 'property', 'og:url', currentUrl);
    setMeta('meta[name="twitter:url"]', 'name', 'twitter:url', currentUrl);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', metaDesc);
    setMeta('meta[name="robots"]', 'name', 'robots', robotsDirective);
    setMeta('meta[name="googlebot"]', 'name', 'googlebot', robotsDirective);

    const resolvedOgImage =
      ogImage && ogImage.startsWith('http')
        ? ogImage
        : `${preferredOrigin}${ogImage || '/images/brand/logo.png'}`;

    setMeta('meta[property="og:image"]', 'property', 'og:image', resolvedOgImage);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', resolvedOgImage);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', settings.siteName);

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', currentUrl);

    let sitemapEl = document.querySelector('link[rel="sitemap"]') as HTMLLinkElement | null;
    if (!sitemapEl) {
      sitemapEl = document.createElement('link');
      sitemapEl.setAttribute('rel', 'sitemap');
      sitemapEl.setAttribute('type', 'application/xml');
      sitemapEl.setAttribute('title', 'Sitemap');
      document.head.appendChild(sitemapEl);
    }
    sitemapEl.setAttribute('href', '/sitemap.xml');
  }, [fullTitle, metaDesc, ogType, currentUrl, ogImage, noIndex, preferredOrigin, settings.siteName]);

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
};
