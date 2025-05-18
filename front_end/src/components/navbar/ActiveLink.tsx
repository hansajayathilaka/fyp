"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import type { ReactNode } from "react"

interface ActiveLinkProps {
  href: string
  children: ReactNode
  className?: string
  activeClassName?: string
  exact?: boolean
}

export function ActiveLink({
  href,
  children,
  className = "",
  activeClassName = "",
  exact = false,
  ...props
}: ActiveLinkProps) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link href={href} className={`${className} ${isActive ? activeClassName : ""}`} {...props}>
      {children}
    </Link>
  )
}
