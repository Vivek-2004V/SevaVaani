import React, { useState } from 'react';
import { UI_STRINGS } from '../state/sessionStore';

const FIELD_LABELS = {
  full_name: { hi: 'पूरा नाम', mr: 'पूर्ण नाव' },
  dob: { hi: 'जन्म तिथि', mr: 'जन्मतारीख' },
  mobile: { hi: 'मोबाइल नंबर', mr: 'मोबाईल नंबर' },
  college: { hi: 'कॉलेज / संस्थान', mr: 'महाविद्यालय / संस्था' },
  course: { hi: 'कोर्स / डिग्री', mr: 'अभ्यासक्रम / पदवी' },
  academic_year: { hi: 'शैक्षणिक वर्ष', mr: 'शैक्षणिक वर्ष' },
  annual_income: { hi: 'वार्षिक पारिवारिक आय', mr: 'वार्षिक कौटुंबिक उत्पन्न' },
  category: { hi: 'सामाजिक श्रेणी', mr: 'सामाजिक प्रवर्ग' },
  district: { hi: 'गृह जिला', mr: 'मूळ जिल्हा' },
  document_status: { hi: 'दस्तावेज़ स्थिति', mr: 'कागदपत्र स्थिती' },
};

export default function Review({
  sessionState,
  onSubmitFinal,
  onEditField
}) {
  const [consent, setConsent] = useState(false);
  const lang = sessionState.language;
  const t = UI_STRINGS[lang] || UI_STRINGS.hi;
  const isHi = lang === 'hi';

  const handleSubmit = () => {
    if (!consent) {
      alert(isHi ? 'कृपया पहले सहमति चेकबॉक्स पर टिक करें।' : 'कृपया आधी संमती चेकबॉक्सवर खूण करा.');
      return;
    }
    onSubmitFinal(consent);
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl max-w-2xl mx-auto text-left">
      <h2 className="text-2xl font-extrabold text-navy-900 mb-2">
        {t.reviewTitle}
      </h2>
      <p className="text-slate-600 text-sm mb-6">
        {isHi
          ? 'कृपया जांच लें कि आपकी सभी 10 प्रविष्टियाँ सही हैं। इसके बाद आपका आवेदन जमा किया जाएगा।'
          : 'कृपया तपासा की आपले सर्व १० तपशील बरोबर आहेत. यानंतर अर्ज सादर केला जाईल.'}
      </p>

      {/* Review Fields Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="py-2.5 px-4 text-left">फ़ील्ड</th>
              <th className="py-2.5 px-4 text-left">दर्ज मान</th>
              <th className="py-2.5 px-4 text-right">सत्यापन</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(sessionState.values).map(([k, v]) => (
              <tr key={k} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-medium text-slate-700">
                  {FIELD_LABELS[k]?.[lang] || k}
                </td>
                <td className="py-2.5 px-4 font-bold text-navy-900">
                  {String(v)}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    ✓ Verified
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mandatory Explicit Consent Checkbox (FR-014, TC12) */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 mb-6 flex items-start gap-3">
        <input
          type="checkbox"
          id="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="w-5 h-5 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
        <label htmlFor="consent" className="text-xs sm:text-sm text-slate-700 cursor-pointer leading-relaxed">
          <strong className="text-navy-900">{isHi ? 'स्पष्ट नागरिक सहमति: ' : 'स्पष्ट नागरिक संमती: '}</strong>
          {t.consentLabel}
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className={`font-extrabold text-sm sm:text-base px-8 py-3 rounded-full shadow-lg transition flex items-center gap-2 ${
            consent
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-emerald-500/30'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>📤</span> {t.btnSubmit}
        </button>
      </div>
    </div>
  );
}
