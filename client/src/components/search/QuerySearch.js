import React, { useState, useCallback } from 'react';
import {
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid,
  Fade
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Score as ScoreIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE = 'http://localhost:8787';

function QuerySearch() {
  const [query, setQuery] = useState('As a user, I want to create an account so that I can access the system');
  const [limit, setLimit] = useState(6);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [rewrittenStory, setRewrittenStory] = useState(null);
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

  // Fetch distinct metadata values for filters
  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/metadata/distinct`);
      if (response.data.success && response.data.metadata) {
        setFilterOptions(response.data.metadata);
        
        const totalOptions = 
          (response.data.metadata.projects?.length || 0) +
          (response.data.metadata.epics?.length || 0) +
          (response.data.metadata.priorities?.length || 0) +
          (response.data.metadata.statuses?.length || 0);
          
        if (totalOptions === 0) {
          enqueueSnackbar('No metadata found. Please ingest user stories first.', { 
            variant: 'warning',
            autoHideDuration: 5000
          });
        }
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
      enqueueSnackbar('Failed to load filter options.', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

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
    setRewrittenStory(null);
    setSearchInfo(null);

    try {
      // Use the /search/stories endpoint which does vector search + rewrite
      const response = await axios.post(`${API_BASE}/search/stories`, {
        newUserStory: query.trim(),
        topK: parseInt(limit)
      });

      // Extract related stories and rewritten story
      const relatedStories = response.data.relatedStories || [];
      
      // Apply filters client-side (since /search/stories doesn't support filters yet)
      let filteredStories = relatedStories;
      if (projectFilter || epicFilter || priorityFilter || statusFilter) {
        filteredStories = relatedStories.filter(story => {
          if (projectFilter && story.project !== projectFilter) return false;
          if (epicFilter && story.epic !== epicFilter) return false;
          if (priorityFilter && story.priority !== priorityFilter) return false;
          if (statusFilter && story.status !== statusFilter) return false;
          return true;
        });
      }

      setResults(filteredStories);
      setRewrittenStory(response.data.rewrittenStory);
      setSearchInfo({
        query: response.data.searchQuery,
        qualityScore: response.data.qualityScore,
        resultCount: filteredStories.length,
        duration: response.data.duration
      });

      enqueueSnackbar(`Found ${filteredStories.length} related stories`, { variant: 'success' });
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Search failed';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !searching && event.ctrlKey) {
      handleSearch();
    }
  };

  const formatScore = (score) => {
    return parseFloat(score).toFixed(4);
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'primary';
    if (score >= 0.4) return 'warning';
    return 'default';
  };

  const columns = [
    {
      field: 'key',
      headerName: 'User Story',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {params.value || params.row.storyId || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.project || 'No project'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'score',
      headerName: 'Similarity',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={`${(params.value * 100).toFixed(1)}%`}
          color={getScoreColor(params.value)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'summary',
      headerName: 'Summary',
      flex: 2,
      minWidth: 300,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {params.value || params.row.description || 'No summary'}
          {(params.value || params.row.description)?.length > 100 && '...'}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SearchIcon color="primary" sx={{ fontSize: '2rem' }} />
          Vector Search
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search through your user stories using semantic similarity with AI embeddings.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Search Panel */}
        <Grid item xs={12} lg={8}>
          <Card elevation={3}>
            <CardHeader
              title="Search Query"
              subheader="Enter your user story and find similar stories"
              avatar={<SearchIcon color="primary" />}
            />
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Enter your user story"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    variant="outlined"
                    placeholder="e.g., 'As a user, I want to create an account so that I can access the system'"
                    multiline
                    rows={3}
                    helperText="Use descriptive user story format (As a... I want... So that...)"
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        minWidth: '800px',
                        width: '100%'
                      } 
                    }}
                  />
                </Grid>

                {/* Metadata Filters Section */}
                <Grid item xs={12}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      bgcolor: showFilters ? 'primary.50' : 'grey.50',
                      border: showFilters ? '2px solid' : '1px solid',
                      borderColor: showFilters ? 'primary.main' : 'divider',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: showFilters ? 2 : 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FilterIcon color={showFilters ? 'primary' : 'action'} />
                          <Typography variant="subtitle1" fontWeight={600} color={showFilters ? 'primary' : 'text.secondary'}>
                            Advanced Metadata Filters
                          </Typography>
                          {(projectFilter || epicFilter || priorityFilter || statusFilter) && (
                            <Chip 
                              label="Active" 
                              size="small" 
                              color="primary" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                        <Button
                          variant={showFilters ? 'contained' : 'outlined'}
                          onClick={() => setShowFilters(!showFilters)}
                          size="small"
                          startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        >
                          {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </Button>
                      </Box>

                      {showFilters && (
                        <Fade in={showFilters}>
                          <Box>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Project</InputLabel>
                                  <Select
                                    value={projectFilter}
                                    label="Project"
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                    sx={{ bgcolor: 'background.paper' }}
                                  >
                                    <MenuItem value=""><em>All Projects</em></MenuItem>
                                    {filterOptions.projects?.map((project) => (
                                      <MenuItem key={project} value={project}>
                                        {project}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Epic</InputLabel>
                                  <Select
                                    value={epicFilter}
                                    label="Epic"
                                    onChange={(e) => setEpicFilter(e.target.value)}
                                    sx={{ bgcolor: 'background.paper' }}
                                  >
                                    <MenuItem value=""><em>All Epics</em></MenuItem>
                                    {filterOptions.epics?.map((epic) => (
                                      <MenuItem key={epic} value={epic}>
                                        {epic}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Priority</InputLabel>
                                  <Select
                                    value={priorityFilter}
                                    label="Priority"
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    sx={{ bgcolor: 'background.paper' }}
                                  >
                                    <MenuItem value=""><em>All Priorities</em></MenuItem>
                                    {filterOptions.priorities?.map((priority) => (
                                      <MenuItem key={priority} value={priority}>
                                        <Chip 
                                          label={priority} 
                                          color={priority === 'High' ? 'error' : priority === 'Medium' ? 'warning' : 'default'} 
                                          size="small" 
                                          sx={{ mr: 1 }} 
                                        />
                                        {priority}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Status</InputLabel>
                                  <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    sx={{ bgcolor: 'background.paper' }}
                                  >
                                    <MenuItem value=""><em>All Statuses</em></MenuItem>
                                    {filterOptions.statuses?.map((status) => (
                                      <MenuItem key={status} value={status}>
                                        {status}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>

                              {/* Active Filters Display */}
                              {(projectFilter || epicFilter || priorityFilter || statusFilter) && (
                                <Grid item xs={12}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                      Active Filters:
                                    </Typography>
                                    {projectFilter && (
                                      <Chip
                                        label={`Project: ${projectFilter}`}
                                        onDelete={() => setProjectFilter('')}
                                        color="primary"
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                    {epicFilter && (
                                      <Chip
                                        label={`Epic: ${epicFilter}`}
                                        onDelete={() => setEpicFilter('')}
                                        color="primary"
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                    {priorityFilter && (
                                      <Chip
                                        label={`Priority: ${priorityFilter}`}
                                        onDelete={() => setPriorityFilter('')}
                                        color={priorityFilter === 'High' ? 'error' : priorityFilter === 'Medium' ? 'warning' : 'default'}
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                    {statusFilter && (
                                      <Chip
                                        label={`Status: ${statusFilter}`}
                                        onDelete={() => setStatusFilter('')}
                                        color="secondary"
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                    <Button
                                      size="small"
                                      onClick={() => {
                                        setProjectFilter('');
                                        setEpicFilter('');
                                        setPriorityFilter('');
                                        setStatusFilter('');
                                      }}
                                      color="error"
                                      sx={{ ml: 'auto' }}
                                    >
                                      Clear All
                                    </Button>
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        </Fade>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Results Limit</InputLabel>
                    <Select
                      value={limit}
                      label="Results Limit"
                      onChange={(e) => setLimit(e.target.value)}
                    >
                      <MenuItem value={3}>3 Results</MenuItem>
                      <MenuItem value={5}>5 Results</MenuItem>
                      <MenuItem value={6}>6 Results</MenuItem>
                      <MenuItem value={10}>10 Results</MenuItem>
                      <MenuItem value={20}>20 Results</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
                    onClick={handleSearch}
                    disabled={searching || !query.trim()}
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {searchInfo && (
                <Fade in={true}>
                  <Box sx={{ mt: 2 }}>
                    <Alert 
                      severity={searchInfo.resultCount > 0 ? "success" : "warning"}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            Search Query:
                          </Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', flexGrow: 1 }}>
                            "{searchInfo.query}"
                          </Typography>
                          <Chip 
                            label={`${searchInfo.resultCount} results`} 
                            size="small" 
                            color={searchInfo.resultCount > 0 ? "success" : "default"}
                            sx={{ fontWeight: 600 }}
                          />
                          {searchInfo.qualityScore && (
                            <Chip 
                              label={`Quality: ${searchInfo.qualityScore}%`} 
                              size="small" 
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </Alert>
                  </Box>
                </Fade>
              )}

              {rewrittenStory && (
                <Fade in={true}>
                  <Card variant="outlined" sx={{ mt: 2, bgcolor: 'primary.50' }}>
                    <CardHeader
                      title="Rewritten User Story"
                      subheader="AI-enhanced version of your input story"
                    />
                    <CardContent>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {rewrittenStory}
                      </Typography>
                    </CardContent>
                  </Card>
                </Fade>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Results Section */}
      {results.length > 0 && (
        <Fade in={true}>
          <Card elevation={3} sx={{ mt: 3 }}>
            <CardHeader
              title="Related User Stories"
              subheader={`${results.length} stories ranked by semantic similarity`}
            />
            <CardContent>
              <Box sx={{ height: 400, width: '100%', mb: 3 }}>
                <DataGrid
                  rows={results}
                  columns={columns}
                  getRowId={(row) => row.key || row.storyId || Math.random()}
                  density="comfortable"
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{
                    pagination: {
                      paginationModel: { page: 0, pageSize: 10 },
                    },
                  }}
                />
              </Box>

              {/* Detailed Results */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Detailed View
              </Typography>
              <Box sx={{ mt: 2 }}>
                {results.slice(0, 5).map((result, index) => (
                  <Accordion key={result.key || index} elevation={2} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                          {result.key || result.storyId || 'N/A'}
                        </Typography>
                        <Chip
                          label={`Score: ${formatScore(result.score)}`}
                          color={getScoreColor(result.score)}
                          size="small"
                          icon={<ScoreIcon />}
                        />
                        {result.project && (
                          <Chip
                            label={result.project}
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <DescriptionIcon sx={{ mr: 1 }} />
                                <Typography variant="subtitle1" fontWeight="bold">
                                  Summary
                                </Typography>
                              </Box>
                              <Typography variant="body2">
                                {result.summary || 'No summary available'}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AssignmentIcon sx={{ mr: 1 }} />
                                <Typography variant="subtitle1" fontWeight="bold">
                                  Description
                                </Typography>
                              </Box>
                              <Typography variant="body2">
                                {result.description || result.text || 'No description available'}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>

                        {result.acceptanceCriteria && (
                          <Grid item xs={12}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                  Acceptance Criteria
                                </Typography>
                                <Typography variant="body2">
                                  {result.acceptanceCriteria}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        )}

                        <Grid item xs={12}>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Story Key:</strong> {result.key || result.storyId || 'N/A'}
                            </Typography>
                            {result.project && (
                              <Chip label={`Project: ${result.project}`} size="small" color="primary" variant="outlined" />
                            )}
                            {result.epic && (
                              <Chip label={`Epic: ${result.epic}`} size="small" color="secondary" variant="outlined" />
                            )}
                            {result.priority && (
                              <Chip 
                                label={`Priority: ${result.priority}`} 
                                size="small" 
                                color={result.priority === 'High' ? 'error' : result.priority === 'Medium' ? 'warning' : 'default'}
                              />
                            )}
                            {result.status && (
                              <Chip 
                                label={`Status: ${result.status}`} 
                                size="small" 
                                color={result.status === 'Done' ? 'success' : result.status === 'In Progress' ? 'warning' : 'default'}
                              />
                            )}
                            <Chip
                              label={`Similarity: ${(result.score * 100).toFixed(1)}%`}
                              size="small"
                              color={getScoreColor(result.score)}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Fade>
      )}

      {results.length === 0 && searchInfo && (
        <Fade in={true}>
          <Card elevation={1} sx={{ mt: 3, textAlign: 'center', p: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No results found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search query or check if there are user stories ingested in the database.
            </Typography>
          </Card>
        </Fade>
      )}
    </Box>
  );
}

export default QuerySearch;

