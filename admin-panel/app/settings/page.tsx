"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, Monitor, Mail, Download, Trash2, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [platformName, setPlatformName] = useState("GoFit");
  const [supportEmail, setSupportEmail] = useState("support@gofit.com");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxUsersPerPlan, setMaxUsersPerPlan] = useState(1000);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });
  const [exportPrefs, setExportPrefs] = useState({
    format: "csv",
    includeHeaders: true,
    dateFormat: "ISO",
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true);
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setPlatformName(data.settings.platformName || "GoFit");
            setSupportEmail(data.settings.supportEmail || "support@gofit.com");
            setMaintenanceMode(data.settings.maintenanceMode || false);
            setMaxUsersPerPlan(data.settings.maxUsersPerPlan || 1000);
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  const handleSavePlatform = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platformName: platformName,
          supportEmail: supportEmail,
          maintenanceMode: maintenanceMode,
          maxUsersPerPlan: maxUsersPerPlan,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      const data = await response.json();
      toast({
        title: "Settings saved",
        description: "Platform settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    if (typeof window !== "undefined") {
      // Clear localStorage
      localStorage.clear();
      toast({
        title: "Cache cleared",
        description: "All cached data has been cleared.",
      });
    }
  };

  const handleExportPreferences = () => {
    // Save to localStorage
    localStorage.setItem("exportPreferences", JSON.stringify(exportPrefs));
    toast({
      title: "Export preferences saved",
      description: "Your export preferences have been saved.",
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex items-center justify-between fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <div className="grid gap-6">
        {/* Theme Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Theme Preferences
            </CardTitle>
            <CardDescription>
              Customize the appearance of the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme Mode</Label>
              <Select value={theme} onValueChange={(value) => setTheme(value)}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose your preferred theme or match your system preference
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Browser push notifications
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, push: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-xs text-muted-foreground">
                  Receive weekly summary emails
                </p>
              </div>
              <Switch
                id="weekly-digest"
                checked={notifications.weekly}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, weekly: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Export Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Export Preferences
            </CardTitle>
            <CardDescription>
              Customize default export settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-format">Default Export Format</Label>
              <Select
                value={exportPrefs.format}
                onValueChange={(value) =>
                  setExportPrefs({ ...exportPrefs, format: value })
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-date-format">Date Format</Label>
              <Select
                value={exportPrefs.dateFormat}
                onValueChange={(value) =>
                  setExportPrefs({ ...exportPrefs, dateFormat: value })
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISO">ISO 8601</SelectItem>
                  <SelectItem value="US">MM/DD/YYYY</SelectItem>
                  <SelectItem value="EU">DD/MM/YYYY</SelectItem>
                  <SelectItem value="Locale">Local Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-headers">Include Headers</Label>
                <p className="text-xs text-muted-foreground">
                  Include column headers in CSV exports
                </p>
              </div>
              <Switch
                id="include-headers"
                checked={exportPrefs.includeHeaders}
                onCheckedChange={(checked) =>
                  setExportPrefs({ ...exportPrefs, includeHeaders: checked })
                }
              />
            </div>
            <Button onClick={handleExportPreferences} variant="outline">
              Save Export Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Cache Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Cache Management
            </CardTitle>
            <CardDescription>
              Manage cached data and storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Local Storage</Label>
                <p className="text-xs text-muted-foreground">
                  Clear all cached data stored in your browser
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearCache}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Cache
              </Button>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <p>Clearing cache will remove:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Theme preferences</li>
                <li>Export settings</li>
                <li>Filter preferences</li>
                <li>Other cached data</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Settings</CardTitle>
            <CardDescription>
              Configure general platform settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="Platform name"
                disabled={loadingSettings || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@gofit.com"
                disabled={loadingSettings || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-users">Max Users Per Plan</Label>
              <Input
                id="max-users"
                type="number"
                value={maxUsersPerPlan}
                onChange={(e) => setMaxUsersPerPlan(parseInt(e.target.value) || 1000)}
                placeholder="1000"
                disabled={loadingSettings || loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Put the platform in maintenance mode
                </p>
              </div>
              <Switch
                id="maintenance-mode"
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
                disabled={loadingSettings || loading}
              />
            </div>
            <Button onClick={handleSavePlatform} disabled={loading || loadingSettings}>
              {(loading || loadingSettings) && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {loadingSettings ? "Loading..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>
              Database connection and maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Status</Label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Connected</span>
              </div>
            </div>
            <Button variant="outline">View Database Stats</Button>
          </CardContent>
        </Card>

        {/* Admin Panel Info */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>
              Admin panel configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Version</p>
                <p className="text-xs text-muted-foreground">1.0.0</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
