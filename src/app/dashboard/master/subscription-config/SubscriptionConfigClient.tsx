"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, Edit, X, Loader2 } from "lucide-react";
import { subscriptionConfigService } from "@/services/api/subscriptionConfigService";

export default function SubscriptionConfigClient() {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newModelName, setNewModelName] = useState("");
    const [newYearlyAmount, setNewYearlyAmount] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Fetch configurations
    const { data: response, isLoading, refetch } = useQuery({
        queryKey: ["subscriptionConfigs"],
        queryFn: () => subscriptionConfigService.getConfig(),
    });

    const configs = response?.data || [];

    const handleAddOrUpdate = async () => {
        if (!newModelName || !newYearlyAmount) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setIsSaving(true);
            await subscriptionConfigService.setConfig({
                modelName: newModelName,
                yearlyAmount: Number(newYearlyAmount)
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

    const handleDelete = async (modelName: string) => {
        if (confirm(`Are you sure you want to delete the configuration for ${modelName}?`)) {
            try {
                await subscriptionConfigService.deleteConfig(modelName);
                toast.success("Subscription plan deleted successfully");
                refetch();
            } catch (error: any) {
                toast.error(error?.response?.data?.message || "Failed to delete configuration");
            }
        }
    };

    const resetForm = () => {
        setNewModelName("");
        setNewYearlyAmount("");
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Card>
                <CardHeader>
                    <CardTitle>All Subscription Plans</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : configs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No subscription plans found. Add one to get started.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {configs.map((config) => (
                                <div
                                    key={config._id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="font-medium">{config.modelName}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Yearly Amount: ₹{config.yearlyAmount} {config.currency ? `(${config.currency})` : ""}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingId(config._id);
                                                setNewModelName(config.modelName);
                                                setNewYearlyAmount(config.yearlyAmount.toString());
                                                setIsAdding(true);
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(config.modelName)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}