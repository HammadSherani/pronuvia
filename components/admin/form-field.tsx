interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  children?: React.ReactNode;
}

export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor={name}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children ?? (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#3DBFA4] focus:ring-1 focus:ring-[#3DBFA4] transition bg-white"
        />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function FormActions({
  backHref,
  submitLabel = "Save",
  pending = false,
}: {
  backHref: string;
  submitLabel?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="submit"
        disabled={pending}
        className="bg-[#3DBFA4] hover:bg-[#35ab93] disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
      <a
        href={backHref}
        className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
      >
        Cancel
      </a>
    </div>
  );
}
