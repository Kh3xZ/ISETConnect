import React from 'react';
import Svg, { Circle, G, Line, Path, Polyline } from 'react-native-svg';


export function LogoMark({ size = 32, accent = '#E7E9EA' }: { size?: number; accent?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M4.5 5.5H10.4L16 17.8L21.6 5.5H27.5L18.4 26.5H13.6L4.5 5.5Z" fill="#E7E9EA" />
      <Path d="M13.6 5.5H18.4L16 11.1L13.6 5.5Z" fill={accent} />
    </Svg>
  );
}

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
      <Path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.01v3.14C3.05 21.23 7.24 24 12 24Z" />
      <G transform="translate(0 1.3)">
        <Path fill="#FBBC05" d="M5.03 14.04c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.18H1.01C.37 7.45 0 8.88 0 10.38s.37 2.93 1.01 4.2l4.02-3.14Z" />
      </G>
      <Path fill="#EA4335" d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.77 1.01 6.82l4.02 3.14c.98-2.94 3.73-5.21 6.97-5.21Z" />
    </Svg>
  );
}

export function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#E7E9EA">
      <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </Svg>
  );
}

export function EyeIcon({ size = 19, color = '#71767B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

export function EyeOffIcon({ size = 19, color = '#71767B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <Path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <Line x1={2} x2={22} y1={2} y2={22} />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color = '#E7E9EA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 18, color = '#71767B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}


interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function Stroke({ size = 20, color = '#71767B', strokeWidth = 1.75, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const RefreshIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.85}>
    <Path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <Path d="M3 3v5h5" />
    <Path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <Path d="M16 16h5v5" />
  </Stroke>
);

export const CommentIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Stroke>
);

export function HeartIcon({ size = 20, color = '#71767B', filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </Svg>
  );
}

export const LinkIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Stroke>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <Path d="m9 18 6-6-6-6" />
  </Stroke>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 2}>
    <Path d="m15 18-6-6 6-6" />
  </Stroke>
);

export const PlusIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 2.3}>
    <Line x1={12} y1={5} x2={12} y2={19} />
    <Line x1={5} y1={12} x2={19} y2={12} />
  </Stroke>
);

export const HomeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Stroke>
);

export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Circle cx={11} cy={11} r={8} />
    <Path d="m21 21-4.3-4.3" />
  </Stroke>
);

export const UsersIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx={9} cy={7} r={4} />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Stroke>
);

export const BookIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </Stroke>
);

export const UserIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Circle cx={12} cy={8} r={4} />
    <Path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
  </Stroke>
);

export const AlertCircleIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Circle cx={12} cy={12} r={10} />
    <Line x1={12} y1={8} x2={12} y2={12} />
    <Line x1={12} y1={16} x2={12.01} y2={16} />
  </Stroke>
);

export const FileIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <Polyline points="14 2 14 8 20 8" />
  </Stroke>
);

export const HashIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.9}>
    <Line x1={4} y1={9} x2={20} y2={9} />
    <Line x1={4} y1={15} x2={20} y2={15} />
    <Line x1={10} y1={3} x2={8} y2={21} />
    <Line x1={16} y1={3} x2={14} y2={21} />
  </Stroke>
);

export const GlobeIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.85}>
    <Circle cx={12} cy={12} r={10} />
    <Line x1={2} y1={12} x2={22} y2={12} />
    <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Stroke>
);

export const LockIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <Path d="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Stroke>
);

export const EditIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <Path d="M12 20h9" />
    <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Stroke>
);

export const TrashIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <Path d="M3 6h18" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Stroke>
);

export const MoreIcon = (p: IconProps) => (
  <Svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill={p.color ?? '#71767B'}>
    <Circle cx={5} cy={12} r={1.8} />
    <Circle cx={12} cy={12} r={1.8} />
    <Circle cx={19} cy={12} r={1.8} />
  </Svg>
);

export const LogOutIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1={21} y1={12} x2={9} y2={12} />
  </Stroke>
);

export const DownloadIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.85}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="7 10 12 15 17 10" />
    <Line x1={12} y1={15} x2={12} y2={3} />
  </Stroke>
);

export const PaperclipIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Stroke>
);
