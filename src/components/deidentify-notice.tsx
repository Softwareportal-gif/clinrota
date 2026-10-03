export function DeidentifyNotice() {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Do not include the patient&apos;s name, ID number, or any contact
      information — use age range, sex, and clinical details only.
    </p>
  );
}
