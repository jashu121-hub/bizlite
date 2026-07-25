'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value?: string
  defaultValue?: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  id?: string
  'aria-label'?: string
}

export function SearchInput({
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Search…',
  debounceMs = 300,
  className,
  id,
  'aria-label': ariaLabel = 'Search',
}: SearchInputProps) {
  const [inputValue, setInputValue] = React.useState(value ?? defaultValue)
  const onChangeRef = React.useRef(onChange)

  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value)
    }
  }, [value, inputValue])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      onChangeRef.current(inputValue)
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [inputValue, debounceMs])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleClear = () => {
    setInputValue('')
    onChangeRef.current('')
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {inputValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
