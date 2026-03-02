import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const InfoTooltip = ({
  content,
  side = "top",
  align = "center",
  className = "",
  icon: Icon = Info,
  delayDuration = 300
}) => {
  return (
    <UiTooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Informações"
        >
          <Icon className={`h-[14px] w-[14px] text-muted-foreground ${className}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className="max-w-[250px] text-center bg-popover text-popover-foreground shadow-lg"
      >
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </UiTooltip>
  );
};

export default InfoTooltip;
