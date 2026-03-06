import Role from "./role.model.js";
import RoleResponsibility from "./role-responsibility.model.js";
import User from "./user.model.js";
import UserRole from "./user-role.model.js";
// import { ThroughOptions } from "sequelize";

User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: "user_id",
  otherKey: "role_id",
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: "role_id",
  otherKey: "user_id",
});

export {
  User,
  Role,
  RoleResponsibility
};
