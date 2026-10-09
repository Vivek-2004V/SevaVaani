// SEVA VAANI - DOM Field Mapper & Conservative Form Autofill Guard
// Complies with PRD & TRD: Zero unconfirmed commits, zero auto-submits, strictly excludes sensitive inputs.

const SENSITIVE_KEYWORDS = ['password', 'otp', 'captcha', 'token', 'secret', 'cvv', 'card', 'pin', 'aadhaar', 'pan'];

const FIELD_SYNONYMS = {
  full_name: ['name', 'fullname', 'full_name', 'applicant_name', 'student_name', 'candidate_name', 'naam', 'नाम', 'नाव', 'पूर्ण नाव'],
  dob: ['dob', 'birth', 'date_of_birth', 'birth_date', 'janm', 'जन्मतारीख', 'जन्म तिथि', 'जन्म तारीख'],
  mobile: ['mobile', 'phone', 'contact', 'mobile_no', 'mobile_number', 'phone_number', 'मोबाइल', 'मोबाईल', 'संपर्क'],
  college: ['college', 'institute', 'institution', 'university', 'college_name', 'संस्थान', 'महाविद्यालय', 'कॉलेज'],
  course: ['course', 'degree', 'branch', 'program', 'course_name', 'डिग्री', 'अभ्यासक्रम', 'कोर्स'],
  academic_year: ['year', 'academic_year', 'current_year', 'वर्ष', 'शैक्षणिक वर्ष'],
  annual_income: ['income', 'annual_income', 'family_income', 'salary', 'वार्षिक आय', 'उत्पन्न', 'कौटुंबिक उत्पन्न'],
  category: ['category', 'caste', 'social_category', 'reservation', 'वर्ग', 'प्रवर्ग', 'सामाजिक वर्ग', 'श्रेणी'],
  district: ['district', 'city', 'domicile_district', 'home_district', 'जिला', 'जिल्हा', 'शहर'],
  document_status: ['document', 'document_status', 'doc_status', 'certificate', 'दस्तावेज़', 'कागदपत्र']
};

export class DOMFieldMapper {
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
    if (type === 'password' || type === 'submit' || type === 'button') return true;

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
      labelText: labelText.trim(),
      tagName: el.tagName.toLowerCase(),
      type: el.type || 'text'
    };
  }

  static matchToSchema(descriptor) {
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
   */
  static fillField(schemaFieldName, value) {
    const candidates = this.scanFormFields();
    const target = candidates.find(c => c.matchedSchemaField === schemaFieldName);

    if (!target) {
      return { success: false, message: `No matching form input found on page for '${schemaFieldName}'.` };
    }

    const el = target.element;

    // Visual pulse indication
    const originalOutline = el.style.outline;
    const originalBg = el.style.backgroundColor;
    el.style.outline = '3px solid #22c55e';
    el.style.backgroundColor = '#f0fdf4';

    setTimeout(() => {
      el.style.outline = originalOutline;
      el.style.backgroundColor = originalBg;
    }, 2000);

    // Populate value safely
    if (el.tagName.toLowerCase() === 'select') {
      // Find matching option
      let found = false;
      for (const opt of Array.from(el.options)) {
        if (opt.value.toLowerCase() === String(value).toLowerCase() || opt.text.toLowerCase().includes(String(value).toLowerCase())) {
          el.value = opt.value;
          found = true;
          break;
        }
      }
      if (!found && el.options.length > 0) {
        el.value = value;
      }
    } else {
      el.value = value;
    }

    // Dispatch synthetic input and change events for framework binding
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));

    return {
      success: true,
      message: `Successfully filled '${schemaFieldName}' with '${value}'.`
    };
  }
}

if (typeof window !== 'undefined') {
  window.DOMFieldMapper = DOMFieldMapper;
}
