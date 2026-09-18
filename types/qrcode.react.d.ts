declare module 'qrcode.react' {
  import type { ComponentType } from 'react'

  const QRCode: ComponentType<{
    value: string
    size?: number
    level?: 'L' | 'M' | 'Q' | 'H'
    includeMargin?: boolean
  }>

  export default QRCode
}
