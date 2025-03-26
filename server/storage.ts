import { 
  users, 
  type User, 
  type InsertUser, 
  type AnimationPreset, 
  type InsertPreset, 
  type AnimationProject, 
  type InsertProject 
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Animation Preset methods
  getAllPresets(): Promise<AnimationPreset[]>;
  getPreset(id: number): Promise<AnimationPreset | undefined>;
  createPreset(preset: InsertPreset): Promise<AnimationPreset>;
  updatePreset(id: number, preset: InsertPreset): Promise<AnimationPreset | undefined>;
  deletePreset(id: number): Promise<boolean>;
  
  // Animation Project methods
  getAllProjects(): Promise<AnimationProject[]>;
  getProject(id: number): Promise<AnimationProject | undefined>;
  createProject(project: InsertProject): Promise<AnimationProject>;
  updateProject(id: number, project: InsertProject): Promise<AnimationProject | undefined>;
  deleteProject(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private presets: Map<number, AnimationPreset>;
  private projects: Map<number, AnimationProject>;
  private userId: number;
  private presetId: number;
  private projectId: number;

  constructor() {
    this.users = new Map();
    this.presets = new Map();
    this.projects = new Map();
    this.userId = 1;
    this.presetId = 1;
    this.projectId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Animation Preset methods
  async getAllPresets(): Promise<AnimationPreset[]> {
    return Array.from(this.presets.values());
  }
  
  async getPreset(id: number): Promise<AnimationPreset | undefined> {
    return this.presets.get(id);
  }
  
  async createPreset(insertPreset: InsertPreset): Promise<AnimationPreset> {
    const id = this.presetId++;
    const now = new Date();
    
    // Create a properly typed object instead of spreading
    const preset: AnimationPreset = { 
      id,
      name: insertPreset.name,
      category: insertPreset.category,
      animation: insertPreset.animation,
      icon: insertPreset.icon,
      userId: insertPreset.userId || null,
      isPublic: insertPreset.isPublic || false,
      createdAt: now
    };
    
    this.presets.set(id, preset);
    return preset;
  }
  
  async updatePreset(id: number, insertPreset: InsertPreset): Promise<AnimationPreset | undefined> {
    const existingPreset = this.presets.get(id);
    if (!existingPreset) {
      return undefined;
    }
    
    // Create a properly typed updated object
    const updatedPreset: AnimationPreset = { 
      id: existingPreset.id,
      name: insertPreset.name || existingPreset.name,
      category: insertPreset.category || existingPreset.category,
      animation: insertPreset.animation || existingPreset.animation,
      icon: insertPreset.icon || existingPreset.icon,
      userId: insertPreset.userId !== undefined ? insertPreset.userId : existingPreset.userId,
      isPublic: insertPreset.isPublic !== undefined ? insertPreset.isPublic : existingPreset.isPublic,
      createdAt: existingPreset.createdAt
    };
    
    this.presets.set(id, updatedPreset);
    return updatedPreset;
  }
  
  async deletePreset(id: number): Promise<boolean> {
    if (!this.presets.has(id)) {
      return false;
    }
    return this.presets.delete(id);
  }
  
  // Animation Project methods
  async getAllProjects(): Promise<AnimationProject[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<AnimationProject | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<AnimationProject> {
    const id = this.projectId++;
    const now = new Date();
    
    // Create a properly typed object instead of spreading
    const project: AnimationProject = { 
      id,
      name: insertProject.name,
      data: insertProject.data,
      userId: insertProject.userId || null,
      thumbnail: insertProject.thumbnail || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, insertProject: InsertProject): Promise<AnimationProject | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) {
      return undefined;
    }
    
    const now = new Date();
    
    // Create a properly typed updated object
    const updatedProject: AnimationProject = { 
      id: existingProject.id,
      name: insertProject.name || existingProject.name,
      data: insertProject.data || existingProject.data,
      userId: insertProject.userId !== undefined ? insertProject.userId : existingProject.userId,
      thumbnail: insertProject.thumbnail !== undefined ? insertProject.thumbnail : existingProject.thumbnail,
      createdAt: existingProject.createdAt,
      updatedAt: now
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    if (!this.projects.has(id)) {
      return false;
    }
    return this.projects.delete(id);
  }
}

export const storage = new MemStorage();
