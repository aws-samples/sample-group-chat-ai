// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppLayout, TopNavigation, TopNavigationProps, SideNavigation, SideNavigationProps } from '@cloudscape-design/components';
import { useAuth } from 'react-oidc-context';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/contexts/I18nContext';
import '@cloudscape-design/global-styles/index.css';

import { DashboardPage } from '@/pages/DashboardPage';
import { ConversationSetupPage } from '@/pages/ConversationSetupPage';
import { PastConversationsPage } from '@/pages/PastConversationsPage';
import { SessionPage } from '@/pages/SessionPage';
import { ExportPage } from '@/pages/ExportPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UserGuidesPage } from '@/pages/UserGuidesPage';
import { CallbackPage } from '@/pages/CallbackPage';
import { LogoutPage } from '@/pages/LogoutPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const AppContent: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation('common');
  const { currentLanguage, changeLanguage, supportedLanguages } = useI18n();
  const location = useLocation();

  // Handle language change clicks from top navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#change-language-')) {
        const langCode = hash.replace('#change-language-', '');
        if (supportedLanguages.some(lang => lang.code === langCode)) {
          changeLanguage(langCode);
          // Clear the hash to prevent it from staying in the URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Also check on mount in case we navigated here with a hash
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [changeLanguage, supportedLanguages]);

  const getTopNavigationUtilities = (): TopNavigationProps.Utility[] => {
    const currentLang = supportedLanguages.find(lang => lang.code === currentLanguage);
    
    const utilities: TopNavigationProps.Utility[] = [
      {
        type: 'menu-dropdown' as const,
        text: currentLang?.nativeName || 'English',
        items: supportedLanguages.map(lang => ({
          id: lang.code,
          text: `${lang.nativeName} (${lang.name})`,
          href: `#change-language-${lang.code}`,
        })),
      },
      {
        type: 'button' as const,
        // nosemgrep: i18next-key-format
        text: t('navigation.userGuides'),
        href: '/user-guides',
      },
    ];

    if (auth.isAuthenticated) {
      // Get user's given name, falling back to email or generic user label
      const displayName = auth.user?.profile?.given_name || 
                          auth.user?.profile?.name || 
                          auth.user?.profile?.email || 
                          t('labels.user');
      
      const userMenuItems = [];
      
      // Add email as first item if available
      if (auth.user?.profile?.email) {
        userMenuItems.push({
          id: 'user-email',
          text: auth.user.profile.email,
          href: '#', // Non-functional item, just for display
        });
      }
      
      // Add other menu items
      userMenuItems.push(
        {
          id: 'signout',
          // nosemgrep: i18next-key-format
          text: t('navigation.signOut'),
          href: '/logout',
        }
      );

      utilities.unshift({
        type: 'menu-dropdown' as const,
        text: displayName,
        items: userMenuItems,
      });
    }

    return utilities;
  };

  const getSideNavigationItems = (): SideNavigationProps.Item[] => {
    if (!auth.isAuthenticated) {
      return [];
    }

    return [
      {
        type: 'link',
        text: t('navigation.home'),
        href: '/',
      },
      {
        type: 'link',
        text: t('navigation.chat'),
        href: '/chat',
      },
      {
        type: 'link',
        text: t('navigation.pastConversations'),
        href: '/past-conversations',
      },
      {
        type: 'divider',
      },
      {
        type: 'link',
        text: t('navigation.userGuides'),
        href: '/user-guides',
      },
    ];
  };

  const getActiveHref = (): string => {
    const pathname = location.pathname;
    
    if (pathname === '/') return '/';
    if (pathname.startsWith('/chat')) return '/chat';
    if (pathname.startsWith('/past-conversations')) return '/past-conversations';
    if (pathname.startsWith('/user-guides')) return '/user-guides';
    
    return '';
  };

  return (
    <>
      <TopNavigation
        identity={{
          href: '/',
          // nosemgrep: i18next-key-format
          title: t('navigation.appTitle'),
        }}
        utilities={getTopNavigationUtilities()}
      />

      <AppLayout
        navigationHide={!auth.isAuthenticated}
        navigation={
          auth.isAuthenticated ? (
            <SideNavigation
              activeHref={getActiveHref()}
              items={getSideNavigationItems()}
            />
          ) : undefined
        }
        toolsHide
        content={
          <Routes>
            <Route path='/callback' element={<CallbackPage />} />
            <Route path='/logout' element={<LogoutPage />} />
            <Route
              path='/'
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/chat'
              element={
                <ProtectedRoute>
                  <ConversationSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/past-conversations'
              element={
                <ProtectedRoute>
                  <PastConversationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/session/:sessionId'
              element={
                <ProtectedRoute>
                  <SessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path='/session/:sessionId/export'
              element={
                <ProtectedRoute>
                  <ExportPage />
                </ProtectedRoute>
              }
            />
            <Route path='/user-guides' element={<UserGuidesPage />} />
            <Route path='*' element={<NotFoundPage />} />
          </Routes>
        }
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
