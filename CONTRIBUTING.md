# Contributing

1. Keep the local demo free of real or identifying case data.
2. Keep scoring and routing rules explicit, explainable, validated, and covered by tests.
3. Never make a score an eligibility decision or allow it to trigger a service, payment, or government action.
4. Preserve the human review gate and document any changes to the review lifecycle.
5. Run `npm test` before submitting changes. The project intentionally has no third-party runtime dependencies.
6. Update the architecture and safety documentation when workflow or data boundaries change.
