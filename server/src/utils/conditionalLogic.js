// server/src/utils/conditionalLogic.js

// One condition:
// {
//   questionKey: string;
//   operator: "equals" | "notEquals" | "contains";
//   value: any;
// }

function checkOneCondition(condition, answersSoFar) {
  if (!condition || !condition.questionKey || !condition.operator) {
    // bad rule → don't hide because of it
    return true;
  }

  const answer = answersSoFar[condition.questionKey];
  const expected = condition.value;
  const op = condition.operator;

  // no answer yet → condition not satisfied
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

  // unknown operator → don't hide
  return true;
}

// rules object:
// {
//   logic: "AND" | "OR";
//   conditions: Condition[];
// }
export function shouldShowQuestion(rules, answersSoFar) {
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    // no rules → always show
    return true;
  }

  const logic = rules.logic === "OR" ? "OR" : "AND";

  if (logic === "AND") {
    for (let i = 0; i < rules.conditions.length; i++) {
      const ok = checkOneCondition(rules.conditions[i], answersSoFar);
      if (!ok) {
        return false;
      }
    }
    return true;
  } else {
    // logic === "OR"
    for (let i = 0; i < rules.conditions.length; i++) {
      const ok = checkOneCondition(rules.conditions[i], answersSoFar);
      if (ok) {
        return true;
      }
    }
    return false;
  }
}
