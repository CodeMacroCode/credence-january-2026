"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, X, Loader2, Save, Eye, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { useSchoolDropdown, useModelDropdown } from "@/hooks/useDropdown";
import { customSubscriptionConfigService } from "@/services/api/customSubscriptionConfigService";
import ResponseLoader from "@/components/ResponseLoader";

export default function CustomSubscriptionConfigClient() {
    // State for viewing a specific school's overrides
    const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);

    // State for adding/editing a specific override
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [schoolForOverride, setSchoolForOverride] = useState<string>("");
    const [overrideModelName, setOverrideModelName] = useState("");
    const [overrideCustomPrice, setOverrideCustomPrice] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Hooks & Data
    const { data: schoolData, isLoading: isSchoolsLoading } = useSchoolDropdown(true);
    const { data: modelData, isLoading: isModelsLoading } = useModelDropdown(true);

    const { data: schoolsWithOverridesResp, isLoading: isListLoading, refetch: refetchList } = useQuery({
        queryKey: ["schools-with-overrides"],
        queryFn: customSubscriptionConfigService.getSchoolsWithOverrides,
    });

    const { data: overridesDetailResp, isLoading: isDetailLoading, refetch: refetchDetails } = useQuery({
        queryKey: ["subscription-overrides", selectedSchool?.id],
        queryFn: () => customSubscriptionConfigService.getSubscriptionOverridesBySchool(selectedSchool!.id),
        enabled: !!selectedSchool?.id,
    });

    const schoolsList = schoolsWithOverridesResp?.data || [];
    const overridesList = overridesDetailResp?.subscriptionOverrides || [];

    // Handlers
    const handleSaveOverride = async () => {
        if (!schoolForOverride || !overrideModelName || !overrideCustomPrice) {
            toast.error("Please fill in all required fields (School, Model Name, and Custom Price).");
            return;
        }

        try {
            setIsSaving(true);
            await customSubscriptionConfigService.updateSubscriptionOverride(schoolForOverride, {
                modelName: overrideModelName,
                customPrice: Number(overrideCustomPrice),
            });

            toast.success("Custom subscription plan applied successfully.");

            // Refetch whichever lists depend on this data
            refetchList();
            if (selectedSchool?.id === schoolForOverride) {
                refetchDetails();
            }

            // Close modal and reset form
            setIsOverrideModalOpen(false);
            resetOverrideForm();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save custom plan");
        } finally {
            setIsSaving(false);
        }
    };

    const resetOverrideForm = () => {
        setSchoolForOverride("");
        setOverrideModelName("");
        setOverrideCustomPrice("");
    };

    const handleOpenAddModal = (presetSchoolId?: string) => {
        resetOverrideForm();
        if (presetSchoolId) {
            setSchoolForOverride(presetSchoolId);
        }
        setIsOverrideModalOpen(true);
    };

    const handleOpenEditModal = (schoolId: string, modelName: string, customPrice: number) => {
        setSchoolForOverride(schoolId);
        setOverrideModelName(modelName);
        setOverrideCustomPrice(customPrice.toString());
        setIsOverrideModalOpen(true);
    };

    const handleDeleteOverride = async (schoolId: string, modelName: string) => {
        if (!confirm(`Are you sure you want to delete the custom subscription plan for model ${modelName}?`)) {
            return;
        }

        try {
            await customSubscriptionConfigService.deleteSubscriptionOverride(schoolId, modelName);
            toast.success("Custom subscription plan deleted successfully.");

            refetchList();
            if (selectedSchool?.id === schoolId) {
                refetchDetails();
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to delete custom plan");
        }
    };

    return (
        <div className="space-y-6 h-full p-4 overflow-hidden flex flex-col">
            <ResponseLoader isLoading={isListLoading} />

            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Custom Subscription Plans</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage user-specific subscription overrides and pricing plans
                    </p>
                </div>
                <Button onClick={() => handleOpenAddModal()} className="shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Plan
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left Side: Users with Custome Plans */}
                <Card className="flex flex-col h-full overflow-hidden shadow-sm border border-gray-100">
                    <CardHeader className="bg-gray-50/50 border-b pb-4">
                        <CardTitle className="text-lg">Admins With Custom Plans</CardTitle>
                        <CardDescription>Select an admin to view their active subscription overrides.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        {schoolsList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <p className="mb-4">No custom subscription plans currently active.</p>
                                <Button variant="outline" size="sm" onClick={() => handleOpenAddModal()}>
                                    Create First Override
                                </Button>
                            </div>
                        ) : (
                            <div className="w-full">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-50/80 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-700">Admin Name</th>
                                            <th className="px-4 py-3 font-medium text-gray-700">Username</th>
                                            <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {schoolsList.map((school) => (
                                            <tr
                                                key={school._id}
                                                className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedSchool?.id === school._id ? "bg-blue-50 border-l-2 border-blue-500" : ""
                                                    }`}
                                                onClick={() => setSelectedSchool({ id: school._id, name: school.schoolName })}
                                            >
                                                <td className="px-4 py-3 font-medium text-gray-900">{school.schoolName}</td>
                                                <td className="px-4 py-3 text-gray-500">{school.username}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 group"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedSchool({ id: school._id, name: school.schoolName });
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1 text-gray-400 group-hover:text-blue-600" />
                                                        <span className="text-gray-400 group-hover:text-blue-600">View</span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Side: Override Details for Selected User */}
                <Card className="flex flex-col h-full overflow-hidden shadow-sm border border-gray-100">
                    <CardHeader className="bg-gray-50/50 border-b pb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg">Override Details</CardTitle>
                                <CardDescription>
                                    {selectedSchool
                                        ? `Custom prices for ${selectedSchool.name}`
                                        : "Select an admin from the list to view details"}
                                </CardDescription>
                            </div>
                            {selectedSchool && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenAddModal(selectedSchool.id)}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Add Model
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0 relative">
                        {!selectedSchool ? (
                            <div className="flex h-64 items-center justify-center text-muted-foreground p-8 text-center bg-gray-50/30">
                                Please select an admin from the left panel to examine their subscription overrides.
                            </div>
                        ) : isDetailLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : overridesList.length === 0 ? (
                            <div className="flex h-64 items-center justify-center flex-col text-muted-foreground p-8 text-center">
                                <p className="mb-4">No specific model overrides found for this admin.</p>
                                <Button variant="outline" size="sm" onClick={() => handleOpenAddModal(selectedSchool.id)}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Model Override
                                </Button>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50/80 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-700">Model Name</th>
                                        <th className="px-4 py-3 font-medium text-gray-700">Custom Price (₹)</th>
                                        <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {overridesList.map((override) => (
                                        <tr key={override._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{override.modelName}</td>
                                            <td className="px-4 py-3 text-green-600 font-semibold">₹{override.customPrice}</td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Edit custom price"
                                                    onClick={() => handleOpenEditModal(selectedSchool.id, override.modelName, override.customPrice)}
                                                >
                                                    <Edit className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Delete custom price"
                                                    onClick={() => handleDeleteOverride(selectedSchool.id, override.modelName)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal for Creating / Updating Overrides */}
            <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Custom Subscription Plan</DialogTitle>
                        <DialogDescription>
                            Set a custom yearly subscription amount for a specific device model.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="school">Admin Account</Label>
                            <Combobox
                                items={[
                                    ...(schoolData?.map((s: any) => ({
                                        label: `${s.schoolName}`,
                                        value: s._id,
                                    })) || []),
                                ]}
                                value={schoolForOverride}
                                onValueChange={(val) => setSchoolForOverride(val || "")}
                                placeholder="Select an admin..."
                                searchPlaceholder="Search admins..."
                                emptyMessage={isSchoolsLoading ? "Loading admins..." : "No admins found."}
                                disabled={!!(selectedSchool?.id && schoolForOverride === selectedSchool.id)} // disable if prefilled to current view
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="modelName">Device Model Name</Label>
                            <Combobox
                                items={[
                                    ...(modelData?.map((m: any) => ({
                                        label: m.modelName,
                                        value: m.modelName,
                                    })) || []),
                                ]}
                                value={overrideModelName}
                                onValueChange={(val) => setOverrideModelName(val || "")}
                                placeholder="Select a model..."
                                searchPlaceholder="Search models..."
                                emptyMessage={isModelsLoading ? "Loading models..." : "No models found."}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customPrice">Custom Yearly Amount (₹)</Label>
                            <Input
                                id="customPrice"
                                type="number"
                                value={overrideCustomPrice}
                                onChange={(e) => setOverrideCustomPrice(e.target.value)}
                                placeholder="e.g., 2500"
                                min="0"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOverrideModalOpen(false)}>
                            <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                        <Button type="button" onClick={handleSaveOverride} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Plan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
