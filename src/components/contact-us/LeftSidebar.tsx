'use client';
import React from 'react';
import { Search, MessageCircle } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
}

const LeftSidebar = ({
  showSidebar,
  contacts,
  selectedContact,
  onSelectContact,
  onToggleSidebar,
}: {
  showSidebar: boolean;
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  onToggleSidebar: () => void;
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  return (
    <div
      className={`${showSidebar ? 'w-80' : 'w-0'
        } bg-white border-r border-blue-100 flex flex-col transition-all duration-300 overflow-hidden h-full flex-shrink-0`}
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-200 to-indigo-200 border-b border-blue-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">Chats</h2>
          <button className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
            <MessageCircle className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-700 w-4 h-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-blue-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-blue-700"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className={`w-full p-4 flex items-center space-x-3 transition-colors ${selectedContact?.id === contact.id
                ? "bg-blue-100 border-r-4 border-blue-500"
                : "hover:bg-gray-50 bg-white"
                }`}
            >
              <div className="flex items-start space-x-3">
                {/* Contact Avatar */}
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {contact.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1 truncate">
                    {contact.phone}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate flex-1 mr-2">
                      {contact.lastMessage}
                    </p>
                    {contact.unread && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredContacts.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No contacts found
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3b82f6;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default LeftSidebar;