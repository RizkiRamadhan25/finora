'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, type LucideIcon } from 'lucide-react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useId, useRef } from 'react';
import type { Translate } from './i18n';

export function Button({ className = '', kind = 'secondary', ...props }: ComponentPropsWithRef<'button'> & { kind?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button type="button" className={`button button-${kind} ${className}`} {...props} />;
}

export function Modal({ title, description, onClose, children, t }: {
  title: string; description?: string; onClose: () => void; children: ReactNode; t: Translate;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay" />
      <Dialog.Content ref={content} className="modal" {...(!description && { 'aria-describedby': undefined })}
        onOpenAutoFocus={event => {
          if (document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
          const first = content.current?.querySelector<HTMLElement>('[data-modal-focus]');
          if (first) { event.preventDefault(); first.focus(); }
        }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (document.querySelector('[role="dialog"]')) return;
          if (opener.current?.isConnected) opener.current.focus();
          else document.querySelector<HTMLElement>('main h1')?.focus();
        }}>
        <div className="modal-heading">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close asChild><Button kind="ghost" className="icon-button" aria-label={t('close')}><X size={19} /></Button></Dialog.Close>
        </div>
        {description && <Dialog.Description className="muted modal-description">{description}</Dialog.Description>}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function Field({ label, error, hint, children }: {
  label: string; error?: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode;
}) {
  const id = useId();
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {children(id, error || hint ? `${id}-help` : undefined)}
    {(error || hint) && <small id={`${id}-help`} className={error ? 'field-error' : 'muted'}>{error || hint}</small>}
  </div>;
}

export function Empty({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children?: ReactNode }) {
  return <div className="empty">
    <div className="empty-icon"><Icon size={22} strokeWidth={1.7} /></div>
    <strong>{title}</strong>
    {description && <p>{description}</p>}
    {children}
  </div>;
}
