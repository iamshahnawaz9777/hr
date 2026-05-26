import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Calendar, Flag, User2, MoreHorizontal, Pencil, Trash2, Folder } from 'lucide-react';
import { format } from 'date-fns';
import type { Project, Task, TaskStatus, TaskPriority, Profile } from '@/types/types';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'bg-muted' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-info' },
  { key: 'review', label: 'Review', color: 'bg-warning' },
  { key: 'done', label: 'Done', color: 'bg-success' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-success border-success',
  medium: 'text-warning border-warning',
  high: 'text-destructive border-destructive',
  urgent: 'text-destructive border-destructive',
};

const PRIORITY_BAR: Record<TaskPriority, string> = {
  low: 'bg-success',
  medium: 'bg-warning',
  high: 'bg-destructive',
  urgent: 'bg-destructive',
};

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: string;
  assignee_id: string;
  status: TaskStatus;
}

const DEFAULT_TASK: TaskFormData = {
  title: '', description: '', priority: 'medium', due_date: '', assignee_id: '', status: 'todo',
};

export default function ProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [taskForm, setTaskForm] = useState<TaskFormData>(DEFAULT_TASK);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  const canManageProjects = ['admin', 'manager'].includes(profile?.role || '');

  useEffect(() => {
    fetchProjects();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProject) fetchTasks(selectedProject.id);
  }, [selectedProject]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, username, full_name, role').order('full_name');
    setProfiles(Array.isArray(data) ? (data as Profile[]) : []);
  };

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    const list = Array.isArray(data) ? data : [];
    setProjects(list);
    if (list.length > 0 && !selectedProject) setSelectedProject(list[0]);
    setLoading(false);
  };

  const fetchTasks = async (projectId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assignee_id_fkey(id, username, full_name)')
      .eq('project_id', projectId)
      .order('position', { ascending: true });
    setTasks(Array.isArray(data) ? data : []);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) { toast.error('Project name is required'); return; }
    const { error } = await supabase.from('projects').insert({
      name: projectName.trim(),
      description: projectDesc.trim() || null,
      created_by: profile?.id,
    });
    if (error) { toast.error('Failed to create project'); return; }
    toast.success('Project created');
    setProjectName(''); setProjectDesc('');
    setShowProjectDialog(false);
    fetchProjects();
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { toast.error('Failed to delete project'); return; }
    toast.success('Project deleted');
    setSelectedProject(null);
    fetchProjects();
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) { toast.error('Task title is required'); return; }
    if (!selectedProject) return;
    setSavingTask(true);
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      assignee_id: taskForm.assignee_id || null,
      status: taskForm.status,
      project_id: selectedProject.id,
      created_by: profile?.id,
    };
    if (editingTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
      if (error) { toast.error('Failed to update task'); setSavingTask(false); return; }
      toast.success('Task updated');
      // Log activity
      await supabase.from('task_activities').insert({ task_id: editingTask.id, user_id: profile?.id, action: `Updated task "${taskForm.title}"` });
    } else {
      const maxPos = tasks.filter(t => t.status === taskForm.status).length;
      const { data, error } = await supabase.from('tasks').insert({ ...payload, position: maxPos }).select().single();
      if (error || !data) { toast.error('Failed to create task'); setSavingTask(false); return; }
      toast.success('Task created');
      await supabase.from('task_activities').insert({ task_id: data.id, user_id: profile?.id, action: `Created task "${taskForm.title}"` });
    }
    setSavingTask(false);
    setShowTaskDialog(false);
    setEditingTask(null);
    setTaskForm(DEFAULT_TASK);
    fetchTasks(selectedProject.id);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { toast.error('Failed to delete task'); return; }
    toast.success('Task deleted');
    if (selectedProject) fetchTasks(selectedProject.id);
  };

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Optimistic update
    const updated = tasks.map(t => t.id === draggableId ? { ...t, status: newStatus } : t);
    setTasks(updated);

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', draggableId);
    if (error) {
      toast.error('Failed to move task');
      setTasks(tasks);
      return;
    }
    await supabase.from('task_activities').insert({
      task_id: draggableId, user_id: profile?.id,
      action: `Moved to "${COLUMNS.find(c => c.key === newStatus)?.label}"`
    });
  }, [tasks, profile]);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const getColumnTasks = (status: TaskStatus) =>
    filteredTasks.filter(t => t.status === status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Projects</h1>
        {canManageProjects && (
          <Button size="sm" onClick={() => setShowProjectDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Project
          </Button>
        )}
      </div>

      {/* Project Selector */}
      {loading ? (
        <Skeleton className="h-10 bg-muted w-64" />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {projects.map(proj => (
            <div key={proj.id} className="flex items-center gap-1">
              <Button
                variant={selectedProject?.id === proj.id ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setSelectedProject(proj)}
                className="h-8"
              >
                <Folder className="w-3.5 h-3.5 mr-1.5" />
                {proj.name}
              </Button>
              {canManageProjects && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProject(proj.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          {projects.length === 0 && !loading && (
            <p className="text-muted-foreground text-sm">No projects yet. {canManageProjects ? 'Create one!' : ''}</p>
          )}
        </div>
      )}

      {selectedProject && (
        <>
          {/* Board Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-48 h-9"
              />
            </div>
            <Button size="sm" onClick={() => { setTaskForm(DEFAULT_TASK); setEditingTask(null); setShowTaskDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>

          {/* Kanban Board */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
              {COLUMNS.map(col => {
                const colTasks = getColumnTasks(col.key);
                return (
                  <div key={col.key} className="flex flex-col min-w-[240px]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                      <span className="font-semibold text-sm text-foreground">{col.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
                    </div>
                    <Droppable droppableId={col.key}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-2 min-h-[120px] rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-accent' : 'bg-muted/40'}`}
                        >
                          {colTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`cursor-grab active:cursor-grabbing transition-shadow border-l-4 ${PRIORITY_BAR[task.priority]} ${snapshot.isDragging ? 'shadow-hover opacity-90 rotate-1' : 'shadow-card hover:shadow-hover'}`}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-1 mb-2">
                                      <p className="text-sm font-medium text-foreground text-pretty flex-1">{task.title}</p>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><MoreHorizontal className="w-3 h-3" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => { setEditingTask(task); setTaskForm({ title: task.title, description: task.description || '', priority: task.priority, due_date: task.due_date || '', assignee_id: task.assignee_id || '', status: task.status }); setShowTaskDialog(true); }}>
                                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                                        <Flag className="w-2.5 h-2.5 mr-1" />{task.priority}
                                      </Badge>
                                      {task.due_date && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {format(new Date(task.due_date), 'MMM d')}
                                        </span>
                                      )}
                                      {task.assignee && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                                          <User2 className="w-3 h-3" />
                                          {task.assignee.full_name || task.assignee.username}
                                        </span>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Project Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Enter project name" value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Description</Label>
              <Textarea placeholder="Optional description" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowProjectDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateProject}>Create Project</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={v => { setShowTaskDialog(v); if (!v) { setEditingTask(null); setTaskForm(DEFAULT_TASK); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Title <span className="text-destructive">*</span></Label>
              <Input placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Description</Label>
              <Textarea placeholder="Optional details" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Status</Label>
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v as TaskStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v as TaskPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Due Date</Label>
                <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Assignee</Label>
                <Select value={taskForm.assignee_id || 'none'} onValueChange={v => setTaskForm(f => ({ ...f, assignee_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveTask} disabled={savingTask}>
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
