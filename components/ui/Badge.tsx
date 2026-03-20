import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'accent' | 'primary' | 'orange' | 'green' | 'red'
  className?: string
}

export default function Badge({ children, variant = 'accent', className = '' }: BadgeProps) {
  const variants = {
    accent: 'bg-accent text-primary',
    primary: 'bg-primary text-white',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
