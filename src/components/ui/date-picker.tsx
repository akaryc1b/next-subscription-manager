"use client"

import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({ date, onDateChange, placeholder = "选择日期" }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(date || new Date())
  const [isOpen, setIsOpen] = React.useState(false)

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // 转换为周一开始（0=周一，6=周日）
  }

  const generateCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)

    const days: (number | null)[] = []

    // 填充前面的空白
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    onDateChange(newDate)
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  const isSelectedDate = (day: number) => {
    if (!date) return false
    return (
      date.getDate() === day &&
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    )
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    )
  }

  return (
    <div className="flex w-full gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex-1 justify-start text-left font-normal h-10",
              !date && "text-foreground-secondary"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? formatDate(date) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-3">
            {/* 月份导航 */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="h-9 w-9 text-center text-xs text-foreground-secondary flex items-center justify-center"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendar().map((day, index) => {
                const selected = day ? isSelectedDate(day) : false
                const today = day ? isToday(day) : false

                return (
                  <div key={index} className="h-9 w-9">
                    {day ? (
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-9 w-9 p-0 font-normal",
                          selected && "bg-accent-primary text-accent-foreground hover:bg-accent-primaryHover",
                          today && !selected && "bg-background-hover text-foreground-primary"
                        )}
                        onClick={() => handleDateClick(day)}
                      >
                        {day}
                      </Button>
                    ) : (
                      <div />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {date && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => onDateChange(undefined)}
        >
          ×
        </Button>
      )}
    </div>
  )
}
