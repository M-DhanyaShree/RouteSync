import React from 'react'
import { cn } from '../../utils/cn'
import PropTypes from 'prop-types'

export const Card = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border bg-card text-card-foreground shadow-sm bg-white dark:bg-slate-900",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
Card.displayName = "Card"
Card.propTypes = { className: PropTypes.string, children: PropTypes.node }

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"
CardHeader.propTypes = { className: PropTypes.string }

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"
CardTitle.propTypes = { className: PropTypes.string }

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"
CardContent.propTypes = { className: PropTypes.string }
