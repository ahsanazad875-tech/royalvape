import { ToasterService } from '@abp/ng.theme.shared';

export function showHttpError(toast: ToasterService, err: any, fallback = 'Something went wrong.') {
  const a = (err?.error?.error || err?.error) ?? {};
  const validation = Array.isArray(a?.validationErrors)
    ? a.validationErrors.map((v: any) => v.message).filter(Boolean).join('\n')
    : '';
  const msg = validation || a?.message || a?.details || fallback;
  toast.error(msg);
}
