"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { FloatingMenu } from "@/components/floatingMenu";
import ResponseLoader from "@/components/ResponseLoader";
import { Alert } from "@/components/Alert";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useExport } from "@/hooks/useExport";
import { api } from "@/services/apiService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  VisibilityState,
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import { ChevronDown, X, Edit, Trash2, EyeOff, Eye, LogIn } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Combobox } from "@/components/ui/combobox";
import { createPortal } from "react-dom";
import authAxios from "@/lib/authAxios";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { loginUser } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { useRouter } from "next/navigation";

interface BranchGroupAccess {
  _id: string;
  username: string;
  password: string;
  mobileNo: string;
  branchGroupName: string;
  schoolId?: { _id: string; schoolName: string };
  AssignedBranch?: { _id: string; branchName: string }[];
  createdAt?: string;
  access?: {
    master?: Record<string, boolean>;
    reports?: Record<string, boolean>;
  };
  [key: string]: any;
}

// Master options for dropdown
const masterOptions = [
  { value: "route", label: "Route" },
  { value: "geofence", label: "Geofence" },
  { value: "driver", label: "Driver" },
];

// Report options for dropdown
const reportOptions = [
  { value: "status", label: "Status Report" },
  { value: "history", label: "History Report" },
  { value: "stoppageSummary", label: "Stoppage Summary Report" },
  { value: "stop", label: "Stop Report" },
  { value: "travel", label: "Travel Summary Report" },
  { value: "trip", label: "Trip Report" },
  { value: "idle", label: "Idle Report" },
  { value: "alert", label: "Alert Report" },
  { value: "routeReport", label: "Route Report" },
  { value: "ePoliceReport", label: "ePolice Report" },
];

interface SelectOption {
  label: string;
  value: string;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

const TableBranchDropdown: React.FC<{
  assignedBranches: { _id: string; branchName: string }[];
  branchOptions: SelectOption[];
  onBranchesUpdate: (branchIds: string[]) => void;
  userId: string;
}> = ({ assignedBranches, branchOptions, onBranchesUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedBranches, setLocalSelectedBranches] = useState<string[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Sync assignedBranches → local state
  useEffect(() => {
    setLocalSelectedBranches(assignedBranches.map((b) => b._id));
  }, [assignedBranches]);

  const filteredBranchOptions = branchOptions.filter((b) =>
    b.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allSelected =
    localSelectedBranches.length === branchOptions.length &&
    branchOptions.length > 0;

  const selectedCount = localSelectedBranches.length;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle branch
  const handleBranchToggle = (branchId: string) => {
    setLocalSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  // Select all
  const handleSelectAll = () => {
    setLocalSelectedBranches(
      allSelected ? [] : branchOptions.map((b) => b.value)
    );
  };

  // Save
  const handleSave = () => {
    onBranchesUpdate(localSelectedBranches);
    setIsOpen(false);
  };

  // Dropdown positioning
  const getDropdownPosition = () => {
    if (!dropdownRef.current) return { top: 0, left: 0 };

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + window.scrollY;
    let maxHeight = 240;

    if (spaceBelow < 200 && spaceAbove > 200) {
      top = rect.top + window.scrollY - Math.min(240, spaceAbove - 20);
      maxHeight = Math.min(240, spaceAbove - 20);
    } else if (spaceBelow < 240) {
      maxHeight = Math.min(240, spaceBelow - 20);
    }

    return {
      top,
      left: rect.left + window.scrollX,
      width: rect.width,
      maxHeight,
    };
  };

  const dropdownPosition = getDropdownPosition();

  return (
    <div className="relative w-full min-w-[250px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[38px] flex items-center justify-between"
      >
        <span className="text-gray-700 truncate">
          {assignedBranches.length > 0
            ? `${assignedBranches.length} users`
            : "Assign Users"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200 bg-blue-50 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Assign Users
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-700 hover:text-blue-900 font-medium"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* 🔍 Search bar */}
            <div className="p-2 border-b border-gray-200 bg-gray-50">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* List */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: dropdownPosition.maxHeight - 110 }}
            >
              {filteredBranchOptions.length > 0 ? (
                filteredBranchOptions.map((branch) => (
                  <label
                    key={branch.value}
                    className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={localSelectedBranches.includes(branch.value)}
                      onChange={() => handleBranchToggle(branch.value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <span className="ml-3 text-sm text-gray-700 truncate flex-1">
                      {branch.label}
                    </span>
                  </label>
                ))
              ) : (
                <div className="px-3 py-3 text-center text-sm text-gray-500">
                  No users found
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-gray-200 bg-blue-50 flex justify-between items-center text-xs text-gray-600">
              <span>{selectedCount} users selected</span>

              <button
                type="button"
                onClick={handleSave}
                className="text-blue-700 hover:text-blue-900 font-medium"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// Form Branch Dropdown Component
const BranchDropdown: React.FC<{
  selectedBranches: string[];
  branchOptions: SelectOption[];
  onBranchToggle: (branchId: string) => void;
  onSelectAll: () => void;
}> = ({ selectedBranches, branchOptions, onBranchToggle, onSelectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allSelected =
    selectedBranches.length === branchOptions.length &&
    branchOptions.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const removeBranch = (branchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onBranchToggle(branchId);
  };

  // 🔍 Filter branches based on search
  const filteredBranches = useMemo(() => {
    return branchOptions.filter((b) =>
      b.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, branchOptions]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[42px] flex items-center justify-between"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedBranches.length > 0 ? (
            selectedBranches.slice(0, 3).map((branchId) => {
              const branch = branchOptions.find((b) => b.value === branchId);
              return branch ? (
                <span
                  key={branchId}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {branch.label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-blue-900 transition-colors"
                    onClick={(e) => removeBranch(branchId, e)}
                  />
                </span>
              ) : null;
            })
          ) : (
            <span className="text-gray-500">Select Users</span>
          )}
          {selectedBranches.length > 3 && (
            <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
              +{selectedBranches.length - 3} more
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Users
              </span>
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs text-blue-700 hover:text-blue-900 font-medium"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* 🔍 Search box */}
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filteredBranches.length > 0 ? (
              filteredBranches.map((branch) => (
                <label
                  key={branch.value}
                  className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch.value)}
                    onChange={() => onBranchToggle(branch.value)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {branch.label}
                  </span>
                </label>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-gray-500">
                No matching users
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function UserAccessPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { login: authLogin } = useAuthStore();
  const { setAccess } = useAccessStore();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [branchGroupsData, setBranchGroupsData] = useState<BranchGroupAccess[]>(
    []
  );
  const [filteredData, setFilteredData] = useState<BranchGroupAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<BranchGroupAccess | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchGroupAccess | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editSelectedBranches, setEditSelectedBranches] = useState<string[]>(
    []
  );
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [editSelectedSchool, setEditSelectedSchool] = useState<string | null>(
    null
  );
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const { data: schoolData } = useSchoolData();
  const { data: branchDataFromHook } = useBranchData();

  // Permissions state
  const [selectedMasterPermissions, setSelectedMasterPermissions] = useState<string[]>([]);
  const [selectedReportPermissions, setSelectedReportPermissions] = useState<string[]>([]);

  const resetPermissions = () => {
    setSelectedMasterPermissions([]);
    setSelectedReportPermissions([]);
  };

  const [loginAsLoading, setLoginAsLoading] = useState<string | null>(null);

  // Handle "Login" - superAdmin logs in as a group user
  const handleLoginAs = async (username: string, password: string, id: string) => {
    setLoginAsLoading(id);
    try {
      Cookies.remove("token");
      localStorage.clear();

      const data = await loginUser(username, password);
      if (data?.token) {
        authLogin(data.token);
        if (data.access) {
          setAccess(data.access);
        }
        toast.success(`Logged in as ${username}`);
        window.location.replace("/dashboard");
      } else {
        toast.error("Login failed: Invalid server response");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoginAsLoading(null);
    }
  };

  const schoolOptions: SelectOption[] =
    schoolData?.map((s) => ({ label: s.schoolName, value: s._id })) || [];
  const branchOptions: SelectOption[] =
    branchDataFromHook?.map((b) => ({ label: b.branchName, value: b._id })) ||
    [];

  // Fetch all data
  const fetchBranchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<BranchGroupAccess[]>(`/branchGroup`);
      setBranchGroupsData(response);
      setFilteredData(response);
    } catch (err) {
      // setError("Failed to load user data.");
      setBranchGroupsData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranchGroups();
  }, [fetchBranchGroups]);

  // Apply filters
  useEffect(() => {
    let filtered = [...branchGroupsData];

    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((item) => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        let startMatch = true;
        let endMatch = true;

        if (dateRange.start) {
          const startOfDay = new Date(dateRange.start);
          startOfDay.setHours(0, 0, 0, 0);
          startMatch = itemDate >= startOfDay;
        }

        if (dateRange.end) {
          const endOfDay = new Date(dateRange.end);
          endOfDay.setHours(23, 59, 59, 999);
          endMatch = itemDate <= endOfDay;
        }

        return startMatch && endMatch;
      });
    }

    // Apply search filter
    if (globalFilter.trim()) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.username?.toLowerCase().includes(searchTerm) ||
          item.branchGroupName?.toLowerCase().includes(searchTerm) ||
          item.mobileNo?.toLowerCase().includes(searchTerm) ||
          item.schoolId?.schoolName?.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredData(filtered);
  }, [branchGroupsData, dateRange, globalFilter]);

  // Handle search
  const handleSearchResults = useCallback((results: BranchGroupAccess[]) => {
    setFilteredData(results);
  }, []);

  const handleDateRangeChange = useCallback(
    (start: Date | null, end: Date | null) => {
      setDateRange({ start, end });
    },
    []
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newBranchGroup: any) =>
      api.post("/branchGroup", newBranchGroup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setIsAddDialogOpen(false);
      setSelectedBranches([]);
      setSelectedSchool(null);
      fetchBranchGroups();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to add user group"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/branchGroup/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setIsEditDialogOpen(false);
      setEditTarget(null);
      setEditSelectedBranches([]);
      setEditSelectedSchool(null);
      fetchBranchGroups();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to update user group"),
  });

  const updateBranchesMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.put(`/branchGroup/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      fetchBranchGroups();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to update users");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branchGroup/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setDeleteTarget(null);
      fetchBranchGroups();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to delete user group"),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (branchGroup: any) => {
      const token = Cookies.get("token");
      return await authAxios.put(
        `/user/deactivate/${branchGroup._id}`,
        {
          Active: !branchGroup.Active,
          userRole: branchGroup.role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      toast.success("User group status updated successfully.");
      fetchBranchGroups();
    },
    onError: (err: any) => {
      toast.error(
        `Failed to update user group status: ${err.response?.data?.message || err.message
        }`
      );
    },
  });

  // Handlers
  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleEditBranchToggle = (branchId: string) => {
    setEditSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSelectAll = () => {
    setSelectedBranches(
      selectedBranches.length === branchOptions.length
        ? []
        : branchOptions.map((b) => b.value)
    );
  };

  const handleEditSelectAll = () => {
    setEditSelectedBranches(
      editSelectedBranches.length === branchOptions.length
        ? []
        : branchOptions.map((b) => b.value)
    );
  };

  const handleTableBranchesUpdate = useCallback(
    (userId: string, branchIds: string[]) => {
      updateBranchesMutation.mutate({
        id: userId,
        data: { AssignedBranch: branchIds },
      });
    },
    [updateBranchesMutation]
  );

  const handleSchoolChange = (schoolId: string | undefined) => {
    setSelectedSchool(schoolId || null);
    setSelectedBranches([]);
  };

  const handleEditSchoolChange = (schoolId: string | undefined) => {
    setEditSelectedSchool(schoolId || null);
    setEditSelectedBranches([]);
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBranchGroup = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      mobileNo: formData.get("mobileNo") as string,
      schoolId: selectedSchool,
      branchGroupName: formData.get("branchGroupName") as string,
      AssignedBranch: selectedBranches,
      access: {
        master: {
          route: selectedMasterPermissions.includes("route"),
          geofence: selectedMasterPermissions.includes("geofence"),
          driver: selectedMasterPermissions.includes("driver"),
        },
        reports: {
          status: selectedReportPermissions.includes("status"),
          history: selectedReportPermissions.includes("history"),
          stoppageSummary: selectedReportPermissions.includes("stoppageSummary"),
          stop: selectedReportPermissions.includes("stop"),
          travel: selectedReportPermissions.includes("travel"),
          trip: selectedReportPermissions.includes("trip"),
          idle: selectedReportPermissions.includes("idle"),
          alert: selectedReportPermissions.includes("alert"),
          routeReport: selectedReportPermissions.includes("routeReport"),
          ePoliceReport: selectedReportPermissions.includes("ePoliceReport"),
        },
      },
    };
    await createMutation.mutateAsync(newBranchGroup);
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTarget) return;
    const formData = new FormData(e.currentTarget);
    const updatedBranchGroup = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      mobileNo: formData.get("mobileNo") as string,
      schoolId: editSelectedSchool || editTarget.schoolId?._id,
      branchGroupName: formData.get("branchGroupName") as string,
      AssignedBranch: editSelectedBranches,
      access: {
        master: {
          route: selectedMasterPermissions.includes("route"),
          geofence: selectedMasterPermissions.includes("geofence"),
          driver: selectedMasterPermissions.includes("driver"),
        },
        reports: {
          status: selectedReportPermissions.includes("status"),
          history: selectedReportPermissions.includes("history"),
          stoppageSummary: selectedReportPermissions.includes("stoppageSummary"),
          stop: selectedReportPermissions.includes("stop"),
          travel: selectedReportPermissions.includes("travel"),
          trip: selectedReportPermissions.includes("trip"),
          idle: selectedReportPermissions.includes("idle"),
          alert: selectedReportPermissions.includes("alert"),
          routeReport: selectedReportPermissions.includes("routeReport"),
          ePoliceReport: selectedReportPermissions.includes("ePoliceReport"),
        },
      },
    };
    await updateMutation.mutateAsync({
      id: editTarget._id,
      data: updatedBranchGroup,
    });
  };

  const handleDelete = () =>
    deleteTarget && deleteMutation.mutate(deleteTarget._id);

  // Reset forms
  useEffect(() => {
    if (!isAddDialogOpen) {
      setSelectedBranches([]);
      setSelectedSchool(null);
      resetPermissions();
    }
  }, [isAddDialogOpen]);

  useEffect(() => {
    if (editTarget && isEditDialogOpen) {
      setEditSelectedBranches(
        editTarget.AssignedBranch
          ? editTarget.AssignedBranch.map((b) => b._id)
          : []
      );
      setEditSelectedBranches(
        editTarget.AssignedBranch
          ? editTarget.AssignedBranch.map((b) => b._id)
          : []
      );
      setEditSelectedSchool(editTarget.schoolId?._id || null);

      // Populate permissions
      if (editTarget.access) {
        const masterPerms: string[] = [];
        const reportPerms: string[] = [];
        if (editTarget.access.master) {
          Object.entries(editTarget.access.master).forEach(([key, value]) => {
            if (value === true) masterPerms.push(key);
          });
        }
        if (editTarget.access.reports) {
          Object.entries(editTarget.access.reports).forEach(([key, value]) => {
            if (value === true) reportPerms.push(key);
          });
        }
        setSelectedMasterPermissions(masterPerms);
        setSelectedReportPermissions(reportPerms);
      } else {
        resetPermissions();
      }
    }
  }, [editTarget, isEditDialogOpen]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      setEditSelectedBranches([]);
      setEditSelectedSchool(null);
      setEditTarget(null);
      resetPermissions();
    }
  }, [isEditDialogOpen]);

  const handleDeleteClick = (row: BranchGroupAccess) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${row.branchGroupName}"?`
    );

    if (confirmed) {
      deleteMutation.mutate(row._id);
    }
  };

  // Main columns for CustomTable
  const columns: ColumnDef<BranchGroupAccess, CellContent>[] = useMemo(
    () => [
      {
        header: "Group Name",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "custom",
          render: () => (
            <div className="flex items-center gap-2 w-full">
              <span className="truncate flex-1">{row.branchGroupName || "N/A"}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoginAs(row.username, row.password, row._id);
                    }}
                    disabled={loginAsLoading === row._id}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200/80 hover:bg-gray-300 dark:bg-gray-600/60 dark:hover:bg-gray-500 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    {loginAsLoading === row._id ? (
                      <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Login as {row.branchGroupName}
                </TooltipContent>
              </Tooltip>
            </div>
          ),
        }),
        meta: { flex: 1, minWidth: 180, maxWidth: 250 },
      },
      {
        header: "User Name",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.username || "N/A",
          render: () => row.username || "N/A",
        }),
        meta: { flex: 1, minWidth: 180, maxWidth: 250 },
      },

      // {
      //   header: "Password",
      //   accessorFn: (row) => ({
      //     type: "text",
      //     value: row.password || "N/A",
      //     render: () => row.password || "N/A",
      //   }),
      //   meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      // },
      {
        header: "Password",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "custom",
          render: () => {
            // Inline component WITH hooks allowed here
            const PasswordView = () => {
              const [show, setShow] = React.useState(false);
              const password = row.password || "N/A";

              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono">
                    {show ? password : "•".repeat(password?.length || 8)}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShow((prev) => !prev);
                    }}
                    className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                  >
                    {show ? (
                      <EyeOff className="h-4 w-4 text-gray-700" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-700" />
                    )}
                  </button>
                </div>
              );
            };

            return <PasswordView />;
          },
        }),
        meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      },

      {
        header: "Mobile No",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.mobileNo || "N/A",
          render: () => row.mobileNo || "N/A",
        }),
        meta: { flex: 1, minWidth: 150, maxWidth: 200 },
      },
      {
        header: "Admin",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.schoolId?.schoolName || "N/A",
          render: () => row.schoolId?.schoolName || "N/A",
        }),
        meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      },
      {
        header: "Registration Date",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-GB")
            : "N/A",
          render: () =>
            row.createdAt
              ? new Date(row.createdAt).toLocaleDateString("en-GB")
              : "N/A",
        }),
        meta: { flex: 1, minWidth: 180, maxWidth: 220 },
      },
      {
        header: "Assigned Users",
        accessorFn: (row: BranchGroupAccess) => {
          // console.log("Branches:", branchOptions);
          // console.log("Row:", row);
          // // Filter branches that belong to this row's school
          // const schoolFilteredBranches = (branchOptions || [])
          //   .filter((b) => b.schoolId === row.schoolId?._id)
          //   .map((b) => ({
          //     label: b.branchName,
          //     value: b._id,
          //   }));
          const assignedOnly = (row.AssignedBranch || []).map((b) => ({
            label: b.branchName,
            value: b._id,
          }));

          return {
            type: "custom",
            value: (
              <TableBranchDropdown
                assignedBranches={row.AssignedBranch || []}
                branchOptions={assignedOnly}
                onBranchesUpdate={(branchIds) =>
                  handleTableBranchesUpdate(row._id, branchIds)
                }
                userId={row._id}
              />
            ),
            render: () => (
              <TableBranchDropdown
                assignedBranches={row.AssignedBranch || []}
                branchOptions={assignedOnly}
                onBranchesUpdate={(branchIds) =>
                  handleTableBranchesUpdate(row._id, branchIds)
                }
                userId={row._id}
              />
            ),
          };
        },
        meta: { flex: 1, minWidth: 280 },
      },

      {
        header: "Action",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "group",
          items: [
            {
              type: "button",
              label: "Edit",
              onClick: () => {
                setEditTarget(row);
                setIsEditDialogOpen(true);
              },
              className:
                "cursor-pointer flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors",
            },
            {
              type: "button",
              label: "Delete",
              onClick: () => handleDeleteClick(row),
              className:
                "bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md cursor-pointer transition-colors duration-200",
            },
            {
              type: "button",
              label: (row as any).Active ? "Deactivate" : "Activate",
              onClick: () => deactivateMutation.mutate(row),
              className: `${(row as any).Active
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
                } cursor-pointer w-24`,
              disabled: deactivateMutation.isPending,
            },
          ],
          render: () => (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditTarget(row);
                  setIsEditDialogOpen(true);
                }}
                className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(row)}
                className="cursor-pointer bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md text-sm"
              >
                Delete
              </button>
            </div>
          ),
        }),
        meta: {
          minWidth: 280,
          maxWidth: 320,
          width: 300,
        },
      },
    ],
    [branchOptions, handleTableBranchesUpdate]
  );

  // Create table instance for column visibility
  const table = useReactTable({
    data: filteredData.slice(0, 1), // Just for column structure
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const filteredBranches = useMemo(() => {
    if (!selectedSchool) return [];
    return (
      branchDataFromHook
        ?.filter((b) => b.schoolId?._id === selectedSchool)
        .map((b) => ({ label: b.branchName, value: b._id })) || []
    );
  }, [selectedSchool, branchDataFromHook]);

  const filteredEditBranches = useMemo(() => {
    if (!editSelectedSchool) return [];
    return (
      branchDataFromHook
        ?.filter((b) => b.schoolId?._id === editSelectedSchool)
        .map((b) => ({ label: b.branchName, value: b._id })) || []
    );
  }, [editSelectedSchool, branchDataFromHook]);

  return (
    <main className="p-4">
      <ResponseLoader
        isLoading={
          isLoading ||
          createMutation.isPending ||
          updateMutation.isPending ||
          deleteMutation.isPending ||
          updateBranchesMutation.isPending
        }
      />
      {error && (
        <div className="text-red-600 p-2 border border-red-300 bg-red-50 mb-4 rounded">
          {error}
        </div>
      )}

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={branchGroupsData}
            displayKey={[
              "username",
              "branchGroupName",
              "mobileNo",
              "schoolId.schoolName",
            ]}
            onResults={handleSearchResults}
            className="w-[300px]"
          />
          <div>
            <DateRangeFilter
              onDateRangeChange={handleDateRangeChange}
              title="Search by Registration Date"
            />
          </div>
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="text-white cursor-pointer">Add User Group</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddUser} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add User Group</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <Label htmlFor="username">User Name</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  required
                />

                <Label htmlFor="branchGroupName">User Group Name</Label>
                <Input
                  id="branchGroupName"
                  name="branchGroupName"
                  placeholder="Enter user group name"
                  required
                />

                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  required
                />

                <Label htmlFor="mobileNo">Mobile No</Label>
                <Input
                  id="mobileNo"
                  name="mobileNo"
                  placeholder="Enter mobile no"
                  required
                />

                <Label htmlFor="schoolId">Admin</Label>
                <Combobox
                  items={schoolOptions}
                  value={selectedSchool || undefined}
                  onValueChange={handleSchoolChange}
                  placeholder="Select Admin"
                  searchPlaceholder="Search Admin..."
                  emptyMessage="No Admin found"
                />

                <Label htmlFor="assignedBranches">Assigned Users</Label>
                <BranchDropdown
                  selectedBranches={selectedBranches}
                  branchOptions={filteredBranches}
                  onBranchToggle={handleBranchToggle}
                  onSelectAll={handleSelectAll}
                />
                {selectedBranches.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedBranches.length} users
                  </div>
                )}

                {/* Permissions Section - Add */}
                <div className="border rounded-lg p-4 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Access</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMasterPermissions(masterOptions.map(o => o.value));
                        setSelectedReportPermissions(reportOptions.map(o => o.value));
                      }}
                    >
                      Select All
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Master</p>
                      <Combobox
                        items={masterOptions}
                        multiple={true}
                        selectedValues={selectedMasterPermissions}
                        onSelectedValuesChange={setSelectedMasterPermissions}
                        className="cursor-pointer"
                        placeholder="Select master permissions..."
                        searchPlaceholder="Search permissions..."
                        emptyMessage="No permissions found"
                        width="w-full"
                        showSelectAll={true}
                        selectAllLabel="Select All"
                        showBadges={true}
                        maxBadges={2}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Reports</p>
                      <Combobox
                        items={reportOptions}
                        multiple={true}
                        selectedValues={selectedReportPermissions}
                        onSelectedValuesChange={setSelectedReportPermissions}
                        className="cursor-pointer"
                        placeholder="Select report permissions..."
                        searchPlaceholder="Search reports..."
                        emptyMessage="No reports found"
                        width="w-full"
                        showSelectAll={true}
                        selectAllLabel="Select All"
                        showBadges={true}
                        maxBadges={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="text-white cursor-pointer" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Save Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Table Wrapper - Remove overflow constraints that might cut off dropdowns */}
      <div className="mb-4 relative">
        <div className="custom-table-container">
          <CustomTable
            data={filteredData || []}
            columns={columns}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            pageSizeArray={[20, 50, "All"]}
            maxHeight="calc(100vh - 240px)"
            minHeight={200}
            showSerialNumber={true}
            noDataMessage={error || "No user groups found"}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          {editTarget && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Edit User Group</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <Label htmlFor="edit-username">User Name</Label>
                <Input
                  id="edit-username"
                  name="username"
                  defaultValue={editTarget.username}
                  required
                />

                <Label htmlFor="edit-branchGroupName">User Group Name</Label>
                <Input
                  id="edit-branchGroupName"
                  name="branchGroupName"
                  defaultValue={editTarget.branchGroupName}
                  required
                />

                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  defaultValue={editTarget.password}
                  required
                />

                <Label htmlFor="edit-mobileNo">Mobile No</Label>
                <Input
                  id="edit-mobileNo"
                  name="mobileNo"
                  defaultValue={editTarget.mobileNo || ""}
                  required
                />

                <Label htmlFor="edit-schoolId">Admin</Label>
                <Combobox
                  items={schoolOptions}
                  value={editSelectedSchool || undefined}
                  onValueChange={handleEditSchoolChange}
                  placeholder="Select Admin"
                  searchPlaceholder="Search Admin..."
                  emptyMessage="No Admin found"
                />

                <Label htmlFor="edit-assignedBranches">Assigned Users</Label>
                <BranchDropdown
                  selectedBranches={editSelectedBranches}
                  branchOptions={filteredEditBranches}
                  onBranchToggle={handleEditBranchToggle}
                  onSelectAll={handleEditSelectAll}
                />
                {editSelectedBranches.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Selected: {editSelectedBranches.length} users
                  </div>
                )}

                {/* Permissions Section - Edit */}
                <div className="border rounded-lg p-4 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Access</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMasterPermissions(masterOptions.map(o => o.value));
                        setSelectedReportPermissions(reportOptions.map(o => o.value));
                      }}
                    >
                      Select All
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Master</p>
                      <Combobox
                        items={masterOptions}
                        multiple={true}
                        selectedValues={selectedMasterPermissions}
                        onSelectedValuesChange={setSelectedMasterPermissions}
                        className="cursor-pointer"
                        placeholder="Select master permissions..."
                        searchPlaceholder="Search permissions..."
                        emptyMessage="No permissions found"
                        width="w-full"
                        showSelectAll={true}
                        selectAllLabel="Select All"
                        showBadges={true}
                        maxBadges={2}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Reports</p>
                      <Combobox
                        items={reportOptions}
                        multiple={true}
                        selectedValues={selectedReportPermissions}
                        onSelectedValuesChange={setSelectedReportPermissions}
                        className="cursor-pointer"
                        placeholder="Select report permissions..."
                        searchPlaceholder="Search reports..."
                        emptyMessage="No reports found"
                        width="w-full"
                        showSelectAll={true}
                        selectAllLabel="Select All"
                        showBadges={true}
                        maxBadges={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-white" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Group"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
