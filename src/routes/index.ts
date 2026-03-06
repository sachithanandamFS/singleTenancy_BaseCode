import { Express } from "express";
import employeeRoutes from "./employee.routes.js";
import roleRoutes from "./role.routes.js";

export default function (app: Express) {
  app.use("/api/employee", employeeRoutes);
  app.use("/api/roles", roleRoutes);
}
