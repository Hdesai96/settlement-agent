from app.models import Settlement, UserProfile, MatchResult


def _evaluate_rule(rule, profile: UserProfile):
    if rule.field == "brands_used":
        actual = [x.lower() for x in profile.brands_used]
    elif rule.field == "state":
        actual = profile.state
    else:
        actual = profile.answers.get(rule.field)

    if actual is None:
        return None

    expected = rule.value

    if rule.operator == "equals":
        return str(actual).lower() == str(expected).lower()

    if rule.operator == "contains":
        if isinstance(actual, list):
            return str(expected).lower() in [str(x).lower() for x in actual]
        return str(expected).lower() in str(actual).lower()

    if rule.operator == "in":
        values = expected if isinstance(expected, list) else [expected]
        return str(actual).lower() in [str(x).lower() for x in values]

    if rule.operator == "gte":
        return float(actual) >= float(expected)

    if rule.operator == "lte":
        return float(actual) <= float(expected)

    raise ValueError(f"Unsupported operator: {rule.operator}")


def match_settlement(settlement: Settlement, profile: UserProfile) -> MatchResult:
    reasons: list[str] = []
    missing_fields: list[str] = []

    for rule in settlement.eligibility_rules:
        result = _evaluate_rule(rule, profile)

        if result is None:
            missing_fields.append(rule.field)
            continue

        if result is False:
            return MatchResult(
                settlement_id=settlement.id,
                settlement_name=settlement.name,
                status="unlikely",
                reasons=[f"Rule not met: {rule.field} {rule.operator} {rule.value}"],
                missing_fields=[],
            )

        reasons.append(f"Matched: {rule.field} {rule.operator} {rule.value}")

    status = "possible" if missing_fields else "likely"

    return MatchResult(
        settlement_id=settlement.id,
        settlement_name=settlement.name,
        status=status,
        reasons=reasons,
        missing_fields=missing_fields,
    )
