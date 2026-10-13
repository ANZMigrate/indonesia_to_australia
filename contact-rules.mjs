/* ANZ Migrate contact rules — shared by client and server.
 * Mirrors the enabled conditions supplied in contact-schema.json.
 */
const normalized = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value === true) return 'Yes';
  if (value === false || value == null) return '';
  return String(value).trim();
};
const same = (a, b) => normalized(a) === normalized(b);
const checkRule = (rule, values, visible) => {
  const value = visible[rule.fieldKey] === false ? '' : values[rule.fieldKey];
  const rhs = rule.value;
  switch (rule.operator) {
    case 'equals': return same(value, rhs);
    // An unanswered question is not an answer that differs from a choice.
    case 'not_equals': return normalized(value) !== '' && !same(value, rhs);
    case 'is_empty': return normalized(value) === '';
    case 'is_not_empty': return normalized(value) !== '';
    case 'contains': return normalized(value).includes(normalized(rhs));
    case 'not_contains': return normalized(value) !== '' && !normalized(value).includes(normalized(rhs));
    default: return false;
  }
};
const checkCondition = (condition, values, visible) => {
  return (condition.ruleGroups || []).some(group => {
    const rules = group.rules || [];
    if (!rules.length) return false;
    return group.matchType === 'any'
      ? rules.some(rule => checkRule(rule, values, visible))
      : rules.every(rule => checkRule(rule, values, visible));
  });
};
export function evaluateForm(schema, answers) {
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  const conditions = (schema?.conditions || []).filter(c => c.enabled !== false);
  const keys = fields.map(field => field.key);
  const controlled = new Set(conditions.flatMap(condition =>
    [...(condition.actions || []), ...(condition.elseActions || [])]
      .filter(action => ['show_field', 'hide_field'].includes(action.action))
      .map(action => action.fieldKey)
  ));
  const values = Object.fromEntries(keys.map(key => [key, answers?.[key]]));
  let visible = Object.fromEntries(keys.map(key => [key, !controlled.has(key)]));
  let optionVisibility = {};
  for (let pass = 0; pass < 12; pass++) {
    const next = Object.fromEntries(keys.map(key => [key, !controlled.has(key)]));
    const options = {};
    fields.forEach(field => {
      if (Array.isArray(field.options) && field.options.length) {
        options[field.key] = Object.fromEntries(field.options.map(option => [option.value, true]));
      }
    });
    for (const condition of conditions) {
      const matched = checkCondition(condition, values, visible);
      for (const action of (matched ? condition.actions : condition.elseActions) || []) {
        if (action.action === 'show_field' && action.fieldKey in next) next[action.fieldKey] = true;
        else if (action.action === 'hide_field' && action.fieldKey in next) next[action.fieldKey] = false;
        else if (action.action === 'show_option' && options[action.fieldKey]) options[action.fieldKey][action.optionValue] = true;
        else if (action.action === 'hide_option' && options[action.fieldKey]) options[action.fieldKey][action.optionValue] = false;
      }
    }
    // The status question precedes purpose in the published questionnaire.
    // A destination alone must not reveal purpose before status is answered.
    if (!normalized(values.visaStatus)) next.purpose = false;
    optionVisibility = options;
    if (keys.every(key => next[key] === visible[key])) {
      visible = next;
      break;
    }
    visible = next;
  }
  // Both options and follow-up questions should not retain values when hidden.
  return { visible, optionVisibility };
}
export function collectAllowedAnswers(schema, raw) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const allowed = new Set((schema.fields || []).map(field => field.key));
  return Object.fromEntries(Object.entries(input).filter(([key]) => allowed.has(key)));
}
