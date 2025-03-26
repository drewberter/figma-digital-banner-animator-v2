import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exportGifOptionsSchema, exportHtmlOptionsSchema, insertPresetSchema, insertProjectSchema } from "@shared/schema";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for animation presets
  app.get("/api/presets", async (req, res) => {
    try {
      const presets = await storage.getAllPresets();
      res.json(presets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch presets" });
    }
  });

  app.get("/api/presets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const preset = await storage.getPreset(id);
      
      if (!preset) {
        return res.status(404).json({ message: "Preset not found" });
      }
      
      res.json(preset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch preset" });
    }
  });

  app.post("/api/presets", async (req, res) => {
    try {
      const validatedData = insertPresetSchema.parse(req.body);
      const preset = await storage.createPreset(validatedData);
      res.status(201).json(preset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const readableError = fromZodError(error);
        return res.status(400).json({ 
          message: "Invalid preset data", 
          errors: readableError.details 
        });
      }
      res.status(500).json({ message: "Failed to create preset" });
    }
  });

  app.put("/api/presets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPresetSchema.parse(req.body);
      const preset = await storage.updatePreset(id, validatedData);
      
      if (!preset) {
        return res.status(404).json({ message: "Preset not found" });
      }
      
      res.json(preset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const readableError = fromZodError(error);
        return res.status(400).json({ 
          message: "Invalid preset data", 
          errors: readableError.details 
        });
      }
      res.status(500).json({ message: "Failed to update preset" });
    }
  });

  app.delete("/api/presets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePreset(id);
      
      if (!success) {
        return res.status(404).json({ message: "Preset not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete preset" });
    }
  });

  // API routes for animation projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const readableError = fromZodError(error);
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: readableError.details 
        });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const readableError = fromZodError(error);
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: readableError.details 
        });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Export API endpoints
  app.post("/api/export/gif", async (req, res) => {
    try {
      const validatedData = exportGifOptionsSchema.parse(req.body);
      // Process the export (this would be handled by the frontend in a real Figma plugin)
      res.json({ success: true, message: "GIF export initiated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const readableError = fromZodError(error);
        return res.status(400).json({ 
          message: "Invalid export options", 
          errors: readableError.details 
        });
      }
      res.status(500).json({ message: "Failed to process GIF export" });
    }
  });

  app.post("/api/export/html", async (req, res) => {
    try {
      const validatedData = exportHtmlOptionsSchema.parse(req.body);
      // Process the export (this would be handled by the frontend in a real Figma plugin)
      res.json({ success: true, message: "HTML export initiated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const readableError = fromZodError(error);
        return res.status(400).json({ 
          message: "Invalid export options", 
          errors: readableError.details 
        });
      }
      res.status(500).json({ message: "Failed to process HTML export" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
