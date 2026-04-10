import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [emailModal, setEmailModal] = useState({ open: false, subject: '', body: '' });
  const [exportModal, setExportModal] = useState({ open: false, content: '', query: '' });
  const [exportOpts, setExportOpts] = useState({ title: 'Parecer Técnico', includeLogo: true, isolateLegal: true });
  const [exporting, setExporting] = useState(false);
  const [orgLogo, setOrgLogo] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState({ isOpen: false, status: '', title: '', message: '' });

  useEffect(() => {
    loadOrgLogo();
  }, []);

  const loadOrgLogo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', session.user.id).single();
      if (profile?.organization_id) {
        const { data: org } = await supabase.from('organizations').select('logo_url').eq('id', profile.organization_id).single();
        if (org?.logo_url) setOrgLogo(org.logo_url);
      }
    } catch { /* silent */ }
  };

  const showFeedback = (status, title, message) => {
    setFeedback({ isOpen: true, status, title, message });
  };

  const openExportModal = (content, query) => {
    setExportOpts({ title: 'Parecer Técnico', includeLogo: true, isolateLegal: true });
    setExportModal({ open: true, content, query: query || '' });
  };

  const handleRedigirEmail = (content) => {
    const subject = "Consultoria Contábil — Mendonça Galvão";
    const body = `Prezado cliente,\n\nConforme solicitado, seguem as orientações técnicas:\n\n${content}\n\nAtenciosamente,\nMendonça Galvão Contadores`;
    setEmailModal({ open: true, subject, body });
  };

  return (
    <UIContext.Provider value={{
      emailModal, setEmailModal,
      exportModal, setExportModal,
      exportOpts, setExportOpts,
      exporting, setExporting,
      orgLogo, setOrgLogo,
      uploadingLogo, setUploadingLogo,
      feedback, setFeedback, showFeedback,
      openExportModal, handleRedigirEmail
    }}>
      {children}
    </UIContext.Provider>
  );
};
