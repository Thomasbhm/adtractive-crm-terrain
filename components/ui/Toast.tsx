'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg text-center font-medium transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {message}
    </div>
  )
}
