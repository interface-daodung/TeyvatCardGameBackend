/**
 * Layout & styles cho thanh FAB neo đáy (drawer / portal), nút “peek” dọc cạnh màn hình.
 */

/** Vỏ fixed: canh với sidebar md+, safe-area bottom */
export const bottomDockFabShellClassName =
  'pointer-events-none fixed inset-x-0 bottom-0 z-[95] flex items-end justify-start pl-11 pr-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-0 md:pl-[calc(16rem+2.5rem)] md:pr-8';

export const dockFabButtonRowClassName =
  'inline-flex flex-row items-start gap-2.5';

/** Phần chung mọi nút peek (chiều cao “tay cầm”, hover nhô lên, focus full) */
export const dockPeekFabButtonBaseClassName =
  'flex h-[300px] w-16 shrink-0 translate-y-[240px] cursor-pointer items-start justify-center rounded-full border-0 pt-[18px] text-white shadow-[0_4px_14px_rgba(0,0,0,0.15),0_1px_4px_rgba(0,0,0,0.08)] outline-none transition-[opacity,filter,transform] duration-200 ease-out hover:translate-y-[200px] hover:opacity-[0.88] hover:brightness-[1.06] focus-visible:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 motion-reduce:translate-y-0 disabled:pointer-events-none disabled:opacity-40';

export const dockPeekFabIconClassName = 'h-[22px] w-[22px]';

export type DockPeekFabTone =
  | 'destructive'
  | 'primary'
  | 'slate'
  | 'slateActive'
  /** Luồng AST / cây: đóng — xanh biển */
  | 'astFlowOff'
  /** Luồng AST / cây: mở — vàng */
  | 'astFlowOn';

export const dockPeekFabToneClassName: Record<DockPeekFabTone, string> = {
  destructive: 'bg-[#ef4444]',
  primary: 'bg-[#2563eb]',
  slate: 'bg-slate-600 hover:bg-slate-700 focus-visible:outline-white/70',
  slateActive:
    'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-200/80',
  astFlowOff:
    'bg-[#0369a1] text-white hover:bg-[#075985] focus-visible:outline-sky-200/80',
  astFlowOn:
    'bg-[#eab308] text-slate-900 hover:bg-[#ca8a04] focus-visible:outline-amber-900/40',
};
