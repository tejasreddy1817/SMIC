import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Film,
  Image,
  Play,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: "reel" | "post" | "video" | "story";
  status: "draft" | "scheduled" | "published";
  platform: string;
}

const MOCK_EVENTS: CalendarEvent[] = [
  { id: "1", title: "AI Tools Reel", date: "2026-02-23", time: "14:00", type: "reel", status: "scheduled", platform: "instagram" },
  { id: "2", title: "Morning Routine", date: "2026-02-25", time: "09:00", type: "video", status: "scheduled", platform: "youtube_shorts" },
  { id: "3", title: "Tech Tips #43", date: "2026-02-26", time: "18:00", type: "reel", status: "draft", platform: "instagram" },
  { id: "4", title: "Product Review", date: "2026-02-28", time: "12:00", type: "post", status: "scheduled", platform: "instagram" },
  { id: "5", title: "Q&A Session", date: "2026-03-01", time: "20:00", type: "video", status: "draft", platform: "youtube_shorts" },
  { id: "6", title: "BTS Shoot Day", date: "2026-02-21", time: "10:00", type: "story", status: "published", platform: "instagram" },
  { id: "7", title: "Coding Tutorial", date: "2026-02-20", type: "video", status: "published", platform: "youtube_shorts" },
  { id: "8", title: "Motivational Post", date: "2026-02-24", time: "07:00", type: "post", status: "scheduled", platform: "instagram" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const typeIcon: Record<string, any> = {
  reel: Film,
  post: Image,
  video: Play,
  story: Activity,
};

const statusColor: Record<string, string> = {
  draft: "bg-gray-500",
  scheduled: "bg-blue-500",
  published: "bg-green-500",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    );
  };

  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getEventsForDate = (dateStr: string) => {
    return MOCK_EVENTS.filter((e) => e.date === dateStr);
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Upcoming events (next 7 days)
  const upcomingEvents = MOCK_EVENTS.filter((e) => {
    const eventDate = new Date(e.date);
    const diff = (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
              Content Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              Plan and schedule your content across platforms
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Content
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold min-w-[180px] text-center">
                    {MONTHS[currentMonth]} {currentYear}
                  </h2>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the first */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-20 rounded-lg" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDate(day);
                  const events = getEventsForDate(dateStr);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "h-20 rounded-lg border p-1.5 cursor-pointer transition-all hover:border-primary/50",
                        isToday && "border-primary bg-primary/5",
                        isSelected && "ring-2 ring-primary border-primary",
                        !isToday && !isSelected && "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary font-bold"
                        )}
                      >
                        {day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {events.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "rounded px-1 py-0.5 text-[10px] text-white truncate",
                              statusColor[event.status]
                            )}
                          >
                            {event.title}
                          </div>
                        ))}
                        {events.length > 2 && (
                          <span className="text-[10px] text-muted-foreground pl-1">
                            +{events.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                  <span className="text-xs text-muted-foreground">Draft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Published</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedDate
                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a date"}
                </CardTitle>
                <CardDescription>
                  {selectedEvents.length
                    ? `${selectedEvents.length} item${selectedEvents.length > 1 ? "s" : ""}`
                    : "No content scheduled"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nothing scheduled</p>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Content
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => {
                      const TypeIcon = typeIcon[event.type];
                      return (
                        <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0 mt-0.5">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {event.time && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {event.time}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {event.platform.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming (7 days)</CardTitle>
                <CardDescription>{upcomingEvents.length} items</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming content</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => {
                      const TypeIcon = typeIcon[event.type];
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedDate(event.date)}
                        >
                          <div className={cn("h-2 w-2 rounded-full shrink-0", statusColor[event.status])} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                              {event.time && ` at ${event.time}`}
                            </p>
                          </div>
                          <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
