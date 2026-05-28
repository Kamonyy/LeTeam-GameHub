'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHardResetPlayer } from '@/lib/hub/HardResetContext';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

export default function StuckResetButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const hardResetPlayer = useHardResetPlayer();
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await hardResetPlayer();
      router.replace('/');
      setOpen(false);
    } finally {
      setLoading(false);
    }
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
        message="دوس هاي الدكمة من تعصة بيك الدنيا. راح تطلع من اللوبي وتنضف الجلسة، بس اسمك يبقى."
        confirmLabel="نعم، نضّف كلشي"
        cancelLabel="إلغاء"
        variant="danger"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!loading) setOpen(false);
        }}
      />
    </>
  );
}
