import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import {
    FileSpreadsheet,
    Download,
    Upload,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface AdminImportModalProps {
    onImport: (file: File) => Promise<void>;
    isLoading?: boolean;
}

export const AdminImportModal = ({ onImport, isLoading }: AdminImportModalProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const requiredHeaders = ["adminName", "username", "password", "email", "adminMobile"];

    // CSV Template Content
    const csvContent = "adminName,username,password,email,adminMobile\nDemo Admin,admin_demo,password123,admin@demo.com,9876543210";

    const isExcelFile = (file: File): boolean => {
        const allowedTypes = [
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
        ];
        const allowedExtensions = [".xls", ".xlsx", ".csv"];
        const fileExtension = file.name
            .substring(file.name.lastIndexOf("."))
            .toLowerCase();

        return (
            allowedTypes.includes(file.type) ||
            allowedExtensions.includes(fileExtension)
        );
    };

    const handleFileSelect = (file: File) => {
        if (!isExcelFile(file)) {
            toast.error("Invalid file type", {
                description: "Please upload only Excel files (.xlsx, .xls or .csv)",
            });
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const data = e.target?.result;
            try {
                let jsonData: any[] = [];

                if (file.name.endsWith(".csv")) {
                    // Basic CSV parsing for preview/validation if needed, 
                    // but relying on XLSX for robust parsing is better even for CSV if it supports it.
                    // For now, let's just use XLSX for everything as it handles CSV too.
                    const workbook = XLSX.read(data, { type: "binary" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    jsonData = XLSX.utils.sheet_to_json(sheet);
                } else {
                    const workbook = XLSX.read(data, { type: "binary" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    jsonData = XLSX.utils.sheet_to_json(sheet);
                }

                if (jsonData.length === 0) {
                    toast.error("Empty file", { description: "The uploaded file contains no data." });
                    return;
                }

                // Validate headers (check first item keys)
                const headers = Object.keys(jsonData[0]);
                const missing = requiredHeaders.filter(h => !headers.includes(h));

                if (missing.length > 0) {
                    toast.error("Invalid format", {
                        description: `Missing columns: ${missing.join(", ")}`
                    });
                    return;
                }

                setParsedData(jsonData);
                setSelectedFile(file);
                toast.success("File selected", {
                    description: `${file.name} - ${jsonData.length} records found`,
                });

            } catch (error) {
                console.error("Parse error:", error);
                toast.error("Failed to parse file");
            }
        };

        if (file.name.endsWith(".csv")) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const removeFile = () => {
        setSelectedFile(null);
        setParsedData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDownloadTemplate = () => {
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "admin_template.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Template downloaded");
    };

    const handleUpload = async () => {
        if (!parsedData.length || !selectedFile) return;

        await onImport(selectedFile);
        setIsOpen(false);
        removeFile();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Admins</DialogTitle>
                    <DialogDescription>
                        Upload an Excel/CSV file to create multiple admins at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Template Download */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Download Template</p>
                                    <p className="text-xs text-muted-foreground">Use this format for your file</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                                <Download className="h-4 w-4" />
                                Template
                            </Button>
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !isLoading && fileInputRef.current?.click()}
                        className={cn(
                            "relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors",
                            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                            selectedFile ? "bg-green-50/50 border-green-200" : "hover:bg-muted/50",
                            isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileInput}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                    <FileText className="h-6 w-6 text-green-600" />
                                </div>
                                <p className="font-medium text-green-900">{selectedFile.name}</p>
                                <p className="text-xs text-green-700 mt-1">{parsedData.length} records ready</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                    className="mt-2 h-auto py-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center space-y-2">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">XLSX, CSV (Max 5MB)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedFile && (
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
                            <Button onClick={handleUpload} disabled={isLoading} className="text-white">
                                {isLoading ? (
                                    <>
                                        <LoadingSpinner className="mr-2 h-4 w-4" />
                                        Importing...
                                    </>
                                ) : (
                                    "Start Import"
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
