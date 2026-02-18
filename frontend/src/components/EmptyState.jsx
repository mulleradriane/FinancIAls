import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl bg-secondary/5 animate-in fade-in zoom-in duration-300",
      className
    )}>
      {Icon && (
        <div className="p-4 bg-primary/5 rounded-full mb-4">
          <Icon className="h-10 w-10 text-primary/40" />
        </div>
      )}
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
        {description}
      </p>
      {actionLabel && (
        <Button
          onClick={onAction}
          className="mt-6 rounded-xl shadow-lg shadow-primary/10"
        >
          <Plus className="mr-2 h-4 w-4" /> {actionLabel}
        </Button>
      )}
    </div>
  );
}
