// client/src/utils/conditionalLogic.js

function checkOneCondition(condition, answers) {
    if (!condition || !condition.questionKey || !condition.operator) {
      return true;
    }
  
    const answer = answers[condition.questionKey];
    const expected = condition.value;
    const op = condition.operator;
  
    if (answer === undefined || answer === null || answer === "") {
      return false;
    }
  
    if (op === "equals") {
      return String(answer) === String(expected);
    }
  
    if (op === "notEquals") {
      return String(answer) !== String(expected);
    }
  
    if (op === "contains") {
      if (Array.isArray(answer)) {
        return answer.includes(expected);
      }
      return String(answer)
        .toLowerCase()
        .includes(String(expected).toLowerCase());
    }
  
    return true;
  }
  
  export function shouldShowQuestion(rules, answers) {
    if (!rules || !rules.conditions || rules.conditions.length === 0) {
      return true;
    }
  
    const logic = rules.logic === "OR" ? "OR" : "AND";
  
    if (logic === "AND") {
      for (let i = 0; i < rules.conditions.length; i++) {
        const ok = checkOneCondition(rules.conditions[i], answers);
        if (!ok) return false;
      }
      return true;
    } else {
      for (let i = 0; i < rules.conditions.length; i++) {
        const ok = checkOneCondition(rules.conditions[i], answers);
        if (ok) return true;
      }
      return false;
    }
  }
  