import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DeviceData } from "@/types/socket";

export const exportToExcel = (data: DeviceData[], filename: string) => {
    const exportData = data.map((vehicle) => ({
        "Vehicle Name": vehicle.name,
        "IMEI": vehicle.uniqueId || vehicle.imei,
        "Status": (() => {
            const status = (vehicle.category || vehicle.status || "").toLowerCase();
            if (status === "new") return "New";
            if (status === "inactive" || status === "inactivate") return "Inactive";
            return "Active";
        })(),
        // "Speed (km/h)": vehicle.speed,
        "Last Update": ((vehicle?.category).toLowerCase() === "new") ? "--" : new Date(vehicle.lastUpdate).toLocaleString(),
        "Category": vehicle.category,
        // "Ignition": vehicle.attributes.ignition ? "On" : "Off",
        // "Motion": vehicle.attributes.motion ? "Moving" : "Stopped",
        // "Today Distance (km)": (vehicle.attributes.todayDistance / 1000).toFixed(2),
        "Total Dist. (km)": ((vehicle?.category).toLowerCase() === "new") ? "0.00" : (vehicle.attributes.totalDistance / 1000).toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `${filename}.xlsx`);
};

export const exportToPdf = (data: DeviceData[], filename: string) => {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
    });

    const CONFIG = {
        colors: {
            primary: [12, 35, 92] as [number, number, number],
            secondary: [244, 244, 245] as [number, number, number],
            tertiary: [0, 0, 0] as [number, number, number],
            background: [249, 250, 251] as [number, number, number],
            border: [220, 220, 220] as [number, number, number],
        },
        company: { name: "Credence Tracker" },
    };

    const title = "Vehicle List Report";
    const companyName = CONFIG.company.name;

    // Header
    doc.setFillColor(...CONFIG.colors.primary);
    doc.rect(15, 15, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...CONFIG.colors.tertiary);
    doc.text(companyName, 28, 21);

    doc.setDrawColor(...CONFIG.colors.primary);
    doc.setLineWidth(0.5);
    doc.line(15, 25, doc.internal.pageSize.width - 15, 25);

    // Title and Date
    doc.setFontSize(20);
    doc.text(title, 15, 35);

    const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).replace(",", "");

    doc.setFontSize(10);
    const dateText = `Generated: ${currentDate}`;
    doc.text(
        dateText,
        doc.internal.pageSize.width - 15 - doc.getTextWidth(dateText),
        21,
    );

    const tableColumn = ["Vehicle Name", "IMEI", "Status", "Last Update", "Total Dist. (km)"];
    const tableRows: any[] = [];

    data.forEach((vehicle) => {
        const vehicleData = [
            vehicle.name,
            vehicle.uniqueId || vehicle.imei,
            (() => {
                const status = (vehicle?.category || "").toLowerCase();
                if (status === "new") return "New";
                if (status === "inactive" || status === "inactivate") return "Inactive";
                return "Active";
            })(),
            ((vehicle?.category || "").toLowerCase() === "new") ? "--" : new Date(vehicle.lastUpdate).toLocaleString(),
            ((vehicle?.category || "").toLowerCase() === "new") ? "0.00 km" : `${(vehicle.attributes.totalDistance / 1000).toFixed(2)} km`,
        ];
        tableRows.push(vehicleData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            halign: "center",
            lineColor: CONFIG.colors.border,
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: CONFIG.colors.primary,
            textColor: 255, // White text
            fontStyle: "bold",
        },
        alternateRowStyles: {
            fillColor: CONFIG.colors.background,
        },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...CONFIG.colors.tertiary);
                doc.text(title, 15, 10);
            }
        },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...CONFIG.colors.border);
        doc.setLineWidth(0.5);
        doc.line(
            15,
            doc.internal.pageSize.height - 15,
            doc.internal.pageSize.width - 15,
            doc.internal.pageSize.height - 15,
        );

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`© ${companyName}`, 15, doc.internal.pageSize.height - 10);

        const pageText = `Page ${i} of ${pageCount}`;
        const pageWidth = doc.getTextWidth(pageText);
        doc.text(
            pageText,
            doc.internal.pageSize.width - 15 - pageWidth,
            doc.internal.pageSize.height - 10,
        );
    }

    doc.save(`${filename}.pdf`);
};
