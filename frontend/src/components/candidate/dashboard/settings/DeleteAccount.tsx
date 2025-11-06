import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useDeleteAccount } from '@/src/lib/auth/auth.queries';

const DeleteAccountSection = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const deleteAccountMutation = useDeleteAccount();

  const handleDelete = () => {
    if (confirmText === 'DELETE') {
      console.log('Account deletion confirmed');
      console.log()
      deleteAccountMutation.mutate();
    }
  };

  return (
    <div className="border border-red-300 p-4 rounded-lg bg-red-50">
      <div className="flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
        <span className="font-medium text-red-700">Danger Zone</span>
      </div>

      {!showConfirm ? (
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-red-700">Delete Account</h3>
            <p className="text-sm text-red-600">
              Permanently delete your account and all data. This cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-red-700 font-medium mb-2">
              Are you absolutely sure? This will permanently delete:
            </p>
            <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
              <li>Your profile and all personal information</li>
              <li>All uploaded documents and files</li>
              <li>Job applications and history</li>
              <li>Account settings and preferences</li>
            </ul>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-red-700 mb-1">
              Type "DELETE" to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="border border-red-300 rounded-md px-3 py-2 w-full"
              placeholder="Type DELETE"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleteAccountMutation.isPending}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText('');
              }}
              className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountSection;