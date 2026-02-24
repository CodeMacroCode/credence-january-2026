"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, Edit, X, Loader2 } from "lucide-react";
import { subscriptionConfigService, SubscriptionConfigData } from "@/services/api/subscriptionConfigService";
import { Switch } from "@/components/ui/switch";
import { CustomTable } from "@/components/ui/CustomTable";
import { getSubscriptionConfigColumns } from "@/components/columns/columns";

export default function SubscriptionConfigClient() {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newModelName, setNewModelName] = useState("");
    const [newYearlyAmount, setNewYearlyAmount] = useState("");
    const [newNoRenewalNeeded, setNewNoRenewalNeeded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch configurations
    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ["subscriptionConfigs"],
        queryFn: () => subscriptionConfigService.getConfig(),
    });

    const configs = response?.data || [];

    const handleEdit = (row: SubscriptionConfigData) => {
        setEditingId(row._id);
        setNewModelName(row.modelName);
        setNewYearlyAmount(row.yearlyAmount ? row.yearlyAmount.toString() : "");
        setNewNoRenewalNeeded(row.noRenewalNeeded || false);
        setIsAdding(true);
    };

    const handleDelete = async (modelName: string) => {
        if (confirm(`Are you sure you want to delete the configuration for ${modelName}?`)) {
            try {
                const response = await subscriptionConfigService.deleteConfig(modelName);
                if (response.success) {
                    toast.success(response.message || "Configuration deleted successfully");
                    refetch();
                } else {
                    toast.error(response.message || "Failed to delete configuration");
                }
            } catch (error: any) {
                toast.error(error.response?.data?.message || "Error deleting configuration");
            }
        }
    };

    const columns = getSubscriptionConfigColumns(handleEdit, handleDelete);

    const handleAddOrUpdate = async () => {
        if (!newModelName || (!newNoRenewalNeeded && !newYearlyAmount)) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setIsSaving(true);
            await subscriptionConfigService.setConfig({
                modelName: newModelName,
                yearlyAmount: newNoRenewalNeeded ? 0 : Number(newYearlyAmount),
                noRenewalNeeded: newNoRenewalNeeded
            });
            toast.success(editingId ? "Subscription plan updated successfully" : "Subscription plan added successfully");
            resetForm();
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setNewModelName("");
        setNewYearlyAmount("");
        setNewNoRenewalNeeded(false);
        setIsAdding(false);
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscription Prices</h1>
                    <p className="text-muted-foreground">
                        Manage subscription prices for device models
                    </p>
                </div>
                <Button onClick={() => {
                    setEditingId(null);
                    setNewModelName("");
                    setNewYearlyAmount("");
                    setIsAdding(true);
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plan
                </Button>
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <Card>
                    <CardHeader>
                        <CardTitle>{editingId ? "Edit Subscription Plan" : "Add New Subscription Plan"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="flex items-center space-x-2 md:col-span-2">
                                <Switch
                                    id="noRenewalNeeded"
                                    checked={newNoRenewalNeeded}
                                    onCheckedChange={setNewNoRenewalNeeded}
                                />
                                <Label htmlFor="noRenewalNeeded">No Renewal Needed</Label>
                            </div>
                            <div>
                                <Label htmlFor="modelName">Model Name</Label>
                                <Input
                                    id="modelName"
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                    placeholder="e.g., S106"
                                    disabled={!!editingId} // Disable model name edit since it's the identifier for DELETE
                                />
                            </div>
                            {!newNoRenewalNeeded && (
                                <div>
                                    <Label htmlFor="yearlyAmount">Yearly Amount (₹)</Label>
                                    <Input
                                        id="yearlyAmount"
                                        type="number"
                                        value={newYearlyAmount}
                                        onChange={(e) => setNewYearlyAmount(e.target.value)}
                                        placeholder="e.g., 1200"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={resetForm}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                            <Button onClick={handleAddOrUpdate} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {editingId ? "Update Plan" : "Add Plan"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Subscription Plans List */}
            <div>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : configs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No subscription plans found. Add one to get started.
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <CustomTable<SubscriptionConfigData>
                            data={configs}
                            columns={columns}
                            isLoading={isLoading}
                            noDataMessage="No subscription plans found."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}