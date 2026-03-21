import { Button } from '@/components/ui/button';

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
      <div className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
