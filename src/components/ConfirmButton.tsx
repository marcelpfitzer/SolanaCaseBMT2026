"use client";

// A submit button that asks "Are you sure?" first (for deleting things).

export default function ConfirmButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
