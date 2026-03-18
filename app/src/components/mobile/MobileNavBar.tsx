interface MobileNavBarProps {
  onBack: () => void
  breadcrumb: string
  biomeColor?: string
  showClose?: boolean
  onClose?: () => void
}

export default function MobileNavBar({
  onBack,
  breadcrumb,
  biomeColor,
  showClose = true,
  onClose,
}: MobileNavBarProps) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-4"
      style={{
        height: 44,
        background: 'rgba(8,20,16,0.95)',
        borderBottom: '0.5px solid rgba(232,213,160,0.08)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="font-mono text-[10px] active:opacity-50"
          style={{ color: 'rgba(232,213,160,0.5)', transition: 'opacity 150ms ease' }}
        >
          ← BACK
        </button>
        <div style={{ width: 1, height: 12, background: 'rgba(232,213,160,0.15)' }} />
        <div className="flex items-center gap-1.5">
          {biomeColor && (
            <div
              className="rounded-full flex-shrink-0"
              style={{ width: 5, height: 5, background: biomeColor }}
            />
          )}
          <span
            className="font-mono text-[10px] tracking-[0.05em]"
            style={{ color: 'rgba(232,213,160,0.5)' }}
          >
            {breadcrumb}
          </span>
        </div>
      </div>
      {showClose && (
        <button
          onClick={onClose ?? onBack}
          className="font-mono text-[12px]"
          style={{ color: 'rgba(232,213,160,0.4)' }}
        >
          ×
        </button>
      )}
    </div>
  )
}
