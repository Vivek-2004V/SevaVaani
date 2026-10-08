import { FormField } from '../types';

export const SCHOLARSHIP_FIELDS: FormField[] = [
  {
    id: 'full_name',
    label: {
      en: 'Full Name',
      hi: 'पूरा नाम (Full Name)',
      mr: 'पूर्ण नाव (Full Name)'
    },
    prompt: {
      en: 'Please tell me your full name as per your Aadhaar card.',
      hi: 'नमस्ते! छात्रवृत्ति आवेदन के लिए कृपया अपना पूरा नाम बताएं।',
      mr: 'नमस्कार! शिष्यवृत्ती अर्जासाठी कृपया आपले पूर्ण नाव सांगा.'
    },
    confirmPrompt: {
      en: 'Your name is {val}. Is this correct?',
      hi: 'आपका नाम {val} है, क्या यह सही है?',
      mr: 'आपले नाव {val} आहे, हे बरोबर आहे का?'
    },
    type: 'text',
    required: true,
    confirmed: false
  },
  {
    id: 'mobile',
    label: {
      en: 'Mobile Number',
      hi: 'मोबाइल नंबर (10 अंक)',
      mr: 'मोबाईल क्रमांक (10 अंक)'
    },
    prompt: {
      en: 'Please tell your 10-digit mobile number.',
      hi: 'कृपया अपना 10 अंकों का मोबाइल नंबर बोलें।',
      mr: 'कृपया आपला 10 अंकी मोबाईल क्रमांक सांगा.'
    },
    confirmPrompt: {
      en: 'Your mobile number is {val}. Is this correct?',
      hi: 'आपका मोबाइल नंबर {val} है, क्या यह सही है?',
      mr: 'आपला मोबाईल क्रमांक {val} आहे, हे योग्य आहे का?'
    },
    type: 'tel',
    required: true,
    confirmed: false
  },
  {
    id: 'dob',
    label: {
      en: 'Date of Birth',
      hi: 'जन्म तिथि (Date of Birth)',
      mr: 'जन्मतारीख (Date of Birth)'
    },
    prompt: {
      en: 'Please state your date of birth (Day, Month, Year).',
      hi: 'कृपया अपनी जन्म तिथि बताएं (दिन, महीना, साल)।',
      mr: 'कृपया आपली जन्मतारीख सांगा (दिवस, महिना, वर्ष).'
    },
    confirmPrompt: {
      en: 'Your birth date is {val}. Is this correct?',
      hi: 'आपकी जन्म तिथि {val} है, क्या यह सही है?',
      mr: 'आपली जन्मतारीख {val} आहे, हे बरोबर आहे का?'
    },
    type: 'date',
    required: true,
    confirmed: false
  },
  {
    id: 'college',
    label: {
      en: 'College / Institute',
      hi: 'कॉलेज या संस्थान का नाम',
      mr: 'महाविद्यालय / संस्थेचे नाव'
    },
    prompt: {
      en: 'Which college or university are you studying in?',
      hi: 'आप किस कॉलेज या संस्थान में पढ़ाई कर रहे हैं?',
      mr: 'तुम्ही कोणत्या महाविद्यालयात शिक्षण घेत आहात?'
    },
    confirmPrompt: {
      en: 'Your college is {val}. Is this correct?',
      hi: 'आपके कॉलेज का नाम {val} है, क्या यह सही है?',
      mr: 'आपल्या कॉलेजचे नाव {val} आहे, हे योग्य आहे का?'
    },
    type: 'text',
    required: true,
    confirmed: false
  },
  {
    id: 'course_year',
    label: {
      en: 'Course & Year',
      hi: 'कोर्स और शैक्षणिक वर्ष',
      mr: 'अभ्यासक्रम आणि वर्ष'
    },
    prompt: {
      en: 'What course and academic year are you currently in?',
      hi: 'आप कौन सा कोर्स और किस वर्ष में पढ़ रहे हैं? जैसे बी.टेक द्वितीय वर्ष।',
      mr: 'तुम्ही कोणता अभ्यासक्रम आणि कोणत्या वर्षात आहात? उदा. बी.एस्सी प्रथम वर्ष.'
    },
    confirmPrompt: {
      en: 'Your course is {val}. Is this correct?',
      hi: 'आपका कोर्स और वर्ष {val} है, क्या यह सही है?',
      mr: 'आपला अभ्यासक्रम {val} आहे, हे बरोबर आहे का?'
    },
    type: 'text',
    required: true,
    confirmed: false
  },
  {
    id: 'annual_income',
    label: {
      en: 'Annual Family Income',
      hi: 'वार्षिक पारिवारिक आय (रुपये)',
      mr: 'वार्षिक कौटुंबिक उत्पन्न (रुपये)'
    },
    prompt: {
      en: 'What is your total annual family income in rupees?',
      hi: 'आपके परिवार की वार्षिक आय कितनी है (रुपयों में)?',
      mr: 'आपल्या कुटुंबाचे वार्षिक उत्पन्न किती रुपये आहे?'
    },
    confirmPrompt: {
      en: 'Your family income is ₹{val}. Is this correct?',
      hi: 'आपकी पारिवारिक आय ₹{val} है, क्या यह सही है?',
      mr: 'आपले वार्षिक उत्पन्न ₹{val} आहे, हे बरोबर आहे का?'
    },
    type: 'number',
    required: true,
    confirmed: false
  },
  {
    id: 'category',
    label: {
      en: 'Category / Caste',
      hi: 'वर्ग / श्रेणी (General/OBC/SC/ST/EWS)',
      mr: 'प्रवर्ग (General/OBC/SC/ST/EWS)'
    },
    prompt: {
      en: 'Please state your category (General, OBC, SC, ST, or EWS).',
      hi: 'आपकी श्रेणी क्या है? जैसे सामान्य (General), ओबीसी (OBC), एससी (SC), एसटी (ST) या ईडब्ल्यूएस (EWS)।',
      mr: 'आपला प्रवर्ग कोणता आहे? उदा. खुला (Open), ओबीसी, एससी, एसटी किंवा ईडब्ल्यूएस.'
    },
    confirmPrompt: {
      en: 'Your category is {val}. Is this correct?',
      hi: 'आपकी श्रेणी {val} है, क्या यह सही है?',
      mr: 'आपला प्रवर्ग {val} आहे, हे बरोबर आहे का?'
    },
    type: 'select',
    required: true,
    confirmed: false
  },
  {
    id: 'district',
    label: {
      en: 'Home District',
      hi: 'गृह जिला (District)',
      mr: 'गृह जिल्हा (District)'
    },
    prompt: {
      en: 'Which district in the state do you belong to?',
      hi: 'आपका गृह जिला कौन सा है?',
      mr: 'आपला गृह जिल्हा कोणता आहे?'
    },
    confirmPrompt: {
      en: 'Your district is {val}. Is this correct?',
      hi: 'आपका जिला {val} है, क्या यह सही है?',
      mr: 'आपला जिल्हा {val} आहे, हे योग्य आहे का?'
    },
    type: 'text',
    required: true,
    confirmed: false
  },
  {
    id: 'aadhaar_last4',
    label: {
      en: 'Aadhaar (Last 4 Digits)',
      hi: 'आधार कार्ड के अंतिम 4 अंक',
      mr: 'आधार कार्डाचे शेवटचे 4 अंक'
    },
    prompt: {
      en: 'Please state the last 4 digits of your Aadhaar card.',
      hi: 'सत्यापन के लिए कृपया अपने आधार कार्ड के अंतिम 4 अंक बोलें।',
      mr: 'पडताळणीसाठी कृपया आपल्या आधार कार्डाचे शेवटचे 4 अंक सांगा.'
    },
    confirmPrompt: {
      en: 'The last 4 digits are {val}. Is this correct?',
      hi: 'आधार के अंतिम 4 अंक {val} हैं, क्या यह सही है?',
      mr: 'आधारचे शेवटचे 4 अंक {val} आहेत, हे बरोबर आहे का?'
    },
    type: 'number',
    required: true,
    confirmed: false
  },
  {
    id: 'declaration_ack',
    label: {
      en: 'Self Declaration',
      hi: 'स्व-घोषणा स्वीकृति (Declaration)',
      mr: 'स्वयंघोषणा मंजुरी (Declaration)'
    },
    prompt: {
      en: 'Do you confirm that all details given are true and accurate to your knowledge?',
      hi: 'क्या आप पुष्टि करते हैं कि आपके द्वारा दी गई सभी जानकारी पूर्णतया सत्य है? कहें "हाँ, मैं सहमत हूँ"।',
      mr: 'आपण खात्री देता का की दिलेली सर्व माहिती सत्य आहे? बोला "होय, मी सहमत आहे".'
    },
    confirmPrompt: {
      en: 'Declaration acknowledged: {val}. Is this correct?',
      hi: 'घोषणा: {val}, क्या आप अंतिम रूप से सहमत हैं?',
      mr: 'घोषणा: {val}, आपली अंतिम सहमती आहे का?'
    },
    type: 'text',
    required: true,
    confirmed: false
  }
];
