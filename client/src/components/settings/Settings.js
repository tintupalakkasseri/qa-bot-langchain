import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE = 'http://localhost:8787';

function Settings() {
  const [env, setEnv] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadEnv();
  }, []);

  const loadEnv = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/env`);
      if (response.data.success) {
        setEnv(response.data.env || {});
      }
    } catch (err) {
      console.error('Failed to load environment:', err);
      enqueueSnackbar('Failed to load environment settings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/env`, { env });
      enqueueSnackbar('Settings saved successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key) => {
    setShowSecrets({ ...showSecrets, [key]: !showSecrets[key] });
  };

  const envFields = [
    { key: 'MONGODB_URI', label: 'MongoDB URI', sensitive: true },
    { key: 'MONGODB_DB_NAME', label: 'Database Name', sensitive: false },
    { key: 'MONGODB_COLLECTION', label: 'Collection Name', sensitive: false },
    { key: 'MONGODB_VECTOR_INDEX', label: 'Vector Index Name', sensitive: false },
    { key: 'MONGODB_BM25_INDEX', label: 'BM25 Index Name', sensitive: false },
    { key: 'MISTRAL_API_KEY', label: 'Mistral API Key', sensitive: true },
    { key: 'GROQ_API_KEY', label: 'Groq API Key', sensitive: true },
    { key: 'MODEL_PROVIDER', label: 'Model Provider', sensitive: false },
    { key: 'GROQ_MODEL', label: 'Groq Model', sensitive: false },
    { key: 'TEMPERATURE', label: 'Temperature', sensitive: false },
    { key: 'PORT', label: 'Server Port', sensitive: false }
  ];

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', padding: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1">
                Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure environment variables and system settings
              </Typography>
            </Box>
          </Box>
          <Box>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadEnv}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {envFields.map((field) => (
              <Grid item xs={12} md={6} key={field.key}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {field.label}
                      </Typography>
                      {field.sensitive && (
                        <IconButton
                          size="small"
                          onClick={() => toggleSecret(field.key)}
                        >
                          {showSecrets[field.key] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      )}
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      type={field.sensitive && !showSecrets[field.key] ? 'password' : 'text'}
                      value={env[field.key] || ''}
                      onChange={(e) => setEnv({ ...env, [field.key]: e.target.value })}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {field.key}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> These settings are stored in the backend. Changes may require a server restart to take effect.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
}

export default Settings;

