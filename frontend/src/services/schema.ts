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
      hi: 'नमस्ते! छात्रवृत्ति आवेदन के लिए कृपया अपना पूरा नाम बताएं जैसा आधार कार्ड में है।',
      mr: 'नमस्कार! शिष्यवृत्ती अर्जासाठी कृपया आपले संपूर्ण नाव सांगा जसे आधार कार्डवर आहे.'
    },
    confirmPrompt: {
      en: 'Your name is {val}. Is this correct?',
      hi: 'मैंने समझा कि आपका नाम {val} है। क्या यह सही है?',
      mr: 'मी समजलो की आपले नाव {val} आहे. हे बरोबर आहे का?'
    },
    type: 'text',
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
    id: 'course',
    label: {
      en: 'Course / Degree',
      hi: 'कोर्स या डिग्री (जैसे B.Tech, B.Sc)',
      mr: 'अभ्यासक्रम / पदवी'
    },
    prompt: {
      en: 'What course or degree are you pursuing?',
      hi: 'आप कौन सा कोर्स कर रहे हैं? जैसे बी.टेक, बी.एससी या पॉलिटेक्निक।',
      mr: 'तुम्ही कोणता अभ्यासक्रम करत आहात? उदा. बी.टेक किंवा बी.एस्सी.'
    },
    confirmPrompt: {
      en: 'Your course is {val}. Is this correct?',
      hi: 'आपका कोर्स {val} है, क्या यह सही है?',
      mr: 'आपला अभ्यासक्रम {val} आहे, हे बरोबर आहे का?'
    },
    type: 'text',
    required: true,
    confirmed: false
  },
  {
    id: 'academic_year',
    label: {
      en: 'Academic Year',
      hi: 'अध्ययन वर्ष (First, Second, Third Year)',
      mr: 'शैक्षणिक वर्ष (प्रथम, द्वितीय, तृतीय वर्ष)'
    },
    prompt: {
      en: 'Which academic year are you currently studying in?',
      hi: 'आप किस वर्ष में पढ़ रहे हैं? जैसे प्रथम वर्ष, द्वितीय वर्ष या तृतीय वर्ष।',
      mr: 'तुम्ही कोणत्या वर्षात शिकत आहात? उदा. प्रथम वर्ष किंवा द्वितीय वर्ष.'
    },
    confirmPrompt: {
      en: 'Your academic year is {val}. Is this correct?',
      hi: 'आपका वर्ष {val} है, क्या यह सही है?',
      mr: 'आपले वर्ष {val} आहे, हे योग्य आहे का?'
    },
    type: 'select',
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
      hi: 'जाति वर्ग / श्रेणी (General/OBC/SC/ST/EWS)',
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
      hi: 'गृह जिला (Home District)',
      mr: 'गृह जिल्हा (Home District)'
    },
    prompt: {
      en: 'Which district in the state do you belong to?',
      hi: 'आपका गृह जिला कौन सा है? जैसे पुणे, नागपुर, लखनऊ।',
      mr: 'आपला गृह जिल्हा कोणता आहे? उदा. पुणे, नागपूर, सातारा.'
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
    id: 'document_status',
    label: {
      en: 'Document Status / Declaration',
      hi: 'दस्तावेज एवं स्व-घोषणा (Documents Acknowledgment)',
      mr: 'कागदपत्रे आणि हमीपत्र (Documents Acknowledgment)'
    },
    prompt: {
      en: 'Do you confirm having your Aadhaar card and income certificate ready?',
      hi: 'क्या आपके पास आधार कार्ड और आय प्रमाण पत्र उपलब्ध है? बोलें "हाँ, उपलब्ध हैं"।',
      mr: 'आपल्याकडे आधार कार्ड आणि उत्पन्नाचा दाखला उपलब्ध आहे का? बोला "होय, उपलब्ध आहेत".'
    },
    confirmPrompt: {
      en: 'Documents acknowledged: {val}. Is this correct?',
      hi: 'दस्तावेज स्थिति: {val}, क्या यह सही है?',
      mr: 'कागदपत्रे: {val}, हे बरोबर आहे का?'
    },
    type: 'text',
    required: true,
    confirmed: false
  }
];
