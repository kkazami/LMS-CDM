# Repair context (non-authoritative)

Use only immutable failure evidence from the active v2 run. Include run ID, attempt, failure IDs, root cause, approved file scope and proposed repair tasks. The repair proposal cannot edit the plan, relax acceptance criteria, change policies or approve itself. Use controller repair, then executor, test author, full runner validation and all independent reviews. Five repairs maximum; repeated failures escalate.
