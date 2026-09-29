/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CMSProvider } from './context/CMSContext';
import { ClerkProviderWrapper } from './context/ClerkProviderWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { ExamCalendarPage } from './pages/ExamCalendarPage';
import { SavedUpdatesPage } from './pages/SavedUpdatesPage';
import {
  AboutPage,
  ContactPage,
  PrivacyPolicyPage,
  TermsPage,
  DisclaimerPage,
  NotFoundPage,
} from './pages/StaticAndLegalPages';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

export default function App() {
  return (
    <ErrorBoundary>
      <CMSProvider>
        <ClerkProviderWrapper>
          <BrowserRouter>
            <Routes>
          {/* Hidden Secured Owner Portal Routes (/8233538355 and /caiowner, unlinked from public UI) */}
          <Route path="/8233538355" element={<AdminDashboardPage />} />
          <Route path="/8233538355/login" element={<AdminLoginPage />} />
          <Route path="/8233538355/dashboard" element={<AdminDashboardPage />} />

          <Route path="/caiowner" element={<AdminDashboardPage />} />
          <Route path="/caiowner/login" element={<AdminLoginPage />} />
          <Route path="/caiowner/dashboard" element={<AdminDashboardPage />} />

          <Route
            path="/owner-portal-cai"
            element={<Navigate to="/8233538355" replace />}
          />
          <Route path="/owner-portal-cai/login" element={<AdminLoginPage />} />
          <Route path="/owner-portal-cai/dashboard" element={<AdminDashboardPage />} />

          {/* Legacy Admin Paths Redirected to Secured Owner Portal */}
          <Route
            path="/admin"
            element={<Navigate to="/8233538355" replace />}
          />
          <Route
            path="/admin/login"
            element={<Navigate to="/8233538355/login" replace />}
          />
          <Route
            path="/admin/dashboard"
            element={<Navigate to="/8233538355" replace />}
          />

          {/* Public Candidate Portal Routes */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <HomePage />
              </PublicLayout>
            }
          />
          <Route
            path="/latest"
            element={
              <PublicLayout>
                <DirectoryPage section="latest" />
              </PublicLayout>
            }
          />
          <Route
            path="/jobs"
            element={
              <PublicLayout>
                <DirectoryPage section="jobs" />
              </PublicLayout>
            }
          />
          <Route
            path="/exams"
            element={
              <PublicLayout>
                <DirectoryPage section="exams" />
              </PublicLayout>
            }
          />
          <Route
            path="/results"
            element={
              <PublicLayout>
                <DirectoryPage section="results" />
              </PublicLayout>
            }
          />
          <Route
            path="/admit-card"
            element={
              <PublicLayout>
                <DirectoryPage section="admit-card" />
              </PublicLayout>
            }
          />
          <Route
            path="/answer-key"
            element={
              <PublicLayout>
                <DirectoryPage section="answer-key" />
              </PublicLayout>
            }
          />
          <Route
            path="/syllabus"
            element={
              <PublicLayout>
                <DirectoryPage section="syllabus" />
              </PublicLayout>
            }
          />
          <Route
            path="/notifications"
            element={
              <PublicLayout>
                <DirectoryPage section="notifications" />
              </PublicLayout>
            }
          />
          <Route
            path="/search"
            element={
              <PublicLayout>
                <DirectoryPage section="search" />
              </PublicLayout>
            }
          />
          <Route
            path="/calendar"
            element={
              <PublicLayout>
                <ExamCalendarPage />
              </PublicLayout>
            }
          />
          <Route
            path="/saved"
            element={
              <PublicLayout>
                <SavedUpdatesPage />
              </PublicLayout>
            }
          />

          {/* Dynamic SEO-Friendly Detail Routes */}
          <Route
            path="/:category/:slug"
            element={
              <PublicLayout>
                <ArticleDetailPage />
              </PublicLayout>
            }
          />

          {/* Static & Legal Trust Pages */}
          <Route
            path="/about"
            element={
              <PublicLayout>
                <AboutPage />
              </PublicLayout>
            }
          />
          <Route
            path="/contact"
            element={
              <PublicLayout>
                <ContactPage />
              </PublicLayout>
            }
          />
          <Route
            path="/privacy"
            element={
              <PublicLayout>
                <PrivacyPolicyPage />
              </PublicLayout>
            }
          />
          <Route
            path="/privacy-policy"
            element={
              <PublicLayout>
                <PrivacyPolicyPage />
              </PublicLayout>
            }
          />
          <Route
            path="/terms"
            element={
              <PublicLayout>
                <TermsPage />
              </PublicLayout>
            }
          />
          <Route
            path="/disclaimer"
            element={
              <PublicLayout>
                <DisclaimerPage />
              </PublicLayout>
            }
          />

          {/* 404 Catch-All */}
          <Route
            path="*"
            element={
              <PublicLayout>
                <NotFoundPage />
              </PublicLayout>
            }
          />
            </Routes>
          </BrowserRouter>
        </ClerkProviderWrapper>
      </CMSProvider>
    </ErrorBoundary>
  );
}
