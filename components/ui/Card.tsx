import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-card border border-gray-100 p-4 transition-transform ${onClick ? 'cursor-pointer active:bg-gray-50 hover:-translate-y-px' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
