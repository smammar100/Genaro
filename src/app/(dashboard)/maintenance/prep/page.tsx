"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/auth-context";
import { prepService, type PrepCar } from "@/lib/services/prep-service";
import { authService } from "@/lib/services/auth-service";
import { todoService } from "@/lib/services/todo-service";
import { vendorService } from "@/lib/services/vendor-service";
import { downloadBlob, pdfService } from "@/lib/services/pdf-service";
import type { TodoStatus, User } from "@/lib/types";
import { Page } from "@/components/genaro";
import { PrepBoard } from "@/components/prep/prep-board";
import { withTodoStatus } from "@/components/prep/prep-progress";
import { toast } from "@/lib/toast";

// The Things to do sheet only opens from a card, so it loads in its own chunk
// after the board rather than with it.
const PrepTodoSheet = dynamic(
  () => import("@/components/prep/prep-todo-sheet").then((m) => m.PrepTodoSheet),
  { ssr: false },
);

/**
 * Prep & repair — the stage between "inspection complete" and the sales
 * pipeline (GEN-63). A car lands here automatically the moment its inspection
 * is submitted with outstanding items, starting Unassigned; clearing its last
 * Things to do item moves it to Ready and releases it to Sales.
 *
 * The page owns the data and the calls; the board, cards and sheet in
 * src/components/prep only render and report what the user did.
 */
export default function PrepAndRepairPage() {
  const { company, user } = useAuth();
  const companyId = company?.id;
  const [cars, setCars] = useState<PrepCar[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [openCarId, setOpenCarId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!company) return;
    prepService.invalidate();
    setCars(await prepService.getQueue(company.id));
  }, [company]);

  useEffect(() => {
    if (!companyId) return;
    void Promise.all([
      prepService.getQueue(companyId),
      authService.getUsersForCompany(companyId),
    ]).then(([queue, team]) => {
      setCars(queue);
      setUsers(team);
    });
  }, [companyId]);

  async function handleAssign(vehicleId: string, userId: string | null) {
    if (!user) return;
    try {
      await prepService.assign(vehicleId, userId, user.id);
      await refresh();
      toast.success(userId ? "Assigned" : "Returned to Unassigned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't assign this car");
    }
  }

  async function handleSetTodoStatus(car: PrepCar, todoId: string, status: TodoStatus) {
    if (!user) return;
    const before = cars;
    // Optimistic: the tick lands on the card before the save comes back. The
    // reload then moves the car on if that was its last job.
    setCars((list) =>
      list?.map((c) => (c.vehicle.id === car.vehicle.id ? withTodoStatus(c, todoId, status) : c)) ??
      list,
    );
    try {
      await todoService.update(todoId, { status }, user.id);
      await refresh();
    } catch (e) {
      setCars(before);
      toast.error(e instanceof Error ? e.message : "Couldn't save that change");
    }
  }

  async function handleExport(car: PrepCar) {
    if (!company) return;
    setExportingId(car.vehicle.id);
    try {
      const vendors = await vendorService.getAll(company.id);
      const blob = await pdfService.generateJobCard({
        vehicle: car.vehicle,
        todos: car.todos,
        preparedBy: user?.name ?? "—",
        companyName: company.name,
        vendorNames: Object.fromEntries(vendors.map((v) => [v.id, v.name])),
      });
      downloadBlob(blob, `job-card-${car.vehicle.stockId}.pdf`);
      toast.success("Job card downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the job card");
    } finally {
      setExportingId(null);
    }
  }

  const openCar = cars?.find((c) => c.vehicle.id === openCarId) ?? null;

  return (
    <Page
      title="Prep & repair"
      subtitle="Cars between inspection and sale. They arrive when an inspection finds work, and move to sales once every item is done."
      fullWidth
    >
      <PrepBoard
        cars={cars}
        users={users}
        exportingId={exportingId}
        onOpen={setOpenCarId}
        onAssign={(vehicleId, userId) => void handleAssign(vehicleId, userId)}
        onExport={(car) => void handleExport(car)}
        onSetTodoStatus={(car, todoId, status) => void handleSetTodoStatus(car, todoId, status)}
      />
      <PrepTodoSheet
        car={openCar}
        exporting={openCar !== null && exportingId === openCar.vehicle.id}
        onClose={() => setOpenCarId(null)}
        onExport={(car) => void handleExport(car)}
        onChanged={() => void refresh()}
      />
    </Page>
  );
}
