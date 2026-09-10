import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchRooms } from "@/lib/queries";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms · AI Course Timetable" },
      {
        name: "description",
        content: "Manage classrooms and labs with their seating capacity for automatic allocation.",
      },
      { property: "og:title", content: "Rooms · AI Course Timetable" },
      { property: "og:description", content: "Classrooms and labs available for scheduling." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <RoomsPage />
    </RoleGate>
  ),
});

function RoomsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState("Classroom");
  const [capacity, setCapacity] = useState(60);

  const rooms = useQuery({ queryKey: ["rooms"], queryFn: fetchRooms });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("rooms")
        .insert({ room_number: roomNumber, room_type: roomType, capacity });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setOpen(false);
      setRoomNumber("");
      toast.success("Room added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rooms</h1>
          <p className="text-sm text-muted-foreground">
            The optimiser always picks the smallest suitable room.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Room number</Label>
                <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Room type</Label>
                <Select value={roomType} onValueChange={setRoomType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Lab">Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Room</th>
              <th className="p-3">Type</th>
              <th className="p-3">Capacity</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(rooms.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium">{r.room_number}</td>
                <td className="p-3">{r.room_type}</td>
                <td className="p-3">{r.capacity}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
