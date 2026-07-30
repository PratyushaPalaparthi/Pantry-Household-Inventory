"use client";

import { useState } from "react";

const CUSTOM = "__custom__";

export type OptionGroup = { label: string; options: string[] };

/**
 * A dropdown that can still accept a value outside its list.
 *
 * A plain <select> would be wrong here: an item saved with a category or a
 * storage location that isn't in the current list would silently lose it on the
 * next edit. So values not in the list switch the field into free-text mode
 * automatically, and "Other…" lets you enter a new one.
 */
export function OptionSelect({
  value,
  onChange,
  options,
  groups,
  required,
  placeholder,
  customPlaceholder = "Type a new value",
  emptyOptionLabel,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  groups?: OptionGroup[];
  required?: boolean;
  placeholder?: string;
  customPlaceholder?: string;
  /** Adds a leading blank option, e.g. "All locations" for a filter. */
  emptyOptionLabel?: string;
  id?: string;
}) {
  const flat = groups ? groups.flatMap((group) => group.options) : (options ?? []);
  const isKnown = value === "" || flat.some((option) => option.toLowerCase() === value.toLowerCase());
  const [custom, setCustom] = useState(!isKnown && value !== "");

  // Match case-insensitively so a stored "pantry" still selects "Pantry".
  const selected = custom ? CUSTOM : flat.find((o) => o.toLowerCase() === value.toLowerCase()) ?? "";

  function handleSelect(next: string) {
    if (next === CUSTOM) {
      setCustom(true);
      onChange("");
      return;
    }
    setCustom(false);
    onChange(next);
  }

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          className="input flex-1"
          required={required}
          autoFocus
          placeholder={customPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary !px-3 shrink-0 text-xs"
          onClick={() => {
            setCustom(false);
            onChange("");
          }}
        >
          List
        </button>
      </div>
    );
  }

  return (
    <select id={id} className="input" required={required} value={selected} onChange={(e) => handleSelect(e.target.value)}>
      <option value="">{emptyOptionLabel ?? placeholder ?? "Select…"}</option>
      {groups
        ? groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </optgroup>
          ))
        : flat.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
      <option value={CUSTOM}>Other…</option>
    </select>
  );
}
