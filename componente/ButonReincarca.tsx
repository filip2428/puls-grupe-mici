"use client";

/** Buton de reîncercare pentru pagina „Fără semnal”. */
export function ButonReincarca() {
  return (
    <button
      type="button"
      className="buton buton-principal"
      onClick={() => window.location.reload()}
    >
      Încearcă din nou
    </button>
  );
}
