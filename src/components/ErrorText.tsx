/**
 * What went wrong, said in red right where the user was looking. Renders
 * nothing when there is nothing to report, so a screen can hand over its error
 * state without guarding it first.
 *
 * `role="alert"` is kept because the e2e suite reaches for it, not for
 * compliance.
 */
export function ErrorText({
  message,
}: Readonly<{ message: string | null | undefined }>) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
