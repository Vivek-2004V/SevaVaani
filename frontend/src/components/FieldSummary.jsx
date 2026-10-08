import React from 'react';

const FIELD_LABELS = {
  full_name: { hi: 'पूरा नाम', mr: 'पूर्ण नाव' },
  dob: { hi: 'जन्म तिथि', mr: 'जन्मतारीख' },
  mobile: { hi: 'मोबाइल नंबर', mr: 'मोबाईल नंबर' },
  college: { hi: 'कॉलेज', mr: 'महाविद्यालय' },
  course: { hi: 'कोर्स', mr: 'अभ्यासक्रम' },
  academic_year: { hi: 'शैक्षणिक वर्ष', mr: 'शैक्षणिक वर्ष' },
  annual_income: { hi: 'वार्षिक आय', mr: 'वार्षिक उत्पन्न' },
  category: { hi: 'सामाजिक श्रेणी', mr: 'सामाजिक प्रवर्ग' },
  district: { hi: 'जिला', mr: 'जिल्हा' },
  document_status: { hi: 'दस्तावेज़ स्थिति', mr: 'कागदपत्र स्थिती' },
};

export default function FieldSummary({ confirmedFields = {}, language = 'hi' }) {
  const entries = Object.entries(confirmedFields);

  if (entries.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic">
        {language === 'hi' ? 'अभी कोई फ़ील्ड पूर्ण नहीं हुआ है' : 'अजून कोणतीही माहिती पूर्ण झालेली नाही'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
      {entries.map(([k, v]) => {
        const label = FIELD_LABELS[k]?.[language] || k;
        return (
          <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-left">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">{label}</div>
            <div className="text-xs font-bold text-navy-800 truncate">✓ {String(v)}</div>
          </div>
        );
      })}
    </div>
  );
}
