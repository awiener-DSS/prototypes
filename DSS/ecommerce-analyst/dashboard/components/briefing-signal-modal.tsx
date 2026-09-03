'use client';

import { Sparkles, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type BriefingSignalModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  detail: string;
  badge?: string;
  severity?: 'high' | 'medium';
  analysis?: string;
  suggestion?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function BriefingSignalModal({
  open,
  onOpenChange,
  title,
  detail,
  badge,
  severity,
  analysis,
  suggestion,
  actionLabel,
  onAction,
}: BriefingSignalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {badge ? <Badge variant="secondary">{badge}</Badge> : null}
            {severity ? (
              <Badge className={severity === 'high' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}>
                {severity === 'high' ? 'High priority' : 'Watch'}
              </Badge>
            ) : null}
          </div>
          <DialogTitle className="text-left font-heading text-lg leading-snug">{title}</DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            {detail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {analysis ? (
            <section className="rounded-lg border border-border/70 bg-muted/30 p-4">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                <Sparkles className="size-3.5" /> Analysis
              </p>
              <p className="text-sm leading-relaxed text-foreground">{analysis}</p>
            </section>
          ) : null}

          {suggestion ? (
            <section className="rounded-lg border border-primary/20 bg-primary/[.04] p-4">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-primary">
                <Wrench className="size-3.5" /> Suggested fix
              </p>
              <p className="text-sm leading-relaxed text-foreground">{suggestion}</p>
            </section>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 gap-3 border-t border-border/70 bg-transparent px-6 py-5 sm:justify-between">
          {actionLabel && onAction ? (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onAction();
              }}
            >
              {actionLabel}
            </Button>
          ) : <span />}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
