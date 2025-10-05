import express from "express"
import { helloWorld } from "../controllers/exemploController.js"

const router = express.Router()
router.get("/", helloWorld)

export default router