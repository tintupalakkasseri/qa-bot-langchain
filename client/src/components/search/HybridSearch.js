import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Alert,
  Collapse,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Slider,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ArticleIcon from '@mui/icons-material/Article';
import InfoIcon from '@mui/icons-material/Info';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE = 'http://localhost:8787';

function HybridSearch() {
  const [query, setQuery] = useState('As a user, I want to create an account');
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchInfo, setSearchInfo] = useState(null);
  const [error, setError] = useState(null);
  
  // Weight sliders
  const [bm25Weight, setBm25Weight] = useState(50);
  const [vectorWeight, setVectorWeight] = useState(50);
  const [showWeightInfo, setShowWeightInfo] = useState(false);
  
  // Metadata filters
  const [projectFilter, setProjectFilter] = useState('');
  const [epicFilter, setEpicFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dynamic filter options
  const [filterOptions, setFilterOptions] = useState({
    projects: [],
    epics: [],
    priorities: [],
    statuses: []
  });
  
  const { enqueueSnackbar } = useSnackbar();

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/metadata/distinct`);
      if (response.data.success && response.data.metadata) {
        setFilterOptions(response.data.metadata);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  }, []);

  React.useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  const handleWeightChange = (type, value) => {
    if (type === 'bm25') {
      setBm25Weight(value);
      setVectorWeight(100 - value);
    } else {
      setVectorWeight(value);
      setBm25Weight(100 - value);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      enqueueSnackbar('Please enter a search query', { variant: 'warning' });
      return;
    }

    setSearching(true);
    setError(null);
    setResults([]);
    setSearchInfo(null);

    try {
      const filters = {};
      if (projectFilter) filters.project = projectFilter;
      if (epicFilter) filters.epic = epicFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (statusFilter) filters.status = statusFilter;

      const response = await axios.post(`${API_BASE}/api/search/hybrid`, {
        query,
        limit,
        filters,
        bm25Weight: bm25Weight / 100,
        vectorWeight: vectorWeight / 100
      });

      if (response.data.success) {
        setResults(response.data.results);
        setSearchInfo({
          count: response.data.count,
          timing: response.data.timing,
          stats: response.data.stats,
          query: response.data.query,
          filters: response.data.filters,
          weights: response.data.weights
        });
        
        enqueueSnackbar(
          `Found ${response.data.count} results (${response.data.stats.foundInBoth} in both indexes) in ${response.data.timing.totalTime}ms`, 
          { variant: 'success' }
        );
      } else {
        throw new Error(response.data.error || 'Search failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Search failed';
      setError(errorMessage);
      enqueueSnackbar(`Search failed: ${errorMessage}`, { variant: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const formatScore = (score) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'info';
    if (score >= 0.4) return 'warning';
    return 'error';
  };

  const getFoundInColor = (foundIn) => {
    if (foundIn === 'both') return 'success';
    if (foundIn === 'bm25') return 'primary';
    return 'secondary';
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', padding: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoFixHighIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Hybrid Search (BM25 + Vector)
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Combines BM25 keyword matching with semantic vector search for best results. Adjust weights to control the balance.
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Search Query"
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !searching && handleSearch()}
              placeholder="e.g., user registration, account creation..."
              disabled={searching}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Results Limit"
              type="number"
              variant="outlined"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
              disabled={searching}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ height: '56px' }}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
        </Grid>

        {/* Weight Controls */}
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2">Search Weights</Typography>
            <Tooltip title="Adjust the balance between keyword (BM25) and semantic (Vector) search">
              <IconButton size="small" onClick={() => setShowWeightInfo(!showWeightInfo)}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                BM25 Weight: {bm25Weight}%
              </Typography>
              <Slider
                value={bm25Weight}
                onChange={(e, value) => handleWeightChange('bm25', value)}
                min={0}
                max={100}
                step={5}
                disabled={searching}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Vector Weight: {vectorWeight}%
              </Typography>
              <Slider
                value={vectorWeight}
                onChange={(e, value) => handleWeightChange('vector', value)}
                min={0}
                max={100}
                step={5}
                disabled={searching}
              />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" onClick={() => { setBm25Weight(50); setVectorWeight(50); }}>
              Balanced
            </Button>
            <Button size="small" onClick={() => { setBm25Weight(70); setVectorWeight(30); }}>
              Keyword Heavy
            </Button>
            <Button size="small" onClick={() => { setBm25Weight(30); setVectorWeight(70); }}>
              Semantic Heavy
            </Button>
          </Box>
        </Box>

        {/* Filters Section */}
        <Box sx={{ mt: 2 }}>
          <Button
            startIcon={<FilterListIcon />}
            endIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowFilters(!showFilters)}
            variant="outlined"
            size="small"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>

          <Collapse in={showFilters}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    label="Project"
                  >
                    <MenuItem value="">All Projects</MenuItem>
                    {(filterOptions.projects || []).map((project) => (
                      <MenuItem key={project} value={project}>{project}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Epic</InputLabel>
                  <Select
                    value={epicFilter}
                    onChange={(e) => setEpicFilter(e.target.value)}
                    label="Epic"
                  >
                    <MenuItem value="">All Epics</MenuItem>
                    {(filterOptions.epics || []).map((epic) => (
                      <MenuItem key={epic} value={epic}>{epic}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    label="Priority"
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    {(filterOptions.priorities || []).map((priority) => (
                      <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    {(filterOptions.statuses || []).map((status) => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Collapse>
        </Box>
      </Paper>

      {searchInfo && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Hybrid Search Results:</strong> Found {searchInfo.count} user stories in {searchInfo.timing.totalTime}ms
            <br />
            BM25: {searchInfo.timing.bm25Time}ms ({searchInfo.stats.bm25ResultCount} results) | 
            Vector: {searchInfo.timing.vectorTime}ms ({searchInfo.stats.vectorResultCount} results) |
            Found in both: {searchInfo.stats.foundInBoth}
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {results.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <ArticleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Search Results ({results.length})
          </Typography>

          {results.map((result, index) => (
            <Card key={result._id || index} sx={{ mb: 2 }} elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip label={`#${index + 1}`} size="small" color="primary" variant="outlined" />
                      <Typography variant="h6" component="div">
                        {result.key || result.storyId || 'No Key'}
                      </Typography>
                      {result.hybridScore && (
                        <Chip 
                          label={`Score: ${formatScore(result.hybridScore)}`}
                          color={getScoreColor(result.hybridScore)} 
                          size="small"
                        />
                      )}
                      {result.foundIn && (
                        <Chip 
                          label={result.foundIn}
                          color={getFoundInColor(result.foundIn)}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
                      {result.summary || 'No Summary'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {result.project && (
                        <Chip label={`Project: ${result.project}`} size="small" variant="outlined" />
                      )}
                      {result.epic && (
                        <Chip label={`Epic: ${result.epic}`} size="small" variant="outlined" />
                      )}
                      {result.priority && (
                        <Chip 
                          label={result.priority} 
                          size="small" 
                          color={result.priority === 'High' ? 'error' : result.priority === 'Medium' ? 'warning' : 'default'}
                        />
                      )}
                      {result.status && (
                        <Chip 
                          label={`Status: ${result.status}`} 
                          size="small" 
                          color={result.status === 'Done' ? 'success' : result.status === 'In Progress' ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {result.description && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Description:</strong> {result.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {!searching && results.length === 0 && searchInfo && (
        <Alert severity="info">
          No user stories found matching your search query.
        </Alert>
      )}
    </Box>
  );
}

export default HybridSearch;

