import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorksheetPrintDocument } from "@/components/worksheets/WorksheetPrintDocument";
import { readWorksheetPrintPayload } from "@/lib/worksheetPrint";

export default function WorksheetPrint() {
  const [params] = useSearchParams();
  const payload = useMemo(
    () => readWorksheetPrintPayload(params.get("id")),
    [params],
  );

  if (!payload) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold">Print view expired</h1>
        <p className="mt-3 text-muted-foreground">
          Open worksheets again and choose Print / Save PDF.
        </p>
        <Button asChild className="mt-6">
          <Link to="/worksheets">Back to worksheets</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-200 print:bg-white">
      <style>{`
        @page { size: letter; margin: 16mm; }
        @media print {
          html, body { background: white !important; }
        }
      `}</style>
      <div className="print:hidden sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[7.5in] flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Preview your worksheet, then print or save as PDF.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/worksheets">Close</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="py-6 print:py-0">
        <WorksheetPrintDocument
          title={payload.title}
          subtitle={payload.subtitle}
          questions={payload.questions}
          passages={payload.passages}
        />
      </div>
    </div>
  );
}
