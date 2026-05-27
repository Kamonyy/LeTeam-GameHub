'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const GAME_ROOTS = ['/wordgame', '/dominoes', '/bara-alsalafa'] as const;

export default function StuckResetButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { hardResetPlayer } = useSocket();
  const router = useRouter();
  const pathname = usePathname();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await hardResetPlayer();
      const gameRoot = GAME_ROOTS.find((p) => pathname.startsWith(p));
      router.replace(gameRoot ?? '/');
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
