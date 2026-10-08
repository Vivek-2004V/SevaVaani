import React from 'react';
import { SupportedLanguage } from '../types';

export interface LanguageSelectorProps {
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export interface LanguageOption {
  id: SupportedLanguage;
  native: string;
  english: string;
  region: string;
  voiceCode: string;
}

export const INDIAN_LANGUAGES: LanguageOption[] = [
  {
    id: 'hi',
    native: 'हिन्दी',
    english: 'Hindi',
    region: 'North & Central India',
    voiceCode: 'hi-IN'
  },
  {
    id: 'mr',
    native: 'मराठी',
    english: 'Marathi',
    region: 'Maharashtra & Goa',
    voiceCode: 'mr-IN'
  },
  {
    id: 'bn',
    native: 'বাংলা',
    english: 'Bengali',
    region: 'West Bengal & Tripura',
    voiceCode: 'bn-IN'
  },
  {
    id: 'te',
    native: 'తెలుగు',
    english: 'Telugu',
    region: 'Andhra Pradesh & Telangana',
    voiceCode: 'te-IN'
  },
  {
    id: 'ta',
    native: 'தமிழ்',
    english: 'Tamil',
    region: 'Tamil Nadu & Puducherry',
    voiceCode: 'ta-IN'
  },
  {
    id: 'gu',
    native: 'ગુજરાતી',
    english: 'Gujarati',
    region: 'Gujarat & Daman',
    voiceCode: 'gu-IN'
  },
  {
    id: 'kn',
    native: 'ಕನ್ನಡ',
    english: 'Kannada',
    region: 'Karnataka',
    voiceCode: 'kn-IN'
  },
  {
    id: 'ml',
    native: 'മലയാളം',
    english: 'Malayalam',
    region: 'Kerala & Lakshadweep',
    voiceCode: 'ml-IN'
  },
  {
    id: 'pa',
    native: 'ਪੰਜਾਬੀ',
    english: 'Punjabi',
    region: 'Punjab & Chandigarh',
    voiceCode: 'pa-IN'
  },
  {
    id: 'or',
    native: 'ଓଡ଼ିଆ',
    english: 'Odia',
    region: 'Odisha',
    voiceCode: 'or-IN'
  },
  {
    id: 'en',
    native: 'English',
    english: 'English (India)',
    region: 'Pan-India / Central',
    voiceCode: 'en-IN'
  }
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 my-3 w-full max-w-3xl mx-auto">
      {INDIAN_LANGUAGES.map((lang) => {
        const isSelected = selectedLanguage === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => onSelectLanguage(lang.id)}
            className={`p-3 rounded-2xl text-left transition-all duration-200 border-2 relative flex flex-col justify-between ${
              isSelected
                ? 'bg-blue-50/95 border-blue-600 shadow-md ring-2 ring-blue-400/20'
                : 'bg-white/80 border-slate-200/90 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-slate-800 leading-tight">
                {lang.native}
              </span>
              {isSelected && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {lang.english}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {lang.region}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSelector;
