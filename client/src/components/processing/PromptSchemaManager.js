import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Schema as SchemaIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE = 'http://localhost:8787';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );
}

function PromptSchemaManager() {
  const [templates, setTemplates] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingSchema, setEditingSchema] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    description: '',
    systemPrompt: '',
    userPromptTemplate: '',
    variables: []
  });

  const [schemaForm, setSchemaForm] = useState({
    id: '',
    name: '',
    description: '',
    schema: {}
  });

  useEffect(() => {
    loadTemplates();
    loadSchemas();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/prompts/templates`);
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadSchemas = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/prompts/schemas`);
      if (response.data.success) {
        setSchemas(response.data.schemas);
      }
    } catch (err) {
      console.error('Failed to load schemas:', err);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await axios.post(`${API_BASE}/api/prompts/templates`, templateForm);
        enqueueSnackbar('Template updated', { variant: 'success' });
      } else {
        await axios.post(`${API_BASE}/api/prompts/templates`, templateForm);
        enqueueSnackbar('Template created', { variant: 'success' });
      }
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ id: '', name: '', description: '', systemPrompt: '', userPromptTemplate: '', variables: [] });
      loadTemplates();
    } catch (err) {
      enqueueSnackbar('Failed to save template', { variant: 'error' });
    }
  };

  const handleSaveSchema = async () => {
    try {
      if (editingSchema) {
        await axios.post(`${API_BASE}/api/prompts/schemas`, schemaForm);
        enqueueSnackbar('Schema updated', { variant: 'success' });
      } else {
        await axios.post(`${API_BASE}/api/prompts/schemas`, schemaForm);
        enqueueSnackbar('Schema created', { variant: 'success' });
      }
      setSchemaDialogOpen(false);
      setEditingSchema(null);
      setSchemaForm({ id: '', name: '', description: '', schema: {} });
      loadSchemas();
    } catch (err) {
      enqueueSnackbar('Failed to save schema', { variant: 'error' });
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await axios.delete(`${API_BASE}/api/prompts/templates/${id}`);
      enqueueSnackbar('Template deleted', { variant: 'success' });
      loadTemplates();
    } catch (err) {
      enqueueSnackbar('Failed to delete template', { variant: 'error' });
    }
  };

  const handleDeleteSchema = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schema?')) return;
    try {
      await axios.delete(`${API_BASE}/api/prompts/schemas/${id}`);
      enqueueSnackbar('Schema deleted', { variant: 'success' });
      loadSchemas();
    } catch (err) {
      enqueueSnackbar('Failed to delete schema', { variant: 'error' });
    }
  };

  const openTemplateDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm(template);
    } else {
      setEditingTemplate(null);
      setTemplateForm({ id: '', name: '', description: '', systemPrompt: '', userPromptTemplate: '', variables: [] });
    }
    setTemplateDialogOpen(true);
  };

  const openSchemaDialog = (schema = null) => {
    if (schema) {
      setEditingSchema(schema);
      setSchemaForm(schema);
    } else {
      setEditingSchema(null);
      setSchemaForm({ id: '', name: '', description: '', schema: {} });
    }
    setSchemaDialogOpen(true);
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', padding: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SchemaIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Prompt & Schema Manager
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage prompt templates and JSON schemas for LLM interactions.
        </Typography>

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label={`Prompt Templates (${templates.length})`} />
          <Tab label={`JSON Schemas (${schemas.length})`} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openTemplateDialog()}
            >
              New Template
            </Button>
          </Box>
          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} md={6} key={template.id}>
                <Card>
                  <CardHeader
                    title={template.name}
                    subheader={template.description}
                    action={
                      <Box>
                        <IconButton onClick={() => openTemplateDialog(template)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteTemplate(template.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Variables: {template.variables?.join(', ') || 'None'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {template.id}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openSchemaDialog()}
            >
              New Schema
            </Button>
          </Box>
          <Grid container spacing={2}>
            {schemas.map((schema) => (
              <Grid item xs={12} md={6} key={schema.id}>
                <Card>
                  <CardHeader
                    title={schema.name}
                    subheader={schema.description}
                    action={
                      <Box>
                        <IconButton onClick={() => openSchemaDialog(schema)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteSchema(schema.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  />
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      ID: {schema.id}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ID"
                value={templateForm.id}
                onChange={(e) => setTemplateForm({ ...templateForm, id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="System Prompt"
                value={templateForm.systemPrompt}
                onChange={(e) => setTemplateForm({ ...templateForm, systemPrompt: e.target.value })}
                multiline
                rows={6}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="User Prompt Template"
                value={templateForm.userPromptTemplate}
                onChange={(e) => setTemplateForm({ ...templateForm, userPromptTemplate: e.target.value })}
                multiline
                rows={4}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained" startIcon={<SaveIcon />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schema Dialog */}
      <Dialog open={schemaDialogOpen} onClose={() => setSchemaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingSchema ? 'Edit Schema' : 'New Schema'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ID"
                value={schemaForm.id}
                onChange={(e) => setSchemaForm({ ...schemaForm, id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={schemaForm.name}
                onChange={(e) => setSchemaForm({ ...schemaForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={schemaForm.description}
                onChange={(e) => setSchemaForm({ ...schemaForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="JSON Schema"
                value={JSON.stringify(schemaForm.schema, null, 2)}
                onChange={(e) => {
                  try {
                    setSchemaForm({ ...schemaForm, schema: JSON.parse(e.target.value) });
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                multiline
                rows={10}
                helperText="Enter valid JSON schema"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchemaDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSchema} variant="contained" startIcon={<SaveIcon />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PromptSchemaManager;

