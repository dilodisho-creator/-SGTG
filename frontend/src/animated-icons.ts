import React, { useRef, useEffect, useImperativeHandle } from 'react';
import * as LM from 'lucide-motion';
import { Loader2 as LucideLoader2 } from 'lucide-react';

export { MotionIconConfig } from 'lucide-motion';

if (typeof window !== 'undefined') {
  const _consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('Function components cannot be given refs') ||
      msg.includes('mode="signature" used on icon')
    ) return;
    _consoleError(...args);
  };
  const _consoleWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('Reduced Motion')) return;
    _consoleWarn(...args);
  };
}

function createMotionIcon(IconComponent: any) {
  const Component = React.forwardRef<any, any>(function MotionIconWrapper(props, forwardedRef) {
    const internalRef = useRef<any>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current);

    useEffect(() => {
      const svg = internalRef.current?.node;
      if (!svg) return;

      const parent = svg.closest('button, a, [role="button"], .group, [data-motion-icon-group], label, tr') || svg;

      let isHovered = false;
      const onEnter = () => {
        if (isHovered) return;
        isHovered = true;
        try {
          internalRef.current?.play();
        } catch { }
      };

      const onLeave = () => {
        isHovered = false;
        try {
          internalRef.current?.reset();
        } catch { }
      };

      const onClick = () => {
        try {
          internalRef.current?.play();
        } catch { }
      };

      parent.addEventListener('mouseenter', onEnter);
      parent.addEventListener('mouseleave', onLeave);
      parent.addEventListener('click', onClick);

      return () => {
        parent.removeEventListener('mouseenter', onEnter);
        parent.removeEventListener('mouseleave', onLeave);
        parent.removeEventListener('click', onClick);
      };
    }, []);

    return React.createElement(IconComponent, {
      ref: internalRef,
      mode: props.mode || 'draw',
      trigger: props.trigger || 'manual',
      duration: props.duration || 0.45,
      ...props,
    });
  });

  Component.displayName = IconComponent?.displayName || IconComponent?.name || 'MotionIcon';
  return Component;
}

export const Archive = createMotionIcon(LM.Archive);
export const ArchiveRestore = createMotionIcon(LM.ArchiveRestore);
export const Bird = createMotionIcon(LM.Bird);
export const Building2 = createMotionIcon(LM.Building2);
export const Calendar = createMotionIcon(LM.Calendar);
export const CalendarDays = createMotionIcon(LM.CalendarDays);
export const CalendarPlus = createMotionIcon(LM.CalendarPlus);
export const CalendarRange = createMotionIcon(LM.CalendarRange);
export const ChevronDown = createMotionIcon(LM.ChevronDown);
export const ChevronLeft = createMotionIcon(LM.ChevronLeft);
export const ChevronRight = createMotionIcon(LM.ChevronRight);
export const ChevronsLeft = createMotionIcon(LM.ChevronsLeft);
export const ChevronsRight = createMotionIcon(LM.ChevronsRight);
export const ClipboardList = createMotionIcon(LM.ClipboardList);
export const ClipboardPlus = createMotionIcon(LM.ClipboardPlus);
export const Clock3 = createMotionIcon(LM.Clock3);
export const Crown = createMotionIcon(LM.Crown);
export const Database = createMotionIcon(LM.Database);
export const DatabaseBackup = createMotionIcon(LM.DatabaseBackup);
export const Download = createMotionIcon(LM.Download);
export const Eye = createMotionIcon(LM.Eye);
export const EyeOff = createMotionIcon(LM.EyeOff);
export const FileSpreadsheet = createMotionIcon(LM.FileSpreadsheet);
export const HardDrive = createMotionIcon(LM.HardDrive);
export const Hash = createMotionIcon(LM.Hash);
export const History = createMotionIcon(LM.History);
export const Info = createMotionIcon(LM.Info);
export const LayoutList = createMotionIcon(LM.LayoutList);
export const LockKeyhole = createMotionIcon(LM.LockKeyhole);
export const LogOut = createMotionIcon(LM.LogOut);
export const Maximize = createMotionIcon(LM.Maximize);
export const Medal = createMotionIcon(LM.Medal);
export const Minimize = createMotionIcon(LM.Minimize);
export const Minus = createMotionIcon(LM.Minus);
export const Moon = createMotionIcon(LM.Moon);
export const PanelLeftClose = createMotionIcon(LM.PanelLeftClose);
export const Pause = createMotionIcon(LM.Pause);
export const Pencil = createMotionIcon(LM.Pencil);
export const Phone = createMotionIcon(LM.Phone);
export const Play = createMotionIcon(LM.Play);
export const Plus = createMotionIcon(LM.Plus);
export const Printer = createMotionIcon(LM.Printer);
export const RefreshCw = createMotionIcon(LM.RefreshCw);
export const RotateCcw = createMotionIcon(LM.RotateCcw);
export const Save = createMotionIcon(LM.Save);
export const Scale = createMotionIcon(LM.Scale);
export const Search = createMotionIcon(LM.Search);
export const Settings2 = createMotionIcon(LM.Settings2);
export const ShieldAlert = createMotionIcon(LM.ShieldAlert);
export const ShieldCheck = createMotionIcon(LM.ShieldCheck);
export const Shuffle = createMotionIcon(LM.Shuffle);
export const SlidersHorizontal = createMotionIcon(LM.SlidersHorizontal);
export const Sparkles = createMotionIcon(LM.Sparkles);
export const SquareCheck = createMotionIcon(LM.SquareCheck);
export const Sun = createMotionIcon(LM.Sun);
export const Swords = createMotionIcon(LM.Swords);
export const Timer = createMotionIcon(LM.Timer);
export const ToggleLeft = createMotionIcon(LM.ToggleLeft);
export const ToggleRight = createMotionIcon(LM.ToggleRight);
export const Trash2 = createMotionIcon(LM.Trash2);
export const TriangleAlert = createMotionIcon(LM.TriangleAlert);
export const Trophy = createMotionIcon(LM.Trophy);
export const Upload = createMotionIcon(LM.Upload);
export const User = createMotionIcon(LM.User);
export const UserRound = createMotionIcon(LM.UserRound);
export const X = createMotionIcon(LM.X);
export const Zap = createMotionIcon(LM.Zap);
export const Check = createMotionIcon(LM.Check);
export const CircleCheck = createMotionIcon(LM.CircleCheck);
export const CircleCheckBig = createMotionIcon(LM.CircleCheckBig);
export const CircleX = createMotionIcon(LM.CircleX);
export const CheckCircle2 = CircleCheckBig;
export const CheckCircle = CircleCheck;
export const XCircle = CircleX;
export const AlertTriangle = TriangleAlert;
export const ArrowUpDown = createMotionIcon(LM.ArrowUpDown);
export const LayoutGrid = createMotionIcon(LM.LayoutGrid);
export const List = createMotionIcon(LM.List);
export const SortAsc = ArrowUpDown;
export const Filter = createMotionIcon(LM.Funnel);
export const Funnel = Filter;
export const Loader2 = React.forwardRef<SVGSVGElement, any>(function Loader2(
  { className = '', size = 24, trigger, mode, ...props },
  ref
) {
  return React.createElement(LucideLoader2, {
    ref,
    size,
    className: `animate-spin ${className}`,
    ...props,
  });
});