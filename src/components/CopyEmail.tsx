import { useEffect, useRef, useState } from 'react';

export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const field = document.createElement('textarea');
      field.value = email;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <span className="copy-email">
      <button type="button" className="button button--small" onClick={copy}>
        {copied ? 'Copied' : 'Copy email'}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'Email copied to clipboard.' : ''}</span>
    </span>
  );
}
