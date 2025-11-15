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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SpeedIcon from '@mui/icons-material/Speed';
import ArticleIcon from '@mui/icons-material/Article';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE = 'http://localhost:8787';

function BM25Search() {
  const [query, setQuery] = useState('As a user, I want to create an account');
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchInfo, setSearchInfo] = useState(null);
  const [error, setError] = useState(null);
  
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

      const response = await axios.post(`${API_BASE}/api/search/bm25`, {
        query,
        limit,
        filters
      });

      if (response.data.success) {
        setResults(response.data.results);
        setSearchInfo({
          count: response.data.count,
          searchTime: response.data.searchTime,
          query: response.data.query,
          filters: response.data.filters,
          searchType: response.data.searchType
        });
        
        enqueueSnackbar(`Found ${response.data.count} results in ${response.data.searchTime}ms`, { 
          variant: 'success' 
        });
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
    return score ? score.toFixed(2) : '0.00';
  };

  const getScoreColor = (score) => {
    if (score >= 50) return 'success';
    if (score >= 30) return 'info';
    if (score >= 15) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', padding: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SearchIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            BM25 Keyword Search
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Fast keyword-based search using BM25 algorithm. Best for exact matches, IDs, and specific terms.
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
              placeholder="e.g., user registration, account creation, login..."
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
              inputProps={{ min: 1, max: 50 }}
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
        <Alert severity="info" icon={<SpeedIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>BM25 Search Results:</strong> Found {searchInfo.count} user stories in {searchInfo.searchTime}ms
            {Object.keys(searchInfo.filters || {}).length > 0 && (
              <span> (with filters applied)</span>
            )}
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
                      {result.score && (
                        <Chip 
                          label={`Score: ${formatScore(result.score)}`}
                          color={getScoreColor(result.score)} 
                          size="small"
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
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Description:</strong> {result.description}
                      </Typography>
                    )}

                    {result.text && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Text:</strong> {result.text}
                      </Typography>
                    )}

                    {result.acceptanceCriteria && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Acceptance Criteria:</strong> {result.acceptanceCriteria}
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
          No user stories found matching your search query. Try adjusting your search terms or filters.
        </Alert>
      )}
    </Box>
  );
}

export default BM25Search;

