// SEVA VAANI - DOM Field Mapper & Conservative Form Autofill Guard
// Complies with PRD & TRD: Zero unconfirmed commits, zero auto-submits, strictly excludes sensitive inputs.

const SENSITIVE_KEYWORDS = ['password', 'otp', 'captcha', 'token', 'secret', 'cvv', 'card', 'pin', 'aadhaar', 'pan'];

const FIELD_SYNONYMS = {
  full_name: ['name', 'fullname', 'full_name', 'applicant_name', 'applicantname', 'student_name', 'candidate_name', 'txtapplicantname', 'txtname', 'txtfullname', 'naam', 'नाम', 'नाव', 'पूर्ण नाव', 'अर्जदाराचे नाव', 'विद्यार्थ्याचे नाव'],
  father_name: ['father_name', 'fathername', 'txtfathername', 'guardian_name', 'guardian', 'पिता', 'पिता का नाम', 'वडिलांचे नाव', 'पालकाचे नाव'],
  mother_name: ['mother_name', 'mothername', 'txtmothername', 'माता', 'माता का नाम', 'आईचे नाव'],
  gender: ['gender', 'sex', 'txtgender', 'ddlgender', 'लिंग'],
  dob: ['dob', 'birth', 'date_of_birth', 'birth_date', 'txtdob', 'txtdateofbirth', 'janm', 'जन्मतारीख', 'जन्म तिथि', 'जन्म तारीख'],
  mobile: ['mobile', 'phone', 'contact', 'mobile_no', 'mobile_number', 'phone_number', 'txtmobile', 'txtmobileno', 'मोबाइल', 'मोबाईल', 'संपर्क'],
  email: ['email', 'email_id', 'emailid', 'txtemail', 'ईमेल'],
  address: ['address', 'residential_address', 'permanent_address', 'txtaddress', 'पत्ता', 'पता', 'निवास स्थान'],
  state: ['state', 'state_name', 'txtstate', 'ddlstate', 'राज्य'],
  district: ['district', 'city', 'domicile_district', 'home_district', 'district_name', 'txtdistrict', 'ddldistrict', 'जिला', 'जिल्हा', 'शहर'],
  taluka: ['taluka', 'tehsil', 'sub_district', 'txttaluka', 'txttehsil', 'ddltaluka', 'तालुका', 'तहसील'],
  village: ['village', 'town', 'txtvillage', 'गाव', 'गांव'],
  pincode: ['pincode', 'pin_code', 'postal_code', 'txtpincode', 'पिन कोड', 'पिनकोड'],
  college: ['college', 'institute', 'institution', 'university', 'college_name', 'school_name', 'संस्थान', 'महाविद्यालय', 'कॉलेज', 'शाळा'],
  course: ['course', 'degree', 'branch', 'program', 'course_name', 'stream', 'डिग्री', 'अभ्यासक्रम', 'कोर्स'],
  academic_year: ['year', 'academic_year', 'current_year', 'admission_year', 'वर्ष', 'शैक्षणिक वर्ष'],
  annual_income: ['income', 'annual_income', 'family_income', 'salary', 'income_amount', 'txtincome', 'वार्षिक आय', 'उत्पन्न', 'कौटुंबिक उत्पन्न', 'वार्षिक उत्पन्न'],
  category: ['category', 'caste', 'caste_category', 'social_category', 'reservation', 'txtcategory', 'ddlcategory', 'वर्ग', 'प्रवर्ग', 'सामाजिक वर्ग', 'श्रेणी', 'जात', 'जाती'],
  sub_caste: ['sub_caste', 'subcaste', 'txtsubcaste', 'पोटजात', 'उपजाति'],
  ration_card_no: ['ration_card', 'ration_card_no', 'ration_number', 'रेशन कार्ड', 'राशन कार्ड'],
  document_status: ['document', 'document_status', 'doc_status', 'certificate', 'दस्तावेज़', 'कागदपत्र']
};

class DOMFieldMapper {
  /**
   * Scans document for visible, interactable form fields excluding sensitive ones.
   */
  static scanFormFields() {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    const validFields = [];

    for (const el of inputs) {
      if (!this.isVisible(el)) continue;
      if (this.isSensitive(el)) continue;

      const descriptor = this.getFieldDescriptor(el);
      const matchedSchemaField = this.matchToSchema(descriptor);

      validFields.push({
        element: el,
        descriptor,
        matchedSchemaField
      });
    }

    return validFields;
  }

  static isVisible(el) {
    if (el.type === 'hidden' || el.style.display === 'none' || el.style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  static isSensitive(el) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'password' || type === 'submit' || type === 'button' || type === 'reset') return true;

    const combinedText = [
      el.id,
      el.name,
      el.getAttribute('placeholder'),
      el.getAttribute('aria-label'),
      el.className
    ].filter(Boolean).join(' ').toLowerCase();

    return SENSITIVE_KEYWORDS.some(kw => combinedText.includes(kw));
  }

  static getFieldDescriptor(el) {
    let labelText = '';

    // 1. Explicit <label for="id">
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) labelText = label.innerText;
    }

    // 2. Parent <label>
    if (!labelText) {
      const parentLabel = el.closest('label');
      if (parentLabel) labelText = parentLabel.innerText;
    }

    // 3. Aria-label / Placeholder / Name / Id
    return {
      id: el.id || '',
      name: el.name || '',
      placeholder: el.getAttribute('placeholder') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      labelText: (labelText || '').trim(),
      tagName: el.tagName.toLowerCase(),
      type: el.type || 'text'
    };
  }

  static matchToSchema(descriptor) {
    // 1. Direct match on schema field name
    for (const schemaField of Object.keys(FIELD_SYNONYMS)) {
      if (descriptor.name === schemaField || descriptor.id === schemaField) {
        return schemaField;
      }
    }

    // 2. Exact token match against synonyms
    const tokens = [
      descriptor.name.toLowerCase(),
      descriptor.id.toLowerCase(),
      ...descriptor.labelText.toLowerCase().split(/\s+/),
      ...descriptor.placeholder.toLowerCase().split(/\s+/),
      ...descriptor.ariaLabel.toLowerCase().split(/\s+/)
    ].filter(Boolean);

    for (const [schemaField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.some(syn => tokens.includes(syn.toLowerCase()))) {
        return schemaField;
      }
    }

    // 3. Substring match
    const combined = [
      descriptor.name,
      descriptor.id,
      descriptor.labelText,
      descriptor.placeholder,
      descriptor.ariaLabel
    ].filter(Boolean).join(' ').toLowerCase();

    for (const [schemaField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.some(syn => combined.includes(syn.toLowerCase()))) {
        return schemaField;
      }
    }
    return null;
  }

  /**
   * Safely highlights and fills a verified field only upon explicit citizen confirmation.
   * Dispatches framework-compliant events and verifies value was committed.
   */
  static fillField(schemaFieldName, value) {
    const candidates = this.scanFormFields();
    const target = candidates.find(c => c.matchedSchemaField === schemaFieldName);

    if (!target) {
      return { success: false, message: `No matching form input found on page for '${schemaFieldName}'.` };
    }

    const el = target.element;
    if (el.disabled || el.readOnly) {
      return { success: false, message: `Field '${schemaFieldName}' is disabled or read-only.` };
    }

    // Visual pulse indication
    const originalOutline = el.style.outline;
    const originalBg = el.style.backgroundColor;
    el.style.outline = '3px solid #22c55e';
    el.style.backgroundColor = '#f0fdf4';

    setTimeout(() => {
      try {
        el.style.outline = originalOutline;
        el.style.backgroundColor = originalBg;
      } catch (_) {}
    }, 2000);

    // Populate value safely according to actual input type
    const inputType = (el.getAttribute('type') || '').toLowerCase();
    if (el.tagName.toLowerCase() === 'select') {
      let found = false;
      const strVal = String(value).trim().toLowerCase();
      for (const opt of Array.from(el.options)) {
        if (opt.value.trim().toLowerCase() === strVal || opt.text.trim().toLowerCase() === strVal || opt.text.trim().toLowerCase().includes(strVal)) {
          el.value = opt.value;
          found = true;
          break;
        }
      }
      if (!found && el.options.length > 0) {
        el.value = value;
      }
    } else if (inputType === 'checkbox') {
      const boolVal = ['true', '1', 'yes', 'हाँ', 'होय'].includes(String(value).trim().toLowerCase());
      try {
        const proto = Object.getPrototypeOf(el);
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'checked');
        if (descriptor && descriptor.set) {
          descriptor.set.call(el, boolVal);
        } else {
          el.checked = boolVal;
        }
      } catch (_) {
        el.checked = boolVal;
      }
    } else if (inputType === 'radio') {
      const radios = el.name ? Array.from(document.querySelectorAll(`input[type="radio"][name="${el.name}"]`)) : [el];
      let radioToSelect = el;
      const strVal = String(value).trim().toLowerCase();
      for (const r of radios) {
        if (r.value.trim().toLowerCase() === strVal || (r.labels && Array.from(r.labels).some(l => l.innerText.toLowerCase().includes(strVal)))) {
          radioToSelect = r;
          break;
        }
      }
      try {
        const proto = Object.getPrototypeOf(radioToSelect);
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'checked');
        if (descriptor && descriptor.set) {
          descriptor.set.call(radioToSelect, true);
        } else {
          radioToSelect.checked = true;
        }
      } catch (_) {
        radioToSelect.checked = true;
      }
    } else {
      // Text inputs, textareas, date inputs, etc.
      try {
        const proto = Object.getPrototypeOf(el);
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(el, value);
        } else {
          el.value = value;
        }
      } catch (_) {
        el.value = value;
      }
    }

    // Dispatch synthetic input and change events for reactive framework binding
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));

    // Character-by-character post-fill equivalence and verification check
    if (inputType === 'checkbox' || inputType === 'radio') {
      return {
        success: true,
        actualValue: el.checked,
        message: `Successfully set ${schemaFieldName} checked state to ${el.checked}.`
      };
    }

    const actualVal = String(el.value || '').trim();
    const expectedVal = String(value || '').trim();

    if (!actualVal) {
      return {
        success: false,
        message: `Field '${schemaFieldName}' did not retain the filled value.`
      };
    }

    // Truncation detection (e.g. host form input maxLength)
    const maxLength = el.maxLength > 0 ? el.maxLength : null;
    if (maxLength && expectedVal.length > maxLength && actualVal.length === maxLength) {
      return {
        success: false,
        truncated: true,
        actualValue: actualVal,
        expectedValue: expectedVal,
        message: `Value for '${schemaFieldName}' was truncated by host form maxLength (${maxLength} chars). Expected '${expectedVal}', got '${actualVal}'.`
      };
    }

    // Exact equivalence for non-select inputs
    if (el.tagName.toLowerCase() !== 'select' && actualVal !== expectedVal) {
      return {
        success: false,
        actualValue: actualVal,
        expectedValue: expectedVal,
        message: `Value mismatch after DOM commit for '${schemaFieldName}'. Expected '${expectedVal}', got '${actualVal}'.`
      };
    }

    return {
      success: true,
      actualValue: actualVal,
      message: `Successfully filled and verified '${schemaFieldName}' with '${value}'.`
    };
  }
}

if (typeof window !== 'undefined') {
  window.DOMFieldMapper = DOMFieldMapper;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DOMFieldMapper };
}
