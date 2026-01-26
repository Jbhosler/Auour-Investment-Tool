import React from 'react';
import { Account } from '../types';

interface AccountSelectorProps {
    accounts: Account[];
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onAddAccount: () => void;
    onDeleteAccount: (id: string) => void;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
    accounts,
    selectedAccountId,
    onSelectAccount,
    onAddAccount,
    onDeleteAccount
}) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Accounts</h2>
            <div className="space-y-2">
                {accounts.map((account) => (
                    <button
                        key={account.id}
                        onClick={() => onSelectAccount(account.id)}
                        className={`w-full text-left p-3 rounded ${
                            selectedAccountId === account.id
                                ? 'bg-blue-100 border-2 border-blue-500'
                                : 'bg-gray-50 border-2 border-transparent'
                        }`}
                    >
                        {account.accountName}
                    </button>
                ))}
            </div>
            <button
                onClick={onAddAccount}
                className="mt-4 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
                + Add Account
            </button>
        </div>
    );
};

export default AccountSelector;
