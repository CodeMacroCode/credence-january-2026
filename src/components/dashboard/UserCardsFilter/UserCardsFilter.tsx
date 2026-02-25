import { X, Users } from "lucide-react";

interface UserItem {
    label: string;
    value: string;
}

interface UserCardsFilterProps {
    users: UserItem[];
    selectedValue?: string;
    onSelect: (value: string | undefined) => void;
}

export function UserCardsFilter({ users, selectedValue, onSelect }: UserCardsFilterProps) {
    if (!users || users.length === 0) return null;

    return (
        <div className="w-full bg-white p-3 rounded-lg shadow-sm border border-gray-100 mt-2 mb-2">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onSelect(undefined)}
                    className={`
            relative flex items-center justify-center px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 border text-sm
            ${!selectedValue
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                        }
          `}
                >
                    All Users
                </button>
                {users.map((user) => {
                    const isSelected = selectedValue === user.value;
                    return (
                        <button
                            key={user.value}
                            onClick={() => onSelect(isSelected ? undefined : user.value)}
                            className={`
                group relative flex items-center justify-center px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 border text-sm
                ${isSelected
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                                }
              `}
                        >
                            <span>{user.label}</span>
                            {isSelected && (
                                <X
                                    className="w-4 h-4 ml-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(undefined);
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
