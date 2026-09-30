"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarPlus, Languages, Shield, Trash2, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { translate } from "@/lib/i18n";
import { getReminders } from "@/lib/data";
import { remindersApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Reminder } from "@/lib/types";

export default function SettingsPage() {
  const { user, language, setLanguage, isDemo } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    getReminders().then(setReminders);
  }, []);

  async function addReminder() {
    if (!title.trim() || !date) return;
    const r = await remindersApi.create({
      title: title.trim(),
      date,
    });
    setReminders((prev) => [...prev, r]);
    setTitle("");
    setDate("");
  }

  async function removeReminder(id: number) {
    try {
      await remindersApi.remove(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div>
        <h1 className="font-editorial text-2xl font-semibold tracking-tight">
          {translate("settings.title", language)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {translate("settings.subtitle", language)}
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">
              {(user?.full_name || user?.email || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.full_name || "Demo User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-4 w-4 text-primary" />
            Language
          </CardTitle>
          <CardDescription>
            The interface supports English and German. Your documents stay in their
            original language.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => setLanguage("en")}
            >
              English
            </Button>
            <Button
              variant={language === "de" ? "default" : "outline"}
              onClick={() => setLanguage("de")}
            >
              Deutsch
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Reminders
          </CardTitle>
          <CardDescription>
            Keep track of deadlines from your documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="reminder-title">Reminder</Label>
              <Input
                id="reminder-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pay utility settlement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-date">Date</Label>
              <Input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={addReminder} disabled={!title.trim() || !date}>
            <CalendarPlus className="h-4 w-4" />
            Add reminder
          </Button>

          <div className="space-y-2 border-t pt-4">
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reminders yet.</p>
            ) : (
              reminders.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                  </div>
                  <button
                    onClick={() => removeReminder(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            About RentWise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            RentWise provides informational assistance and is not a substitute for
            professional legal advice. It helps you understand your rental
            documents — it does not make legal conclusions.
          </p>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            {isDemo
              ? "You are viewing the demo data. Connect the RentWise backend to process your own documents."
              : "Connected to the RentWise backend."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
