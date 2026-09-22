"use client";

import { useEffect, useRef, useState } from "react";

import { dataNumerica } from "@/lib/util/date";

/**
 * Câmp de dată care arată mereu data pe românește: 01.10.2026.
 *
 * Câmpul de dată al browserului se scrie după limba browserului, nu după a
 * paginii - pe un telefon sau laptop setat în engleză ar apărea 10/01/2026,
 * adică luna înaintea zilei. Aici textul îl scriem noi, iar câmpul adevărat
 * stă deasupra, transparent: la apăsare se deschide tot calendarul lui, iar
 * formularul primește valoarea lui (AAAA-LL-ZZ), ca până acum.
 *
 * Câmpul adevărat rămâne necontrolat, ca să se golească singur când
 * formularul e resetat după salvare; textul de afișat îl urmează.
 */
export function CampData({
  id,
  name,
  defaultValue,
  className = "camp",
  required,
  min,
  max,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  className?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  const [valoare, setValoare] = useState(defaultValue ?? "");
  const camp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const formular = camp.current?.form;
    if (!formular) return;
    // Evenimentul vine înainte ca browserul să pună valorile la loc.
    const laReset = () => setTimeout(() => setValoare(camp.current?.value ?? ""));
    formular.addEventListener("reset", laReset);
    return () => formular.removeEventListener("reset", laReset);
  }, []);

  return (
    <div className={`relative ${className.includes("flex-1") ? "flex-1" : ""}`}>
      <span
        aria-hidden
        className={`${className} flex items-center justify-between gap-2 ${
          valoare ? "" : "text-cenusiu"
        }`}
      >
        {valoare ? dataNumerica(valoare) : "zz.ll.aaaa"}
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-cenusiu"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="3" y="4.5" width="14" height="12" rx="2" />
          <path d="M3 8.5h14M7 3v3M13 3v3" />
        </svg>
      </span>
      <input
        ref={camp}
        id={id}
        name={name}
        type="date"
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        onChange={(e) => setValoare(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // Unele browsere nu lasă deschiderea din cod; acolo merge apăsarea obișnuită.
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

