import { Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { wasteColors } from '../lib/waste'
import type { WasteType } from '../types'

export const WasteIcon = ({ type }: { type: WasteType }) => (
  <span className="waste-icon" style={{ '--waste-color': wasteColors[type] } as CSSProperties}>
    <Trash2 size={17} />
  </span>
)
