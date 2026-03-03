"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, DollarSign } from "lucide-react";

interface Transaction {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  coach_id: string;
  coach_name: string;
  pack_name: string;
  amount: number;
  sessions_total: number;
  sessions_remaining: number;
  status: string;
  purchased_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const totalVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex items-center justify-between fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h2>
        <button
          onClick={loadTransactions}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Summary
          </CardTitle>
          <CardDescription>Read-only monitoring of pack purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-2xl font-bold">€{totalVolume.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
          <CardDescription>All purchased_packs with client, coach, amount, and date</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-left py-3 px-2 font-medium">Client</th>
                    <th className="text-left py-3 px-2 font-medium">Coach</th>
                    <th className="text-left py-3 px-2 font-medium">Pack</th>
                    <th className="text-right py-3 px-2 font-medium">Amount</th>
                    <th className="text-center py-3 px-2 font-medium">Sessions</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2">
                        {new Date(t.purchased_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <div>{t.client_name}</div>
                        <div className="text-xs text-muted-foreground">{t.client_email}</div>
                      </td>
                      <td className="py-3 px-2">{t.coach_name}</td>
                      <td className="py-3 px-2">{t.pack_name}</td>
                      <td className="py-3 px-2 text-right font-medium">€{t.amount.toFixed(2)}</td>
                      <td className="py-3 px-2 text-center">
                        {t.sessions_remaining}/{t.sessions_total}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : t.status === "exhausted"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
