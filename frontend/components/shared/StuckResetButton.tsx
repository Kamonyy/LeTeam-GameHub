'use client';

import { useState } from 'react';
import { useHardResetPlayer } from '@/lib/hub/HardResetContext';
import { useViewNavigator } from '@/lib/hub/ViewTransitionProvider';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

export default function StuckResetButton() {
  const [open, setOpen] = useState(false);
  const hardResetPlayer = useHardResetPlayer();
  const navigateWithTransition = useViewNavigator();

  const handleConfirm = () => {
    setOpen(false);
    void hardResetPlayer().finally(() => {
      navigateWithTransition('/', { replace: true });
    });
  };

  return (
    <>
      <button
        type="button"
        className="stuck-reset-btn"
        dir="rtl"
        lang="ar"
        onClick={() => setOpen(true)}
        aria-label="كموني ساعندي — إعادة ضبط الجلسة"
      >
        كموني ساعندي
      </button>

      <ConfirmDialog
        open={open}
        title="كموني ساعندي"
        message="دوس هاي الدكمة من تعصة بيك الدنيا. راح تنظف اللوبي واللعبة وترجع للصفحة الرئيسية — اسمك ونفس حسابك يبقون."
        confirmLabel="نعم، نضّف كلشي"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
