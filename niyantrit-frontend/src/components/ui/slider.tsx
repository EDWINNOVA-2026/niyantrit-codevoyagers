import { ChangeEvent } from "react";
import { cn } from "../../lib/utils";

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
}

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  className,
}: SliderProps) {
  const current = value[0] ?? min;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValueChange([Number(event.target.value)]);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={current}
      onChange={onChange}
      className={cn("h-2 w-full cursor-pointer accent-primary", className)}
    />
  );
}
