import { updateDraftStatusAction } from "@/app/dashboard/drafts/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Draft } from "@/types/draft"

export function DraftStatusForm({ draft }: { draft: Draft }) {
  return (
    <form action={updateDraftStatusAction} className="space-y-3">
      <input type="hidden" name="draftId" value={draft.id} />

      <div className="space-y-2">
        <Label htmlFor={`approvalNotes-${draft.id}`}>Approval notes</Label>
        <Textarea
          id={`approvalNotes-${draft.id}`}
          name="approvalNotes"
          defaultValue={draft.approvalNotes ?? ""}
          rows={3}
          placeholder="Optional notes for the human review trail."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="nextStatus" value="approved">
          Approve
        </Button>
        <Button type="submit" variant="secondary" name="nextStatus" value="rejected">
          Reject
        </Button>
      </div>
    </form>
  )
}
