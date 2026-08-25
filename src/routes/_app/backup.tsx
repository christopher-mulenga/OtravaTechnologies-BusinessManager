import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DataTable, PageHeader, Td } from "@/components/otrava/primitives";
import { downloadText, formatDateTime } from "@/lib/otrava/format";
import { useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/backup")({
  component: BackupPage,
});

function BackupPage() {
  const backups = useOtravaStore((s) => s.backups);
  const exportBackup = useOtravaStore((s) => s.exportBackup);
  const saveLocalBackup = useOtravaStore((s) => s.saveLocalBackup);
  const restoreBackup = useOtravaStore((s) => s.restoreBackup);
  const restoreLocalBackup = useOtravaStore((s) => s.restoreLocalBackup);
  const deleteLocalBackup = useOtravaStore((s) => s.deleteLocalBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);

  const downloadNow = async () => {
    const record = await saveLocalBackup("Manual backup");
    const pkg = exportBackup();
    const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
    downloadText(
      `OtravaBackup_${stamp}.json`,
      JSON.stringify(pkg, null, 2),
      "application/json",
    );
    toast.success("Backup downloaded and stored locally.");
    return record;
  };

  return (
    <div>
      <PageHeader
        title="Backup & restore"
        description="Keep a copy of the entire local database, including company branding. Restore never overwrites without confirmation, and a safety copy is created first."
        actions={<Button onClick={() => void downloadNow()}>Create backup</Button>}
      />
      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Restore from file</h2>
        <p className="mt-1 text-sm text-muted">
          Choose an Otrava backup file. The current database will be copied first.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="mt-3 block text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setFileText(await file.text());
          }}
        />
        <Button
          className="mt-3"
          variant="outline"
          disabled={!fileText}
          onClick={() => setPendingRestore("file")}
        >
          Restore selected file
        </Button>
      </div>

      <h2 className="mb-3 font-semibold">Local backup history</h2>
      {backups.length === 0 ? (
        <p className="text-sm text-muted">No local backups yet.</p>
      ) : (
        <DataTable columns={["Created", "Label", "Type", ""]}>
          {backups.map((b) => (
            <tr key={b.id}>
              <Td>{formatDateTime(b.createdAt)}</Td>
              <Td>{b.label}</Td>
              <Td>{b.automatic ? "Automatic" : "Manual"}</Td>
              <Td className="text-right">
                <Button variant="ghost" size="sm" onClick={() => setPendingRestore(b.id)}>
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await deleteLocalBackup(b.id);
                    toast.success("Backup removed.");
                  }}
                >
                  Delete
                </Button>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        onOpenChange={(v) => !v && setPendingRestore(null)}
        title="Restore this backup?"
        description="A safety copy of the current database will be created first. The app will then reload the restored records."
        confirmLabel="Restore"
        onConfirm={async () => {
          try {
            if (pendingRestore === "file") {
              if (!fileText) throw new Error("No file selected.");
              await restoreBackup(fileText);
            } else if (pendingRestore) {
              await restoreLocalBackup(pendingRestore);
            }
            toast.success("Backup restored.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Restore failed.");
            throw err;
          }
        }}
      />
    </div>
  );
}
