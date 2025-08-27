// iptv-backend/routes/admin.routes.js
import express from "express";
import { verifyToken, isAdmin } from "../middlewares/verifyToken.js"; // Asegúrate que la ruta sea correcta

// Importaremos las funciones del controlador de admin (o un controlador de usuarios si lo prefieres)
// Asumiremos que estas funciones estarán en admin.controller.js por ahora
import {
  getAllUsersAdmin,
  updateUserPlanAdmin,
  updateUserStatusAdmin,
  // (Opcional) getUserByIdAdmin,
  // ... (aquí podrían ir otras funciones de admin que ya tengas, como las de contenido)
} from "../controllers/admin.controller.js"; // Asegúrate que la ruta sea correcta

const router = express.Router();

// --- RUTAS PARA LA GESTIÓN DE USUARIOS (SOLO ADMIN) ---

// GET /api/admin/users - Obtener todos los usuarios para el panel de admin
router.get("/users", verifyToken, isAdmin, getAllUsersAdmin);

// PUT /api/admin/users/:userId/plan - Actualizar el plan de un usuario específico
router.put("/users/:userId/plan", verifyToken, isAdmin, updateUserPlanAdmin);

// PUT /api/admin/users/:userId/status - Activar/desactivar un usuario específico
router.put("/users/:userId/status", verifyToken, isAdmin, updateUserStatusAdmin);

// (Opcional) GET /api/admin/users/:userId - Obtener detalles de un usuario específico
// router.get("/users/:userId", verifyToken, isAdmin, getUserByIdAdmin);


// --- OTRAS RUTAS DE ADMINISTRACIÓN QUE YA PUEDAS TENER ---
// Por ejemplo, si tenías rutas para estadísticas, configuraciones globales, etc.
// router.get("/dashboard-stats", verifyToken, isAdmin, getDashboardStats);
// router.post("/settings", verifyToken, isAdmin, updateGlobalSettings);

export default router;
