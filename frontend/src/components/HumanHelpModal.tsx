import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../types';
import {
  createHelpTicket,
  fetchUserHelpTickets,
  fetchHelplineConfig,
  HelpTicketItem,
  HelplineConfig,
  getAuthToken
} from '../services/api';

export interface HumanHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
  sessionId?: string;
  currentFieldName?: string;
  initialCategory?: string;
}

type TabType = 'request' | 'tickets' | 'helpline';

export const HumanHelpModal: React.FC<HumanHelpModalProps> = ({
  isOpen,
  onClose,
  language = 'hi',
  sessionId,
  currentFieldName,
  initialCategory = 'other'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('request');
  const [category, setCategory] = useState<string>(initialCategory);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [notificationSent, setNotificationSent] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tickets list state
  const [userTickets, setUserTickets] = useState<HelpTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);

  // Helpline state
  const [helplineConfig, setHelplineConfig] = useState<HelplineConfig | null>(null);
  const [loadingHelpline, setLoadingHelpline] = useState<boolean>(false);
  const [copiedTicket, setCopiedTicket] = useState<boolean>(false);

  const isLoggedIn = Boolean(getAuthToken());

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      loadHelpline();
      if (isLoggedIn) {
        loadTickets();
      }
    }
  }, [isOpen, isLoggedIn]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const tickets = await fetchUserHelpTickets();
      setUserTickets(tickets);
    } catch {
      setUserTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadHelpline = async () => {
    setLoadingHelpline(true);
    try {
      const config = await fetchHelplineConfig();
      setHelplineConfig(config);
    } catch {
      setHelplineConfig(null);
    } finally {
      setLoadingHelpline(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submission

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createHelpTicket({
        sessionId,
        category,
        description: description.trim() || undefined,
        fieldName: currentFieldName,
        language
      });

      if (res.success && res.ticket_id) {
        setCreatedTicketId(res.ticket_id);
        setNotificationSent(res.external_notification_sent);
        setSubmissionSuccess(true);
        // Refresh ticket list
        if (isLoggedIn) {
          loadTickets();
        }
      } else {
        setErrorMessage(res.message || 'सहायता अनुरोध दर्ज नहीं हो सका। कृपया पुनः प्रयास करें।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'सर्वर से संपर्क नहीं हो सका।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTicket = () => {
    if (createdTicketId) {
      navigator.clipboard.writeText(createdTicketId);
      setCopiedTicket(true);
      setTimeout(() => setCopiedTicket(false), 2000);
    }
  };

  const resetForm = () => {
    setSubmissionSuccess(false);
    setCreatedTicketId(null);
    setDescription('');
    setCategory('other');
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  // Localization strings
  const labels = {
    title: language === 'mr' ? 'इन्सानी मदत आणि सहाय्यता' : language === 'en' ? 'Human Help & Support' : 'इंसानी सहायता एवं हेल्पडेस्क',
    subtitle: language === 'mr' ? 'जर आवाज समजण्यात किंवा फॉर्म भरताना अडचण येत असेल, तर आम्ही मदतीसाठी तयार आहोत' : language === 'en' ? 'Get assistance with voice recognition, form-filling, or technical issues' : 'यदि आपको बोलने या फॉर्म भरने में कोई समस्या है, तो हम सहायता के लिए तैयार हैं',
    tabRequest: language === 'mr' ? 'मदत मागा' : language === 'en' ? 'Request Help' : 'सहायता मांगें',
    tabTickets: language === 'mr' ? 'माझी तिकीटे' : language === 'en' ? 'My Tickets' : 'मेरे टिकट',
    tabHelpline: language === 'mr' ? 'हेल्पलाइन संपर्क' : language === 'en' ? 'Helpline' : 'हेल्पलाइन संपर्क',
    categories: [
      {
        id: 'voice_not_understood',
        icon: '🎙️',
        title: language === 'mr' ? 'आवाज समजला नाही' : language === 'en' ? 'Voice Not Understood' : 'आवाज़ समझ नहीं आई',
        desc: language === 'mr' ? 'मायक्रोफोन आवाज ओळखण्यात अडचण' : language === 'en' ? 'Microphone or accent recognition error' : 'माइक में बोली गई आवाज़ सही नहीं पहचानी गई'
      },
      {
        id: 'form_filling_problem',
        icon: '📝',
        title: language === 'mr' ? 'अर्ज भरताना समस्या' : language === 'en' ? 'Form-Filling Problem' : 'फॉर्म भरने में समस्या',
        desc: language === 'mr' ? 'आवश्यक माहिती भरता येत नाही' : language === 'en' ? 'Unable to enter required details' : 'किसी फ़ील्ड में जानकारी भरने में कठिनाई'
      },
      {
        id: 'document_verification',
        icon: '📄',
        title: language === 'mr' ? 'कागदपत्र पडताळणी' : language === 'en' ? 'Document Verification' : 'दस्तावेज़ सत्यापन',
        desc: language === 'mr' ? 'नाव किंवा माहिती विसंगती' : language === 'en' ? 'Name or details mismatch on certificates' : 'प्रमाण पत्र या नाम मिलान में अड़चन'
      },
      {
        id: 'technical_issue',
        icon: '⚙️',
        title: language === 'mr' ? 'तांत्रिक अडचण' : language === 'en' ? 'Technical Issue' : 'तकनीकी समस्या',
        desc: language === 'mr' ? 'पेज लोड न होणे किंवा एरर' : language === 'en' ? 'Loading errors or connection issues' : 'सर्वर या नेटवर्क रुकावट'
      },
      {
        id: 'other',
        icon: '❓',
        title: language === 'mr' ? 'इतर अडचण' : language === 'en' ? 'Other' : 'अन्य सहायता',
        desc: language === 'mr' ? 'इतर कोणतीही मदत हवी असल्यास' : language === 'en' ? 'Any general query or human help' : 'अन्य कोई भी सवाल या विशेष सहायता'
      }
    ],
    descLabel: language === 'mr' ? 'समस्येचे संक्षिप्त वर्णन (पर्यायी):' : language === 'en' ? 'Brief description of your issue (optional):' : 'समस्या का संक्षिप्त विवरण (वैकल्पिक):',
    descPlaceholder: language === 'mr' ? 'आपली समस्या साध्या शब्दांत लिहा...' : language === 'en' ? 'Explain what problem you are facing...' : 'अपनी समस्या को सरल शब्दों में लिखें...',
    privacyNotice: language === 'mr' ? '⚠️ कृपया आधार नंबर, पासवर्ड किंवा ओटीपी लिहू नका.' : language === 'en' ? '⚠️ Do not enter Aadhaar numbers, OTPs, or passwords.' : '⚠️ कृपया आधार नंबर, पासवर्ड या ओटीपी न लिखें।',
    btnSubmit: language === 'mr' ? 'मला मदत हवी आहे' : language === 'en' ? 'I Need Help' : 'मुझे सहायता चाहिए',
    btnSubmitting: language === 'mr' ? 'नोंदणी करत आहे...' : language === 'en' ? 'Submitting...' : 'सहायता दर्ज हो रही है...',
    successTitle: language === 'mr' ? 'आपली मदत विनंती नोंदवली गेली आहे.' : language === 'en' ? 'Your help request has been registered.' : 'आपकी सहायता अनुरोध दर्ज हो गई है।',
    ticketIdLabel: 'Ticket ID',
    keepSafeText: language === 'mr' ? 'आपल्या मदतीची विनंती सुरक्षितपणे नोंदवली गेली आहे. कृपया हा Ticket ID सांभाळून ठेवा.' : language === 'en' ? 'Your request has been safely recorded. Please preserve this Ticket ID for reference.' : 'आपकी सहायता का अनुरोध सुरक्षित रूप से दर्ज किया गया है। कृपया इस Ticket ID को संभालकर रखें।',
    btnCopy: language === 'mr' ? 'कॉपी करा' : language === 'en' ? 'Copy ID' : 'कॉपी करें',
    btnCopied: language === 'mr' ? 'कॉपी झाले!' : language === 'en' ? 'Copied!' : 'कॉपी हो गया!',
    btnNewTicket: language === 'mr' ? 'नवीन विनंती करा' : language === 'en' ? 'New Request' : 'नया अनुरोध दर्ज करें',
    btnClose: language === 'mr' ? 'बंद करा' : language === 'en' ? 'Close' : 'बंद करें',
    refreshTickets: language === 'mr' ? 'ताजे करा' : language === 'en' ? 'Refresh' : 'ताज़ा करें'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-human-help-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl text-emerald-400">
              🆘
            </div>
            <div>
              <h2 id="modal-human-help-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                {labels.title}
              </h2>
              <p className="text-xs text-zinc-400">
                {labels.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center transition-colors active:scale-95 touch-target-44"
            aria-label={labels.btnClose}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-zinc-900/30 px-5 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'request'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {labels.tabRequest}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <span>{labels.tabTickets}</span>
            {userTickets.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300">
                {userTickets.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('helpline')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'helpline'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {labels.tabHelpline}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ════ TAB 1: REQUEST ASSISTANCE ════ */}
          {activeTab === 'request' && (
            <div>
              {submissionSuccess && createdTicketId ? (
                /* Success View with Genuine Ticket ID */
                <div className="p-6 bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl text-center space-y-4 animate-fade-in">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-3xl">
                    ✅
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-emerald-300">
                      {labels.successTitle}
                    </h3>
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-black/60 border border-emerald-500/40 rounded-xl">
                      <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                        {labels.ticketIdLabel}:
                      </span>
                      <span className="text-xl font-mono font-black text-white">
                        {createdTicketId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTicket}
                        className="ml-2 px-2.5 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/50 text-emerald-200 rounded-md transition-all active:scale-95"
                      >
                        {copiedTicket ? labels.btnCopied : labels.btnCopy}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-emerald-100/90 max-w-md mx-auto leading-relaxed">
                    {labels.keepSafeText}
                  </p>

                  {/* Truthful Notification Status */}
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-left text-xs text-zinc-300 flex items-start gap-2 max-w-md mx-auto">
                    <span className="text-base">ℹ️</span>
                    <div>
                      <p className="font-semibold text-zinc-200">
                        {notificationSent
                          ? (language === 'mr' ? 'मदत ऑपरेटरला थेट संदेश पाठवला गेला आहे.' : 'सहायता ऑपरेटर को संदेश प्रेषित कर दिया गया है।')
                          : (language === 'mr' ? 'विनंती सुरक्षितपणे अंतर्गत सर्व्हरवर नोंदवली गेली आहे.' : 'सहायता अनुरोध सुरक्षित रूप से आंतरिक सर्वर पर दर्ज किया गया है।')}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {language === 'mr'
                          ? 'आमचे सहाय्यक लवकरच आपल्या सत्राची तपासणी करतील.'
                          : 'हमारे ऑपरेटर जल्द ही आपके सत्र की समीक्षा करेंगे।'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
                    >
                      {labels.btnNewTicket}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      {labels.tabTickets}
                    </button>
                  </div>
                </div>
              ) : (
                /* Ticket Request Form */
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center justify-between">
                      <span>⚠️ {errorMessage}</span>
                      <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="text-rose-400 hover:text-white ml-2 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Category Selection Grid */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">
                      {language === 'mr' ? 'समस्येचा प्रकार निवडा:' : language === 'en' ? 'Select Issue Category:' : 'समस्या की श्रेणी चुनें:'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {labels.categories.map((cat) => {
                        const isSelected = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 touch-target-44 ${
                              isSelected
                                ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-500/30 text-white'
                                : 'bg-zinc-900/50 border-white/10 hover:border-white/25 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <span className="text-2xl shrink-0 mt-0.5">{cat.icon}</span>
                            <div>
                              <p className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                                {cat.title}
                              </p>
                              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                                {cat.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="help-description" className="text-xs font-bold text-zinc-300">
                        {labels.descLabel}
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {description.length}/500
                      </span>
                    </div>
                    <textarea
                      id="help-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                      placeholder={labels.descPlaceholder}
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none"
                    />
                    <p className="text-[11px] text-amber-300/80 mt-1">
                      {labels.privacyNotice}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full touch-target-44 min-h-[46px] py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>{labels.btnSubmitting}</span>
                        </>
                      ) : (
                        <>
                          <span>🤝</span>
                          <span>{labels.btnSubmit}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ════ TAB 2: MY TICKETS ════ */}
          {activeTab === 'tickets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-semibold">
                  {language === 'mr' ? 'आपले पूर्वीचे तिकीट क्रमांक:' : 'आपके पूर्व दर्ज सहायता टिकट:'}
                </span>
                <button
                  type="button"
                  onClick={loadTickets}
                  disabled={loadingTickets}
                  className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-emerald-300 flex items-center gap-1"
                >
                  <span>🔄</span>
                  <span>{labels.refreshTickets}</span>
                </button>
              </div>

              {!isLoggedIn ? (
                <div className="p-6 bg-zinc-900/40 border border-white/10 rounded-2xl text-center space-y-2">
                  <span className="text-2xl">🔒</span>
                  <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                    {language === 'mr'
                      ? 'आपले सर्व तिकीट ट्रॅक करण्यासाठी कृपया लॉगिन करा.'
                      : 'अपने सभी सहायता टिकट देखने के लिए कृपया लॉगिन करें।'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {language === 'mr'
                      ? 'तथापि आपण तिकीट आयडी (Ticket ID) नोंदवून ठेवू शकता.'
                      : 'टिकट बनाते समय मिला Ticket ID संभालकर रखें।'}
                  </p>
                </div>
              ) : loadingTickets ? (
                <div className="p-8 text-center text-zinc-400 text-xs">
                  <span className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
                  <p>लोड हो रहा है...</p>
                </div>
              ) : userTickets.length === 0 ? (
                <div className="p-8 bg-zinc-900/40 border border-white/10 rounded-2xl text-center text-zinc-400 space-y-2">
                  <span className="text-3xl">🎫</span>
                  <p className="text-xs sm:text-sm text-zinc-300 font-semibold">
                    {language === 'mr' ? 'कोणतेही तिकीट आढळले नाही.' : 'कोई पूर्व सहायता टिकट दर्ज नहीं है।'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {language === 'mr' ? 'गरज असल्यास "मदत मागा" टॅबमधून नवीन विनंती करा.' : 'आवश्यकता होने पर "सहायता मांगें" टैब से नया अनुरोध दर्ज करें।'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userTickets.map((t) => {
                    const statusColors: Record<string, string> = {
                      open: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
                      ticket_created: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
                      in_progress: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
                      resolved: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    };
                    const statusBadge = statusColors[t.status.toLowerCase()] || 'bg-zinc-800 text-zinc-300 border-zinc-700';
                    const categoryLabels: Record<string, string> = {
                      voice_not_understood: '🎙️ आवाज़',
                      form_filling_problem: '📝 फॉर्म',
                      document_verification: '📄 दस्तावेज़',
                      technical_issue: '⚙️ तकनीकी',
                      other: '❓ अन्य'
                    };

                    return (
                      <div
                        key={t.ticket_id}
                        className="p-3.5 bg-zinc-900/70 border border-white/10 rounded-2xl space-y-2 hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-emerald-400">
                              {t.ticket_id}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                              {categoryLabels[t.category] || t.category}
                            </span>
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                            {t.status.toUpperCase()}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-zinc-300 bg-black/40 p-2 rounded-xl">
                            "{t.description}"
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                          <span>📅 {new Date(t.created_at).toLocaleString()}</span>
                          <span>
                            {t.notification_status === 'delivered'
                              ? '🟢 ऑपरेटर सूचित'
                              : '⚪ आंतरिक सुरक्षित'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 3: HELPLINE CONTACTS ════ */}
          {activeTab === 'helpline' && (
            <div className="space-y-4">
              {loadingHelpline ? (
                <div className="p-8 text-center text-zinc-400 text-xs">
                  <span className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
                  <p>हेल्पलाइन जानकारी लोड हो रही है...</p>
                </div>
              ) : helplineConfig && helplineConfig.is_configured ? (
                /* Configured Helpline Details */
                <div className="space-y-3">
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl">
                    <p className="text-xs font-bold text-emerald-300">
                      {helplineConfig.message}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      🕒 कार्य समय: {helplineConfig.hours}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {helplineConfig.phone && (
                      <a
                        href={`tel:${helplineConfig.phone}`}
                        className="touch-target-44 min-h-[52px] p-3.5 bg-zinc-900 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl flex items-center gap-3 transition-all active:scale-95 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xl">
                          📞
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-emerald-300">
                            {language === 'mr' ? 'कॉल करा' : 'कॉल सहायता (Call)'}
                          </p>
                          <p className="text-xs font-mono text-zinc-400">
                            {helplineConfig.phone}
                          </p>
                        </div>
                      </a>
                    )}

                    {helplineConfig.whatsapp && helplineConfig.whatsapp_digits && (
                      <a
                        href={`https://wa.me/${helplineConfig.whatsapp_digits}?text=${encodeURIComponent('नमस्ते सेवा वाणी टीम, मुझे सहायता चाहिए।')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="touch-target-44 min-h-[52px] p-3.5 bg-zinc-900 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl flex items-center gap-3 transition-all active:scale-95 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xl">
                          💬
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-emerald-300">
                            WhatsApp सहायता
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            बाहरी ऐप में खुलेगा
                          </p>
                        </div>
                      </a>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 p-2.5 bg-black/40 rounded-xl border border-white/5">
                    ℹ️ व्हाट्सएप एक बाहरी सेवा है। कोई भी संवेदनशील व्यक्तिगत विवरण या दस्तावेज़ संदेश में स्वतः नहीं भेजा जाता।
                  </p>
                </div>
              ) : (
                /* Unconfigured Helpline Notice (Truthful Disclosure) */
                <div className="p-6 bg-zinc-900/60 border border-amber-500/30 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                    📞
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-amber-300">
                      {language === 'mr'
                        ? 'अधिकृत हेल्पलाइन क्रमांक सध्या कॉन्फिगर केलेला नाही.'
                        : 'आधिकारिक हेल्पलाइन नंबर अभी कॉन्फ़िगर नहीं है।'}
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 max-w-md mx-auto leading-relaxed">
                      {language === 'mr'
                        ? 'कृपया "मदत मागा" टॅबचा वापर करून तिकीट नोंदवा. आमचे ऑपरेटर आपल्या सत्राचे पुनरावलोकन करतील.'
                        : 'कृपया "सहायता मांगें" विकल्प का उपयोग करके टिकट दर्ज करें। हमारे ऑपरेटर आपके सत्र की समीक्षा करेंगे।'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('request')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    {labels.tabRequest}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-zinc-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 touch-target-44"
          >
            {labels.btnClose}
          </button>
        </div>
      </div>
    </div>
  );
};
