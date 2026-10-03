const STEPS = [
  { key: "subjective", label: "Subjective" },
  { key: "objective", label: "Objective" },
  { key: "assessment", label: "Assessment" },
  { key: "plan", label: "Plan" },
] as const;

export function LogWizardSteps({ current }: { current: (typeof STEPS)[number]["key"] }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((step, i) => (
        <li
          key={step.key}
          className={`flex items-center gap-2 ${
            i === currentIndex ? "font-semibold text-blue-700" : "text-gray-400"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              i === currentIndex
                ? "bg-blue-600 text-white"
                : i < currentIndex
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
            }`}
          >
            {i + 1}
          </span>
          {step.label}
          {i < STEPS.length - 1 && <span className="text-gray-300">→</span>}
        </li>
      ))}
    </ol>
  );
}
